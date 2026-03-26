"""
BuilderAgent — takes a plan and generates:
  - Actual code diffs / file contents
  - Git branch name
  - PR title + body
  - Commit message
"""

import subprocess
import tempfile
import os
from agents.base import BaseAgent
from config.settings import Settings


SYSTEM_PROMPT = """You are the **Builder Agent** for the AVGJoe web application.

You receive a development plan and produce concrete code output. Your responsibilities:
1. Generate code changes for each task in the plan.
2. Follow the project's existing code style and conventions.
3. Write clean, production-ready code.
4. Produce a git branch name, commit message, and PR description.

Output structured JSON:
{
  "branch_name": "feat/short-description",
  "commit_message": "feat: short description (#task-ids)",
  "pr_title": "string",
  "pr_body": "markdown string — includes summary, changes, test notes",
  "files": [
    {
      "path": "relative/path/to/file",
      "action": "create|modify|delete",
      "content": "full file content as string",
      "description": "what changed and why"
    }
  ],
  "setup_commands": ["npm install", "pip install -r requirements.txt"],
  "notes": "any important implementation notes"
}
"""


class BuilderAgent(BaseAgent):
    def __init__(self, settings: Settings):
        super().__init__(settings, SYSTEM_PROMPT)

    def run(self, *, plan: dict, repo_url: str) -> dict:
        self.reset_history()

        import json

        prompt = f"""
Repo: {repo_url}

Development Plan:
{json.dumps(plan, indent=2)}

Generate the full code implementation for this plan.
Produce complete file contents (not snippets) so the code can be committed directly.
""".strip()

        build = self.call_json(prompt, max_tokens=8192)

        # Optionally write files to a temp workspace
        if self.settings.write_files_to_disk:
            workspace = self._write_to_workspace(build)
            build["local_workspace"] = workspace

        # Simulate a PR URL (real impl would call GitHub API)
        build.setdefault(
            "pr_url",
            f"https://github.com/Bugman31/AVGJoe/pull/new/{build.get('branch_name', 'feature-branch')}",
        )

        return build

    def _write_to_workspace(self, build: dict) -> str:
        workspace = tempfile.mkdtemp(prefix="avgjoe_build_")
        for file_obj in build.get("files", []):
            if file_obj.get("action") == "delete":
                continue
            dest = os.path.join(workspace, file_obj["path"])
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w") as f:
                f.write(file_obj.get("content", ""))
        print(f"  Files written to: {workspace}")
        return workspace
