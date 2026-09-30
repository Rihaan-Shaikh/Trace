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


class GeminiProvider(LLMProvider):
    """Adapter for official Google Gemini API via official google-genai SDK.
    
    Adheres strictly to the TRACE architecture:
    - Provider-neutral LLM abstraction
    - API key read only from backend configuration
    - Clean exception handling without raw credential leakage
    - Numerical truth firewall: LLM reasons and structures evidence; deterministic code computes metrics.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.LLM_API_KEY
        if not self.api_key or not self.api_key.strip():
            raise ValueError(
                "Gemini API key is required when LLM_PROVIDER is 'gemini'. "
                "Please configure LLM_API_KEY in the backend environment."
            )
        self.model_name = model_name or settings.LLM_MODEL or "gemini-3.8-flash"
        # Transparently use responsive gemini-3.5-flash for deprecated/overloaded models
        if self.model_name in ("gemini-2.5-flash", "gemini-3.8-flash"):
            self.effective_model = "gemini-3.5-flash"
        else:
            self.effective_model = self.model_name

    def _prepare_payload(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        from google.genai import types

        system_parts = [m.content for m in messages if m.role == "system"]
        system_instruction = "\n\n".join(system_parts) if system_parts else None

        contents = []
        for msg in messages:
            if msg.role == "system":
                continue
            role = "model" if msg.role == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))

        if not contents:
            contents = [types.Content(role="user", parts=[types.Part.from_text(text="Proceed.")])]

        cfg_kwargs: Dict[str, Any] = {
            "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True),
            "thinking_config": types.ThinkingConfig(thinking_budget=0),
        }
        if system_instruction:
            cfg_kwargs["system_instruction"] = system_instruction
        if temperature is not None:
            cfg_kwargs["temperature"] = temperature
        elif settings.LLM_TEMPERATURE is not None:
            cfg_kwargs["temperature"] = settings.LLM_TEMPERATURE
        if max_tokens is not None:
            cfg_kwargs["max_output_tokens"] = max_tokens
        elif settings.LLM_MAX_TOKENS is not None:
            cfg_kwargs["max_output_tokens"] = settings.LLM_MAX_TOKENS

        config = types.GenerateContentConfig(**cfg_kwargs)
        return contents, config

    def _extract_response(self, response: Any) -> LLMResponse:
        content = ""
        try:
            if hasattr(response, "text") and response.text:
                content = response.text.strip()
        except Exception:
            content = ""

        if not content and getattr(response, "candidates", None):
            text_parts = []
            for cand in response.candidates:
                if cand.content and cand.content.parts:
                    for part in cand.content.parts:
                        txt = getattr(part, "text", None)
                        if txt and not getattr(part, "thought", False):
                            text_parts.append(txt)
            content = "".join(text_parts).strip()


        prompt_tokens = 0
        completion_tokens = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
            completion_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0

        raw_meta = {
            "status": "success",
            "provider": "gemini",
            "model": self.model_name,
            "effective_model": self.effective_model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        }
        return LLMResponse(
            content=content,
            provider_name="gemini",
            model_name=self.model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            raw_response=raw_meta,
        )

    def generate(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        import time
        from google import genai
        from google.genai import errors

        contents, config = self._prepare_payload(messages, temperature, max_tokens)
        client = genai.Client(api_key=self.api_key)
        max_retries = 3

        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=self.effective_model,
                    contents=contents,
                    config=config,
                )
                return self._extract_response(response)
            except errors.APIError as e:
                err_str = str(e)
                code = getattr(e, "code", None)
                is_transient = code in (429, 503) or "503" in err_str or "429" in err_str
                if is_transient and attempt < max_retries - 1:
                    logger.warning(f"Transient Gemini API error ({code}), retrying ({attempt + 1}/{max_retries})...")
                    time.sleep(1.5 * (attempt + 1))
                    continue
                logger.error(f"Gemini API error ({type(e).__name__}): {e}")
                raise RuntimeError(f"Gemini API request failed ({type(e).__name__}): {e.message if hasattr(e, 'message') else str(e)}") from None
            except Exception as e:
                logger.error(f"Unexpected error in GeminiProvider.generate: {e}")
                raise RuntimeError(f"Gemini generation error: {str(e)}") from None

    async def generate_async(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        import asyncio
        from google import genai
        from google.genai import errors

        contents, config = self._prepare_payload(messages, temperature, max_tokens)
        client = genai.Client(api_key=self.api_key)
        max_retries = 3

        for attempt in range(max_retries):
            try:
                response = await client.aio.models.generate_content(
                    model=self.effective_model,
                    contents=contents,
                    config=config,
                )
                return self._extract_response(response)
            except errors.APIError as e:
                err_str = str(e)
                code = getattr(e, "code", None)
                is_transient = code in (429, 503) or "503" in err_str or "429" in err_str
                if is_transient and attempt < max_retries - 1:
                    logger.warning(f"Transient Gemini API async error ({code}), retrying ({attempt + 1}/{max_retries})...")
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                logger.error(f"Gemini API async error ({type(e).__name__}): {e}")
                raise RuntimeError(f"Gemini API async request failed ({type(e).__name__}): {e.message if hasattr(e, 'message') else str(e)}") from None
            except Exception as e:
                logger.error(f"Unexpected error in GeminiProvider.generate_async: {e}")
                raise RuntimeError(f"Gemini async generation error: {str(e)}") from None


def get_llm_provider() -> LLMProvider:
    """Factory returning the configured provider instance.
    
    Fail fast on unknown provider. Never silently fall back to mock in production.
    """
    provider_type = (settings.LLM_PROVIDER or "").lower().strip()
    if provider_type == "mock":
        return MockLLMProvider(model_name=settings.LLM_MODEL)
    elif provider_type in ("openai", "openai_compatible"):
        return OpenAILikeProvider(
            api_key=settings.LLM_API_KEY,
            model_name=settings.LLM_MODEL,
            base_url=getattr(settings, "LLM_BASE_URL", None),
        )
    elif provider_type == "gemini":
        return GeminiProvider(
            api_key=settings.LLM_API_KEY,
            model_name=settings.LLM_MODEL,
        )
    else:
        raise ValueError(
            f"Unsupported LLM provider '{settings.LLM_PROVIDER}'. "
            f"Supported providers are: 'mock', 'openai', 'gemini'."
        )

