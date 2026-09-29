"""Tests for Provider-Neutral LLM Abstraction and Boundaries."""

import pytest
from backend.app.core.llm import (
    LLMMessage,
    LLMResponse,
    MockLLMProvider,
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


def test_provider_factory():
    provider = get_llm_provider()
    assert isinstance(provider, MockLLMProvider)


@pytest.mark.asyncio
async def test_mock_llm_provider_async():
    provider = MockLLMProvider()
    messages = [LLMMessage(role="user", content="Analyze context")]
    resp = await provider.generate_async(messages)
    assert resp.provider_name == "mock"
    assert resp.completion_tokens > 0
