"""
Phase 06 Surya local (non-Docker) provider tests.

- Unavailable paths stay fast, hermetic, and never break Phase 06.
- Mapping unit tests use canned runner payloads (no server).
- Docker independence is asserted on the implementation itself.
- The live test runs genuine Surya-2 inference (llamacpp backend) on the
  repo's real sample; it skips when the local backend is not provisioned.
"""

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.core.surya_config import SURYA_LABEL_TO_REGION, check_surya_local, is_surya_local_enabled, resolve_llama_server
from app.ocr.core.surya_adapter import map_blocks_to_regions, run_surya_local

SAMPLE = (
    Path(__file__).parent.parent
    / "uploads"
    / "samples"
    / "test sample english enhanced.png"
)


def _clear_surya_env(monkeypatch):
    for var in (
        "ZAMEENAI_SURYA_LOCAL",
        "ZAMEENAI_LLAMA_SERVER",
        "ZAMEENAI_SURYA_PYTHON",
        "ZAMEENAI_SURYA_TIMEOUT",
        "LLAMA_CPP_BINARY",
        "SURYA_INFERENCE_URL",
    ):
        monkeypatch.delenv(var, raising=False)


class TestSuryaLocalDisabled:
    """Test A — Surya unavailable must not break Phase 06."""

    def test_disabled_by_default(self, monkeypatch):
        _clear_surya_env(monkeypatch)
        assert is_surya_local_enabled() is False
        probe = check_surya_local()
        assert probe["available"] is False
        assert probe["reason"] == "disabled"

    def test_run_short_circuits_without_subprocess(self, monkeypatch):
        _clear_surya_env(monkeypatch)
        with patch(
            "app.ocr.core.surya_adapter.subprocess.run",
            side_effect=AssertionError("must not spawn when disabled"),
        ):
            out = run_surya_local(str(SAMPLE))
        assert out["status"] == "UNAVAILABLE"
        assert out["reason"] == "disabled"

    def test_missing_binary_is_honest(self, monkeypatch):
        _clear_surya_env(monkeypatch)
        monkeypatch.setenv("ZAMEENAI_SURYA_LOCAL", "1")
        monkeypatch.setenv(
            "ZAMEENAI_LLAMA_SERVER", str(Path("definitely-not-here-llama-server.exe"))
        )
        monkeypatch.setattr(
            "app.ocr.core.surya_config._DEFAULT_LLAMA_SERVER",
            Path("definitely-not-here-dir/llama-server.exe"),
        )
        assert resolve_llama_server() is None
        with patch(
            "app.ocr.core.surya_adapter.subprocess.run",
            side_effect=AssertionError("must not spawn without binary"),
        ):
            out = run_surya_local(str(SAMPLE))
        assert out["status"] == "UNAVAILABLE"
        assert out["reason"] == "llama_server_not_found"

    def test_invalid_image_is_honest(self, monkeypatch):
        _clear_surya_env(monkeypatch)
        monkeypatch.setenv("ZAMEENAI_SURYA_LOCAL", "1")
        out = run_surya_local(str(Path("definitely-not-here.png")))
        assert out["status"] == "UNAVAILABLE"
        assert out["reason"] in ("invalid_image", "llama_server_not_found", "disabled")

    def test_phase06_succeeds_without_local_surya(self, monkeypatch, tmp_path):
        """Tesseract primary path untouched when the provider is off."""
        _clear_surya_env(monkeypatch)
        from PIL import Image, ImageDraw

        from app.ocr.recognition.service import OCRService
        from app.ocr.recognition.models import OCRStatus

        img = tmp_path / "tess_only.png"
        canvas = Image.new("RGB", (700, 300), color=(255, 255, 255))
        ImageDraw.Draw(canvas).text((40, 120), "Surya local off", fill=(10, 10, 10))
        canvas.save(img)
        result = OCRService(storage_dir=tmp_path / "phase_06").perform_ocr(
            record_id="LR-T06-SL1",
            document_id="DOC-T06-SL1",
            ingestion_id="ING-T06-SL1",
            language="eng",
            input_paths=[str(img)],
            run_layout=True,
            run_artifacts=False,
        )
        assert result.engines["surya"] == "UNAVAILABLE"
        assert result.surya["status"] == "UNAVAILABLE"
        assert result.status in (OCRStatus.SUCCESS, OCRStatus.PARTIAL_SUCCESS)


class TestBlockMapping:
    """Test B (unit) — Surya blocks map to regions/candidates honestly."""

    def test_pictures_and_empty_blocks_skipped(self):
        blocks = [
            {"label": "Picture", "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
             "reading_order": 0, "confidence": 0.9, "text": ""},
            {"label": "Text", "polygon": [[0, 20], [100, 20], [100, 40], [0, 40]],
             "reading_order": 1, "confidence": 0.8, "text": "<p>Hello</p>"},
            {"label": "Table", "polygon": [[0, 50], [200, 50], [200, 150], [0, 150]],
             "reading_order": 2, "confidence": 0.7, "text": "<table></table>"},
        ]
        regions = map_blocks_to_regions(blocks, 400, 300)
        assert [(r["type"], r["bbox"]) for r in regions] == [
            ("METADATA", [0, 20, 100, 40]),
            ("MAIN_TABLE", [0, 50, 200, 150]),
        ]
        assert SURYA_LABEL_TO_REGION["SectionHeader"] == "HEADER"

    def test_malformed_polygons_ignored(self):
        blocks = [{"label": "Text", "polygon": [], "reading_order": 0,
                   "confidence": 0.5, "text": "<p>x</p>"}]
        assert map_blocks_to_regions(blocks, 400, 300) == []


