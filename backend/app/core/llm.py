"""TRACE Provider-Neutral LLM Abstraction.

Preserves the One-LLM architecture rule:
- Structured specialist roles over one model.
- The LLM reasons, plans, interprets, explains, and summarizes.
- The LLM may NEVER be the source of numerical truth.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.logging import logger


class LLMMessage(BaseModel):
    role: str = Field(..., description="system, user, or assistant")
    content: str = Field(..., description="Message text")
    name: Optional[str] = None


class LLMResponse(BaseModel):
    content: str = Field(..., description="Generated text content")
    provider_name: str
    model_name: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    raw_response: Dict[str, Any] = Field(default_factory=dict)


class LLMProvider(ABC):
    """Abstract base class for all TRACE LLM providers."""

    @abstractmethod
    def generate(self, messages: List[LLMMessage], temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> LLMResponse:
        """Synchronous text generation."""
        pass

    @abstractmethod
    async def generate_async(self, messages: List[LLMMessage], temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> LLMResponse:
        """Asynchronous text generation."""
        pass


class MockLLMProvider(LLMProvider):
    """Deterministic offline provider for testing and environments without external API keys."""

    def __init__(self, model_name: str = "mock-trace-v1"):
        self.model_name = model_name

    def generate(self, messages: List[LLMMessage], temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> LLMResponse:
        user_msg = next((m.content for m in reversed(messages) if m.role == "user"), "")
        logger.debug(f"MockLLMProvider processing message: {user_msg[:50]}...")
        mock_output = (
            f"[TRACE Offline Engine] Analyzed structured decision context. "
            f"Note: Real numerical results originate from deterministic code execution, not LLM."
        )
        return LLMResponse(
            content=mock_output,
            provider_name="mock",
            model_name=self.model_name,
            prompt_tokens=len(user_msg.split()),
            completion_tokens=len(mock_output.split()),
            raw_response={"status": "mock_success"},
        )

    async def generate_async(self, messages: List[LLMMessage], temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> LLMResponse:
        return self.generate(messages, temperature, max_tokens)


class OpenAILikeProvider(LLMProvider):
    """Adapter for OpenAI-compatible APIs (OpenAI, Groq, Ollama, vLLM)."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gpt-4o", base_url: Optional[str] = None):
        self.api_key = api_key or settings.LLM_API_KEY
        self.model_name = model_name
        self.base_url = base_url

    def generate(self, messages: List[LLMMessage], temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> LLMResponse:
        import httpx

        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        payload = {
            "model": self.model_name,
            "messages": [m.model_dump(exclude_none=True) for m in messages],
            "temperature": temperature if temperature is not None else settings.LLM_TEMPERATURE,
            "max_tokens": max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS,
        }
        url = f"{self.base_url or 'https://api.openai.com/v1'}/chat/completions"
        with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return LLMResponse(
                content=content,
                provider_name="openai_compatible",
                model_name=self.model_name,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                raw_response=data,
            )

    async def generate_async(self, messages: List[LLMMessage], temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> LLMResponse:
        import httpx

        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        payload = {
            "model": self.model_name,
            "messages": [m.model_dump(exclude_none=True) for m in messages],
            "temperature": temperature if temperature is not None else settings.LLM_TEMPERATURE,
            "max_tokens": max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS,
        }
        url = f"{self.base_url or 'https://api.openai.com/v1'}/chat/completions"
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return LLMResponse(
                content=content,
                provider_name="openai_compatible",
                model_name=self.model_name,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                raw_response=data,
            )


def get_llm_provider() -> LLMProvider:
    """Factory returning the configured provider instance."""
    provider_type = settings.LLM_PROVIDER.lower()
    if provider_type == "mock":
        return MockLLMProvider(model_name=settings.LLM_MODEL)
    elif provider_type in ("openai", "openai_compatible"):
        return OpenAILikeProvider(model_name=settings.LLM_MODEL)
    else:
        logger.warning(f"Unknown LLM provider '{provider_type}', falling back to MockLLMProvider")
        return MockLLMProvider(model_name=settings.LLM_MODEL)
