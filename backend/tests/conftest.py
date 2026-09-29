"""
Pytest fixtures for ZameenAI tests
"""

import os
import pytest
import sys
from pathlib import Path

os.environ.setdefault("ZAMEENAI_PHASE07_DISABLE_INDICBART", "1")
# Keep the suite deterministic regardless of the developer machine's .env:
# without this, LLM_PROVIDER=ollama from .env would make tests hit the real
# local Ollama server. Tests that need a provider set it explicitly via
# monkeypatch/patch.dict. An explicitly exported LLM_PROVIDER is respected.
os.environ.setdefault("LLM_PROVIDER", "mistral")

sys.path.insert(0, str(Path(__file__).parent.parent))

import app.ocr
if "src" not in sys.modules:
    sys.modules["src"] = app.ocr

from app.ocr.flask_api_reference import app as flask_app


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client
