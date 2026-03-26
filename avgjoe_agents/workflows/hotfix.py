"""
workflows/hotfix.py

Streamlined pipeline for urgent bug fixes:
  - Skips the Planner (you describe the fix directly)
  - Build → Test → Deploy (one shot, no retries by default)
  - Targets the existing branch instead of creating a new one
"""

from agents.builder import BuilderAgent
from agents.tester import TesterAgent
from agents.deployer import DeployerAgent
from config.settings import Settings


def run_hotfix(
    bug_description: str,
    affected_files: list[str],
    repo_url: str = "https://github.com/Bugman31/AVGJoe.git",
    settings: Settings | None = None,
) -> dict:
    """
    Fast-track a bug fix without a full planning phase.

    Args:
        bug_description:  Plain-English description of the bug and expected fix.
        affected_files:   List of file paths that need to change.
        repo_url:         GitHub repo URL.
        settings:         Optional Settings override.
    """
    if settings is None:
        settings = Settings()
        settings.validate()

    builder  = BuilderAgent(settings)
    tester   = TesterAgent(settings)
    deployer = DeployerAgent(settings)

    # Minimal synthetic plan so tester has acceptance criteria
    hotfix_plan = {
        "summary": f"Hotfix: {bug_description[:80]}",
        "tasks": [
            {
                "id": "HF-001",
                "title": "Fix bug",
                "description": bug_description,
                "files_affected": affected_files,
                "acceptance_criteria": [
                    "Bug is no longer reproducible",
                    "Existing tests still pass",
                    "No regression in adjacent functionality",
                ],
                "depends_on": [],
            }
        ],
        "test_strategy": {
            "unit": ["Regression test for the specific bug"],
            "integration": ["Smoke test affected API endpoints"],
            "e2e": [],
        },
        "estimated_complexity": "low",
        "risks": ["Insufficient test coverage for edge cases"],
    }

    print(f"\n🔥 Hotfix Pipeline")
    print(f"   Bug: {bug_description[:80]}")
    print(f"   Files: {affected_files}\n")

    print("🔨 Building fix …")
    build_result = builder.run(plan=hotfix_plan, repo_url=repo_url)
    # Mark as hotfix branch
    build_result["branch_name"] = "hotfix/" + build_result.get("branch_name", "fix").replace("feat/", "")

    print("🧪 Testing …")
    test_result = tester.run(build_result=build_result, plan=hotfix_plan)

    if not test_result.get("passed"):
        print("❌ Hotfix tests failed — not deploying.")
        return {"status": "failed", "build_result": build_result, "test_result": test_result}

    print("🚀 Deploying hotfix …")
    deploy_result = deployer.run(build_result=build_result, test_result=test_result)

    print(f"✅ Hotfix deployed → {deploy_result.get('deploy_url')}\n")
    return {
        "status": "success",
        "build_result": build_result,
        "test_result": test_result,
        "deploy_result": deploy_result,
    }