class TestDockerIndependence:
    """Test C — the provider must never invoke Docker/VLLM."""

    def test_source_avoids_docker_backend(self):
        """No Docker/VLLM invocation construct may exist in executable code.

        (Docstring prose may name the avoided path; what matters is that no
        statement can construct or launch it.)
        """
        src_dir = Path(__file__).parent.parent / "app" / "ocr" / "core"
        src = "".join(
            (src_dir / name).read_text(encoding="utf-8")
            for name in ("surya_adapter.py", "surya_runner.py", "surya_config.py")
        )
        assert "VllmBackend" not in src
        assert "vllm-openai" not in src
        assert "dockerDesktopLinuxEngine" not in src
        assert '["docker"' not in src and "['docker'" not in src
        assert '"docker", ' not in src and "'docker', " not in src
        assert "docker_client" not in src.lower()
        assert "DockerClient" not in src
        # The vLLM backend can never be selected: only the refusal guard may
        # name it (as a string comparison that rejects it).
        assert 'method="vllm"' not in src and "method='vllm'" not in src
        assert 'method="llamacpp"' in src

    def test_runner_env_forces_llamacpp(self, monkeypatch):
        """Even a hostile outer env cannot route the runner to vLLM/Docker."""
        import sys as _sys

        _clear_surya_env(monkeypatch)
        monkeypatch.setenv("ZAMEENAI_SURYA_LOCAL", "1")
        # Provision a dummy local backend so the probe succeeds and the test
        # exercises the hostile-env override (not the missing-binary guard).
        monkeypatch.setenv("ZAMEENAI_LLAMA_SERVER", _sys.executable)
        monkeypatch.setenv("ZAMEENAI_SURYA_PYTHON", _sys.executable)
        monkeypatch.setenv("SURYA_INFERENCE_BACKEND", "vllm")
        monkeypatch.setenv("SURYA_INFERENCE_URL", "http://evil:8000/v1")

        captured = {}

        class _Proc:
            returncode = 0
            stdout = json.dumps({"status": "SUCCESS", "backend": "llamacpp",
                                 "blocks": [], "test": True})
            stderr = ""

        def _fake_run(cmd, **kwargs):
            captured["cmd"] = cmd
            captured["env"] = kwargs.get("env", {})
            return _Proc()

        with patch("app.ocr.core.surya_adapter.subprocess.run", _fake_run):
            out = run_surya_local(str(SAMPLE))
        assert out["status"] == "SUCCESS"
        assert "docker" not in " ".join(captured["cmd"]).lower()
        assert captured["env"].get("SURYA_INFERENCE_BACKEND") == "llamacpp"
        assert "SURYA_INFERENCE_URL" not in captured["env"]


def _local_backend_provisioned() -> bool:
    import shutil

    binary = (
        os.getenv("ZAMEENAI_LLAMA_SERVER")
        or os.getenv("LLAMA_CPP_BINARY")
        or shutil.which("llama-server")
        or shutil.which("llama-server.exe")
        or str(
            Path(__file__).parent.parent
            / "tools"
            / "llama-server"
            / "pkg"
            / "llama-server.exe"
        )
    )
    if not binary or not Path(binary).is_file():
        return False
    try:
        from huggingface_hub import hf_hub_download

        hf_hub_download(repo_id="datalab-to/surya-ocr-2-gguf",
                        filename="surya-2.gguf", local_files_only=True)
        return True
    except Exception:
        return False


class TestSuryaLocalLive:
    """Test B (live) — genuine Surya-2 inference on the real sample."""

    def test_live_recognition_no_docker(self, monkeypatch):
        if not _local_backend_provisioned():
            pytest.skip("llama-server binary or GGUF cache not provisioned")
        if not SAMPLE.is_file():
            pytest.skip("real sample missing")
        monkeypatch.setenv("ZAMEENAI_SURYA_LOCAL", "1")
        for var in ("SURYA_INFERENCE_BACKEND", "SURYA_INFERENCE_URL"):
            monkeypatch.delenv(var, raising=False)

        out = run_surya_local(str(SAMPLE), timeout=600)
        assert out["status"] == "SUCCESS", out.get("reason", out)
        assert out["backend"] == "llamacpp"
        assert out["device"]["cuda_available"] is True
        assert len(out["blocks"]) > 0
        assert out["mean_confidence"] > 0
        assert "GOVERNMENT OF WEST BENGAL" in out["text"]
        assert "Nadia" in out["text"]


class TestPhase07Handoff:
    """Test E — Phase 06 output (with Surya slots) feeds Phase 07 unchanged."""

    def test_phase07_consumes_phase06_with_candidate_texts(self, monkeypatch, tmp_path):
        _clear_surya_env(monkeypatch)
        from PIL import Image

        from app.ocr.recognition.service import OCRService
        from app.ocr.extraction.pipeline import SemanticExtractionPipeline

        img = tmp_path / "handoff.png"
        Image.new("RGB", (700, 300), color=(255, 255, 255)).save(img)
        result = OCRService(storage_dir=tmp_path / "phase_06").perform_ocr(
            record_id="LR-T06-SL2",
            document_id="DOC-T06-SL2",
            ingestion_id="ING-T06-SL2",
            language="eng",
            input_paths=[str(img)],
            run_layout=True,
            run_artifacts=False,
        )
        payload = result.to_dict()
        assert "candidate_texts" in payload["pages"][0]
        assert "surya" in payload and "engines" in payload
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"},
                        clear=False):
            pipe = SemanticExtractionPipeline(payload, document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()
        assert info["models"]["mistral"] == "UNAVAILABLE"
