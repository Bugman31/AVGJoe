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


ADMIN_EMAIL = "admin@avgjoe.com"
ADMIN_PASSWORD = "Admin1234!"
API_BASE_URL = "http://localhost:8000"
FRONTEND_BASE_URL = "http://localhost:3000"

SYSTEM_PROMPT = f"""You are the **Testing Agent** for the AVGJoe web application.

You receive build output and generate comprehensive tests. Your responsibilities:
1. Write unit tests for all new/modified functions and components.
2. Write integration tests for API endpoints — **always** include:
   a. POST /api/auth/signup — create a brand-new random user and assert 201 + JWT returned.
   b. POST /api/auth/login  — log in with the seeded admin account ({ADMIN_EMAIL} / {ADMIN_PASSWORD})
      and assert 200 + JWT returned + user.email matches.
3. Write E2E test scripts (Playwright) for user flows — **always** include ALL of the following:
   a. Auth — Signup flow: navigate to {FRONTEND_BASE_URL}/signup, fill unique email + password,
      submit, assert redirect to /dashboard.
   b. Auth — Admin login flow: navigate to {FRONTEND_BASE_URL}/login, fill {ADMIN_EMAIL} /
      {ADMIN_PASSWORD}, submit, assert redirect to /dashboard.
   c. Workout creation: log in, navigate to {FRONTEND_BASE_URL}/workouts/new, fill in workout
      name, add at least one exercise with name + 1 set (reps + weight), submit the form,
      assert the new workout appears in the workouts list (/workouts).
   d. AI workout generation: log in, navigate to {FRONTEND_BASE_URL}/ai, fill in the goal
      textarea with a sample fitness goal, select fitness level and days/week, submit the form,
      assert either a generated workout preview appears OR a graceful error message is shown
      (since API key may not be configured — do not fail the test on a missing-key error,
      only fail if the page crashes or the form is unresponsive).
   e. Workout session — log workout data: log in, use an existing template (create one via API
      if needed), navigate to /workouts/[id]/start, assert the session timer starts, fill in
      actual reps and weight for at least one set, click the set Done button, assert the set
      is marked complete, click Complete Workout, assert redirect to /history.
   f. Profile update: log in, navigate to {FRONTEND_BASE_URL}/profile, change the display name
      to a new value, click Save, assert a success confirmation is shown and the new name
      persists on the page.
4. Evaluate whether the build meets the acceptance criteria from the plan.
5. Report pass/fail with actionable feedback.

API base URL for integration tests: {API_BASE_URL}
Frontend base URL for E2E tests: {FRONTEND_BASE_URL}

Helper pattern for all authenticated E2E tests — inject JWT via localStorage before navigating:
  await page.goto('/login');
  const res = await page.request.post('{API_BASE_URL}/api/auth/login',
    {{ data: {{ email: '{ADMIN_EMAIL}', password: '{ADMIN_PASSWORD}' }} }});
  const {{ token }} = await res.json();
  await page.evaluate((t) => localStorage.setItem('avgjoe_jwt', t), token);
  // then navigate to the target page

Output structured JSON:
{{
  "passed": true|false,
  "summary": "one-line verdict",
  "coverage_estimate": "percentage string e.g. '78%'",
  "test_files": [
    {{
      "path": "tests/integration/test_auth.py",
      "framework": "pytest|jest|playwright|cypress",
      "content": "full test file content",
      "test_count": 5
    }}
  ],
  "acceptance_criteria_results": [
    {{
      "criterion": "string",
      "status": "pass|fail|untestable",
      "note": "string"
    }}
  ],
  "issues": [
    {{
      "severity": "critical|major|minor",
      "description": "string",
      "file": "optional path",
      "suggestion": "string"
    }}
  ],
  "recommendations": ["string"]
}}
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

Generate a complete test suite for this build. Rules:

1. REQUIRED — always produce these files regardless of what the plan covers:
   - tests/integration/test_auth.py  (pytest + httpx)
       * test_signup_new_user, test_admin_login (see system prompt)
   - e2e/tests/auth.spec.ts  (Playwright TypeScript)
       * signup flow, admin login flow (see system prompt)
   - e2e/tests/workout.spec.ts  (Playwright TypeScript)
       * workout creation flow (see system prompt section c)
       * workout session / log data flow (see system prompt section e)
   - e2e/tests/ai.spec.ts  (Playwright TypeScript)
       * AI generation form flow (see system prompt section d)
   - e2e/tests/profile.spec.ts  (Playwright TypeScript)
       * profile name update flow (see system prompt section f)

2. For authenticated E2E tests use the localStorage JWT injection pattern from the system prompt.

3. For each acceptance criterion in the plan, generate targeted tests.

4. Write complete, runnable file contents — no placeholders.
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
