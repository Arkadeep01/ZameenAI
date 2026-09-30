"""
Pytest fixtures for ZameenAI tests
"""

import os
import pytest
import sys
from pathlib import Path

os.environ.setdefault("ZAMEENAI_PHASE07_DISABLE_INDICBART", "1")
# DEBUG now defaults to False (fail closed) so a real deployment cannot silently
# boot with the dev identity store. Tests run the seeded dev identities, so
# they opt in explicitly rather than relying on the permissive default.
os.environ.setdefault("DEBUG", "true")
# Dev seed identities have no hardcoded password (see app/core/security.py).
# Tests supply a throwaway credential through the environment instead.
os.environ.setdefault("DEV_USERS_PASSWORD", "test-only-dev-credential")
# A development key is generated when DEBUG is on, but pin one so tokens
# survive reloads and the suite is independent of the developer .env file.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-not-used-in-production-000")
# Keep the suite deterministic regardless of the developer machine's .env:
# without this, LLM_PROVIDER=ollama from .env would make tests hit the real
# local Ollama server. Tests that need a provider set it explicitly via
# monkeypatch/patch.dict. An explicitly exported LLM_PROVIDER is respected.
os.environ.setdefault("LLM_PROVIDER", "mistral")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.flask_api_reference import app as flask_app


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client
