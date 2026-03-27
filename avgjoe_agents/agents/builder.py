"""
BuilderAgent — takes a plan and generates:
  - Actual code diffs / file contents
  - Git branch name
  - PR title + body
  - Commit message

After building NEW FEATURES (not bug fixes), it automatically reviews the
TesterAgent and updates its system prompt / test instructions if needed to
cover the new functionality.
"""

import json
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

# Path to tester.py relative to this file's directory
_TESTER_PATH = os.path.join(os.path.dirname(__file__), "tester.py")


def _is_new_feature(build: dict) -> bool:
    """Return True when the build introduces new functionality rather than fixing bugs."""
    commit = build.get("commit_message", "").lower()
    branch = build.get("branch_name", "").lower()
    # feat / feature branches are new functionality
    if commit.startswith("feat") or branch.startswith("feat/"):
        return True
    # Explicit bug-fix signals → skip tester update
    if any(commit.startswith(p) for p in ("fix", "hotfix", "bug", "patch", "revert", "chore", "docs", "refactor")):
        return False
    # Default: treat as new feature if we can't tell
    return True


class BuilderAgent(BaseAgent):
    def __init__(self, settings: Settings):
        super().__init__(settings, SYSTEM_PROMPT)

    def run(self, *, plan: dict, repo_url: str) -> dict:
        self.reset_history()

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

        # After building, check if TesterAgent needs updating for new features
        if _is_new_feature(build):
            tester_updated = self._maybe_update_tester(build, plan)
            build["tester_updated"] = tester_updated

        return build

    # ------------------------------------------------------------------
    # Tester self-update logic
    # ------------------------------------------------------------------

    def _maybe_update_tester(self, build: dict, plan: dict) -> bool:
        """
        Read the current TesterAgent source, ask Claude whether the new
        functionality requires tester changes, and apply them if so.

        Returns True if tester.py was updated.
        """
        try:
            with open(_TESTER_PATH, "r") as f:
                current_tester_source = f.read()
        except OSError:
            print("  [Builder] Could not read tester.py — skipping tester review.")
            return False

        # Summarise the build for the review prompt
        new_files_summary = "\n".join(
            f"  - [{f.get('action', '?')}] {f.get('path', '?')}: {f.get('description', '')}"
            for f in build.get("files", [])
        )

        review_prompt = f"""
You are reviewing whether the TesterAgent needs to be updated after a new feature was built.

## New feature built
Commit: {build.get("commit_message", "unknown")}
PR title: {build.get("pr_title", "unknown")}

Files changed:
{new_files_summary}

Plan summary:
{json.dumps(plan.get("summary", plan.get("tasks", [])), indent=2)}

## Current TesterAgent source (tester.py)
```python
{current_tester_source}
```

## Your task
1. Decide whether the new feature introduces functionality that the TesterAgent does NOT yet cover
   in its SYSTEM_PROMPT or run() prompt instructions.
2. If YES — output the COMPLETE updated tester.py source with the additions woven in.
   - Add specific test instructions for the new endpoints / flows / components.
   - Keep all existing instructions intact.
   - Do NOT change the overall structure or class interface.
3. If NO — the existing tester already covers this or it is a minor change — output nothing.

Respond with EXACTLY one of:
  A) The word NO_UPDATE_NEEDED (if no change required)
  B) The complete updated tester.py source code (no markdown fences, just the raw Python)
""".strip()

        self.reset_history()
        response = self.call(review_prompt, max_tokens=8192)
        response = response.strip()

        if response.upper().startswith("NO_UPDATE_NEEDED"):
            print("  [Builder] TesterAgent is already up to date — no changes needed.")
            return False

        # Strip any accidental markdown fences
        if response.startswith("```"):
            lines = response.splitlines()
            response = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            ).strip()

        # Safety check: must still look like a Python file
        if "class TesterAgent" not in response or "def run" not in response:
            print("  [Builder] TesterAgent update response did not look valid — skipping.")
            return False

        with open(_TESTER_PATH, "w") as f:
            f.write(response)

        print(f"  [Builder] TesterAgent updated to cover new feature: {build.get('pr_title', '')}")
        return True

    # ------------------------------------------------------------------
    # Workspace helper
    # ------------------------------------------------------------------

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
