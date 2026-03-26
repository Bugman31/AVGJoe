"""
TesterAgent — generates and (optionally) runs tests:
  - Unit tests
  - Integration tests
  - E2E test scripts
  - Test report
"""

import json
import subprocess
import os
from agents.base import BaseAgent
from config.settings import Settings


SYSTEM_PROMPT = """You are the **Testing Agent** for the AVGJoe web application.

You receive build output and generate comprehensive tests. Your responsibilities:
1. Write unit tests for all new/modified functions and components.
2. Write integration tests for API endpoints.
3. Write E2E test scripts (Playwright or Cypress) for user flows.
4. Evaluate whether the build meets the acceptance criteria from the plan.
5. Report pass/fail with actionable feedback.

Output structured JSON:
{
  "passed": true|false,
  "summary": "one-line verdict",
  "coverage_estimate": "percentage string e.g. '78%'",
  "test_files": [
    {
      "path": "tests/unit/test_something.py",
      "framework": "pytest|jest|playwright|cypress",
      "content": "full test file content",
      "test_count": 5
    }
  ],
  "acceptance_criteria_results": [
    {
      "criterion": "string",
      "status": "pass|fail|untestable",
      "note": "string"
    }
  ],
  "issues": [
    {
      "severity": "critical|major|minor",
      "description": "string",
      "file": "optional path",
      "suggestion": "string"
    }
  ],
  "recommendations": ["string"]
}
"""


class TesterAgent(BaseAgent):
    def __init__(self, settings: Settings):
        super().__init__(settings, SYSTEM_PROMPT)

    def run(self, *, build_result: dict, plan: dict) -> dict:
        self.reset_history()

        prompt = f"""
Build Output:
{json.dumps(build_result, indent=2)}

Original Plan (acceptance criteria):
{json.dumps(plan, indent=2)}

Generate a complete test suite for this build. For each task's acceptance criteria,
evaluate whether the generated code satisfies it.
Write full test file contents using pytest (backend) and Playwright (frontend E2E).
""".strip()

        test_result = self.call_json(prompt, max_tokens=8192)

        # Optionally execute tests if a workspace is present
        if self.settings.run_tests and build_result.get("local_workspace"):
            test_result = self._run_tests(
                build_result["local_workspace"], test_result
            )

        return test_result

    def _run_tests(self, workspace: str, test_result: dict) -> dict:
        """Write test files and execute them in the workspace."""
        results = []
        for tf in test_result.get("test_files", []):
            if tf.get("framework") != "pytest":
                continue
            test_path = os.path.join(workspace, tf["path"])
            os.makedirs(os.path.dirname(test_path), exist_ok=True)
            with open(test_path, "w") as f:
                f.write(tf["content"])

            proc = subprocess.run(
                ["python", "-m", "pytest", test_path, "-v", "--tb=short"],
                capture_output=True,
                text=True,
                cwd=workspace,
            )
            results.append({
                "file": tf["path"],
                "returncode": proc.returncode,
                "stdout": proc.stdout[-2000:],
                "stderr": proc.stderr[-500:],
            })

        any_failed = any(r["returncode"] != 0 for r in results)
        test_result["execution_results"] = results
        if any_failed:
            test_result["passed"] = False
            test_result["summary"] += " (execution failures detected)"

        return test_result
