"""
Settings — loaded from environment variables or .env file
"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    # Anthropic
    anthropic_api_key: str = field(
        default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY", "")
    )

    # GitHub
    github_token: str = field(
        default_factory=lambda: os.environ.get("GITHUB_TOKEN", "")
    )
    github_repo: str = field(
        default_factory=lambda: os.environ.get("GITHUB_REPO", "Bugman31/AVGJoe")
    )

    # Pipeline behaviour
    write_files_to_disk: bool = field(
        default_factory=lambda: os.environ.get("WRITE_FILES", "true").lower() == "true"
    )
    run_tests: bool = field(
        default_factory=lambda: os.environ.get("RUN_TESTS", "false").lower() == "true"
    )

    def validate(self) -> None:
        if not self.anthropic_api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is not set. "
                "Export it or add it to a .env file."
            )
