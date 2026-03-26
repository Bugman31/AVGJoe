"""
BaseAgent — shared Claude API client and message-loop logic
All four agents inherit from this.
"""

import json
import os
from typing import Any, Optional
import anthropic
from config.settings import Settings


class BaseAgent:
    MODEL = "claude-sonnet-4-20250514"

    def __init__(self, settings: Settings, system_prompt: str):
        self.settings = settings
        self.system_prompt = system_prompt
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.history: list[dict] = []

    # ------------------------------------------------------------------
    # Core call — single turn
    # ------------------------------------------------------------------

    def call(
        self,
        user_message: str,
        *,
        max_tokens: int = 4096,
        json_response: bool = False,
    ) -> str:
        """
        Send a message, get a text response.
        If json_response=True the system prompt is amended to enforce JSON output.
        """
        system = self.system_prompt
        if json_response:
            system += (
                "\n\nIMPORTANT: Respond ONLY with valid JSON. "
                "No markdown fences, no preamble, no explanation."
            )

        self.history.append({"role": "user", "content": user_message})

        response = self.client.messages.create(
            model=self.MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=self.history,
        )

        assistant_text = response.content[0].text
        self.history.append({"role": "assistant", "content": assistant_text})
        return assistant_text

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def call_json(self, user_message: str, **kwargs) -> dict | list:
        raw = self.call(user_message, json_response=True, **kwargs)
        try:
            clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            return json.loads(clean)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Agent returned non-JSON: {raw[:200]}") from exc

    def reset_history(self) -> None:
        self.history = []

    def run(self, **kwargs) -> dict:
        """Override in subclass."""
        raise NotImplementedError
