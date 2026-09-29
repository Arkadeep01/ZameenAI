"""
Regression tests for the IndicBART `token_type_ids` failure (M03).

Background: depending on the transformers/tokenizer build, the IndicBART
tokenizer may emit `token_type_ids` (AlbertTokenizerFast does; the slow
AlbertTokenizer does not). `MBartForConditionalGeneration.generate()`
rejects unknown `model_kwargs`, so splatting raw tokenizer output into
`generate(**inputs)` raised::

    ValueError: The following `model_kwargs` are not used by the model:
    ['token_type_ids'] ...

which `normalize_phrases` swallowed into "IndicBART normalization failed"
and Phase 07 reported as `indicbart = ERROR`.

These tests prove that tokenizer output containing `token_type_ids` no
longer breaks IndicBART generation. The heavy test below uses the REAL
cached `ai4bharat/IndicBART` model -- nothing is mocked or faked.
"""

import os
from pathlib import Path
from unittest.mock import patch

import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.extraction.llm import IndicBARTNormalizer, _indicbart_supported_input_keys


class _StubEncoder:
    def forward(self, input_ids, attention_mask, output_attentions=None):
        raise NotImplementedError


class _StubSeq2SeqModel:
    """Minimal stand-in exposing the same forward signatures as MBart."""

    base_model_prefix = "model"

    def __init__(self):
        self.encoder = _StubEncoder()

    def forward(self, input_ids, attention_mask, decoder_input_ids=None):
        raise NotImplementedError


class TestSupportedInputKeys:
    """The generate() boundary filter keeps supported keys, drops the rest."""

    def test_token_type_ids_excluded(self):
        supported = _indicbart_supported_input_keys(_StubSeq2SeqModel())
        assert "token_type_ids" not in supported

    def test_input_ids_and_attention_mask_preserved(self):
        supported = _indicbart_supported_input_keys(_StubSeq2SeqModel())
        assert "input_ids" in supported
        assert "attention_mask" in supported

    def test_filtering_applied_to_tokenizer_style_dict(self):
        supported = _indicbart_supported_input_keys(_StubSeq2SeqModel())
        raw = {
            "input_ids": object(),
            "attention_mask": object(),
            "token_type_ids": object(),
        }
        filtered = {k: v for k, v in raw.items() if k in supported}
        assert set(filtered) == {"input_ids", "attention_mask"}


@pytest.mark.skipif(
    os.getenv("ZAMEENAI_PHASE07_DISABLE_INDICBART", "0") == "1"
    and os.getenv("ZAMEENAI_PHASE07_FORCE_REAL_INDICBART_TEST", "0") != "1",
    reason="IndicBART disabled for this session and real-model test not forced",
)
class TestRealIndicBARTGenerationWithTokenTypeIds:
    """End-to-end proof with the real cached IndicBART model.

    Tokenizes with the real tokenizer, deliberately injects `token_type_ids`
    (as AlbertTokenizerFast emits), applies the production boundary filter,
    and runs real `generate()`. Fails honestly if the cached model cannot
    be loaded -- success is never faked.
    """

    def test_real_generate_survives_token_type_ids(self):
        with patch.dict(
            os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "0"}, clear=False
        ):
            normalizer = IndicBARTNormalizer()
            assert normalizer.available(), "cached IndicBART model could not be loaded"

            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
            phrases = ["Record of Rights", "Mouza"]
            raw = normalizer._tokenizer(
                phrases,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128,
            )
            # Simulate a fast-tokenizer output that carries token_type_ids.
            raw["token_type_ids"] = torch.zeros_like(raw["input_ids"])
            assert "token_type_ids" in raw

            supported = _indicbart_supported_input_keys(normalizer._model)
            assert "token_type_ids" not in supported
            filtered = {
                k: v.to(device) for k, v in raw.items() if k in supported
            }
            assert set(filtered) >= {"input_ids", "attention_mask"}

            normalizer._model.to(device)
            with torch.no_grad():
                generated = normalizer._model.generate(
                    **filtered,
                    max_length=48,
                    num_beams=2,
                    do_sample=False,
                    early_stopping=True,
                )
            assert generated.shape[0] == len(phrases)
            decoded = [
                normalizer._tokenizer.decode(g, skip_special_tokens=True)
                for g in generated
            ]
            assert all(isinstance(d, str) for d in decoded)

    def test_real_normalize_phrases_returns_result(self):
        with patch.dict(
            os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "0"}, clear=False
        ):
            normalizer = IndicBARTNormalizer()
            assert normalizer.available(), "cached IndicBART model could not be loaded"
            result = normalizer.normalize_phrases(["Record of Rights", "Mouza"])
            assert isinstance(result, dict)
            assert len(result) > 0
