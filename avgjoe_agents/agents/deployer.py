"""
DeployerAgent — handles CI/CD and deployment:
  - Generates GitHub Actions workflow YAML
  - Generates environment configs
  - Produces deployment checklist
  - Reports deployment status
"""

import json
from agents.base import BaseAgent
from config.settings import Settings


SYSTEM_PROMPT = """You are the **Deployment Agent** for the AVGJoe web application.

You receive a passing build+test result and handle everything needed to ship it.
Your responsibilities:
1. Generate a GitHub Actions CI/CD workflow YAML.
2. Identify required environment variables and secrets.
3. Produce a deployment checklist.
4. Generate infrastructure-as-code snippets if needed (Docker, docker-compose, etc.).
5. Validate that the deployment is safe (no secrets in code, migrations handled, etc.).

Output structured JSON:
{
  "deploy_url": "https://your-app.example.com",
  "environment": "staging|production",
  "deployment_files": [
    {
      "path": ".github/workflows/deploy.yml",
      "content": "full YAML content",
      "description": "CI/CD pipeline"
    }
  ],
  "environment_variables": [
    {
      "name": "DATABASE_URL",
      "required": true,
      "sensitive": true,
      "description": "PostgreSQL connection string"
    }
  ],
  "deployment_checklist": [
    {
      "step": "string",
      "automated": true|false,
      "status": "ready|needs_manual_action"
    }
  ],
  "rollback_plan": "string — steps to rollback if deploy fails",
  "monitoring_hooks": ["string — what to watch after deploy"],
  "warnings": ["string"]
}
"""


class DeployerAgent(BaseAgent):
    def __init__(self, settings: Settings):
        super().__init__(settings, SYSTEM_PROMPT)

    def run(self, *, build_result: dict, test_result: dict) -> dict:
        self.reset_history()

        prompt = f"""
Build Result:
{json.dumps(build_result, indent=2)}

Test Result (all tests passed):
{json.dumps(test_result, indent=2)}

The tests have passed. Generate a complete deployment plan for AVGJoe.
Include a full GitHub Actions workflow that:
- Runs on push to main and on pull_request
- Installs dependencies, runs tests, builds the app
- Deploys to staging on PR merge, production on release tag
- Uses secrets for all sensitive values

Also produce a docker-compose.yml for local + staging environments.
""".strip()

        deploy = self.call_json(prompt, max_tokens=8192)

        # Mark overall as successful
        deploy.setdefault("status", "success")
        deploy.setdefault(
            "deploy_url",
            "https://avgjoe-staging.example.com",
        )

        return deploy
