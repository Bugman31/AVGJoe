"""
PlannerAgent — turns a feature request into a structured plan:
  - Architecture decisions
  - Ordered task list with acceptance criteria
  - File change manifest
  - Test strategy
"""

from agents.base import BaseAgent
from config.settings import Settings


SYSTEM_PROMPT = """You are the **Planning Agent** for the AVGJoe web application.

AVGJoe is a full-stack web app (frontend + backend). Your job is to:
1. Analyse the feature request against the existing codebase context.
2. Produce a detailed, actionable development plan.
3. Break the work into discrete, testable tasks.
4. Identify risks and dependencies.

Always output structured JSON conforming to this schema:
{
  "summary": "one-sentence description",
  "architecture_notes": "string — key design decisions",
  "tasks": [
    {
      "id": "T-001",
      "title": "string",
      "description": "string",
      "files_affected": ["path/to/file"],
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "depends_on": ["T-000"]
    }
  ],
  "test_strategy": {
    "unit": ["what to unit test"],
    "integration": ["what to integration test"],
    "e2e": ["what to e2e test"]
  },
  "estimated_complexity": "low|medium|high",
  "risks": ["risk 1", "risk 2"]
}
"""


class PlannerAgent(BaseAgent):
    def __init__(self, settings: Settings):
        super().__init__(settings, SYSTEM_PROMPT)

    def run(self, *, feature_request: str, repo_url: str) -> dict:
        self.reset_history()

        prompt = f"""
Repo: {repo_url}
Feature request: {feature_request}

Analyse this feature request for the AVGJoe web app and produce a complete
development plan in the JSON schema specified.
""".strip()

        plan = self.call_json(prompt, max_tokens=4096)

        # Allow the planner to refine once with follow-up
        if plan.get("estimated_complexity") == "high":
            refine = self.call_json(
                "The complexity is high. Can you split any tasks further "
                "to make them independently deployable? Return the full updated plan.",
                max_tokens=4096,
            )
            plan = refine

        return plan
