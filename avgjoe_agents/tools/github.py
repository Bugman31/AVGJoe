"""
tools/github.py — thin wrapper around the GitHub REST API
Used by BuilderAgent to create branches and PRs.
"""

import json
import urllib.request
import urllib.error
from config.settings import Settings


class GitHubClient:
    BASE = "https://api.github.com"

    def __init__(self, settings: Settings):
        self.repo   = settings.github_repo
        self.token  = settings.github_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        url  = f"{self.BASE}{path}"
        data = json.dumps(body).encode() if body else None
        req  = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"GitHub API error {e.code}: {e.read().decode()}") from e

    # ------------------------------------------------------------------
    # Branch helpers
    # ------------------------------------------------------------------

    def get_default_branch_sha(self) -> str:
        repo_data = self._request("GET", f"/repos/{self.repo}")
        branch    = repo_data["default_branch"]
        ref_data  = self._request("GET", f"/repos/{self.repo}/git/ref/heads/{branch}")
        return ref_data["object"]["sha"]

    def create_branch(self, branch_name: str) -> str:
        sha = self.get_default_branch_sha()
        self._request(
            "POST",
            f"/repos/{self.repo}/git/refs",
            {"ref": f"refs/heads/{branch_name}", "sha": sha},
        )
        return branch_name

    # ------------------------------------------------------------------
    # File helpers
    # ------------------------------------------------------------------

    def upsert_file(
        self, branch: str, path: str, content: str, message: str
    ) -> None:
        import base64

        encoded = base64.b64encode(content.encode()).decode()
        existing_sha = None

        # Check if file exists to get its SHA (needed for updates)
        try:
            existing = self._request(
                "GET", f"/repos/{self.repo}/contents/{path}?ref={branch}"
            )
            existing_sha = existing.get("sha")
        except RuntimeError:
            pass  # New file

        body: dict = {
            "message": message,
            "content": encoded,
            "branch": branch,
        }
        if existing_sha:
            body["sha"] = existing_sha

        self._request("PUT", f"/repos/{self.repo}/contents/{path}", body)

    # ------------------------------------------------------------------
    # PR helpers
    # ------------------------------------------------------------------

    def create_pr(
        self, branch: str, title: str, body: str, base: str = "main"
    ) -> str:
        pr = self._request(
            "POST",
            f"/repos/{self.repo}/pulls",
            {"title": title, "body": body, "head": branch, "base": base},
        )
        return pr["html_url"]
