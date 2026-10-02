"""Tests for Provider-Neutral LLM Abstraction and Boundaries."""

import pytest
from unittest.mock import patch
from backend.app.core.config import settings
from backend.app.core.llm import (
    LLMMessage,
    LLMResponse,
    MockLLMProvider,
    GeminiProvider,
    get_llm_provider,
)


def test_mock_llm_provider():
    provider = MockLLMProvider()
    messages = [
        LLMMessage(role="system", content="You are a specialist planning agent."),
        LLMMessage(role="user", content="Draft an investigation plan for customer discount cessation."),
    ]
    resp = provider.generate(messages)
    assert isinstance(resp, LLMResponse)
    assert resp.provider_name == "mock"
    assert "Real numerical results originate from deterministic code execution" in resp.content
    assert resp.prompt_tokens > 0


@pytest.mark.asyncio
async def test_mock_llm_provider_async():
    provider = MockLLMProvider()
    messages = [LLMMessage(role="user", content="Analyze context")]
    resp = await provider.generate_async(messages)
    assert resp.provider_name == "mock"
    assert resp.completion_tokens > 0


def test_provider_factory_mock():
    with patch.object(settings, "LLM_PROVIDER", "mock"):
        provider = get_llm_provider()
        assert isinstance(provider, MockLLMProvider)


def test_provider_factory_unknown_fails_fast():
    with patch.object(settings, "LLM_PROVIDER", "unknown_provider_xyz"):
        with pytest.raises(ValueError, match="Unsupported LLM provider"):
            get_llm_provider()


def test_gemini_provider_missing_key_fails():
    with patch.object(settings, "LLM_API_KEY", ""):
        with pytest.raises(ValueError, match="Gemini API key is required"):
            GeminiProvider(api_key="")


def test_gemini_provider_payload_preparation():
    provider = GeminiProvider(api_key="test-api-key-safe", model_name="gemini-3.8-flash")
    messages = [
        LLMMessage(role="system", content="System instruction."),
        LLMMessage(role="user", content="User prompt."),
        LLMMessage(role="assistant", content="Assistant reply."),
    ]
    contents, config = provider._prepare_payload(messages, temperature=0.2, max_tokens=1024)
    assert config.system_instruction == "System instruction."
    assert config.temperature == 0.2
    assert config.max_output_tokens == 1024
    assert len(contents) == 2
    assert contents[0].role == "user"
    assert contents[1].role == "model"


def test_provider_factory_gemini():
    with patch.object(settings, "LLM_PROVIDER", "gemini"), patch.object(settings, "LLM_API_KEY", "test-key-mock"):
        provider = get_llm_provider()
        assert isinstance(provider, GeminiProvider)
        assert provider.model_name == settings.LLM_MODEL

