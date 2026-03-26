"""
workflows/feedback_loop.py

Implements a Build → Test → Retry cycle.
If tests fail, the TesterAgent's issue report is fed back to the BuilderAgent
for a targeted fix, up to MAX_RETRIES times.
"""

import json
from agents.planner import PlannerAgent
from agents.builder import BuilderAgent
from agents.tester import TesterAgent
from agents.deployer import DeployerAgent
from config.settings import Settings

MAX_RETRIES = 3


def run_with_feedback(
    feature_request: str,
    repo_url: str = "https://github.com/Bugman31/AVGJoe.git",
    settings: Settings | None = None,
) -> dict:
    """
    Full pipeline with an automatic retry loop:

        Plan → Build → Test
                  ↑        |  (if fail, up to MAX_RETRIES)
                  └────────┘
                           |  (if pass)
                           ▼
                        Deploy
    """
    if settings is None:
        settings = Settings()
        settings.validate()

    planner  = PlannerAgent(settings)
    builder  = BuilderAgent(settings)
    tester   = TesterAgent(settings)
    deployer = DeployerAgent(settings)

    # ── 1. Plan ─────────────────────────────────────────────────────────
    print("\n📋 Planning …")
    plan = planner.run(feature_request=feature_request, repo_url=repo_url)
    print(f"   {len(plan.get('tasks', []))} tasks, complexity={plan.get('estimated_complexity')}")

    # ── 2. Build + Test loop ────────────────────────────────────────────
    build_result = None
    test_result  = None
    attempt      = 0

    while attempt < MAX_RETRIES:
        attempt += 1
        print(f"\n🔨 Building (attempt {attempt}/{MAX_RETRIES}) …")

        if build_result is None:
            # First build: use the plan as-is
            build_result = builder.run(plan=plan, repo_url=repo_url)
        else:
            # Subsequent builds: inject test failures as context
            fix_context = _build_fix_prompt(plan, build_result, test_result)
            builder.reset_history()
            build_result = builder.call_json(fix_context, max_tokens=8192)
            build_result.setdefault(
                "pr_url",
                f"https://github.com/Bugman31/AVGJoe/pull/new/{build_result.get('branch_name', 'fix-branch')}",
            )

        print(f"   Branch: {build_result.get('branch_name')}")

        print(f"\n🧪 Testing …")
        test_result = tester.run(build_result=build_result, plan=plan)
        passed = test_result.get("passed", False)

        issues = test_result.get("issues", [])
        critical = [i for i in issues if i.get("severity") == "critical"]

        print(f"   passed={passed}  issues={len(issues)}  critical={len(critical)}")

        if passed and not critical:
            print("   ✅ Tests passed!")
            break
        elif attempt < MAX_RETRIES:
            print(f"   ❌ Tests failed — feeding {len(issues)} issues back to builder …")
        else:
            print(f"   ❌ Tests still failing after {MAX_RETRIES} attempts — aborting deploy.")
            return {
                "status": "failed",
                "plan": plan,
                "build_result": build_result,
                "test_result": test_result,
                "deploy_result": None,
            }

    # ── 3. Deploy ───────────────────────────────────────────────────────
    print("\n🚀 Deploying …")
    deploy_result = deployer.run(build_result=build_result, test_result=test_result)
    print(f"   URL: {deploy_result.get('deploy_url')}")

    return {
        "status": "success",
        "attempts": attempt,
        "plan": plan,
        "build_result": build_result,
        "test_result": test_result,
        "deploy_result": deploy_result,
    }


# ── Helpers ──────────────────────────────────────────────────────────────

def _build_fix_prompt(plan: dict, build_result: dict, test_result: dict) -> str:
    issues_summary = json.dumps(test_result.get("issues", []), indent=2)
    criteria_summary = json.dumps(
        [c for c in test_result.get("acceptance_criteria_results", [])
         if c.get("status") == "fail"],
        indent=2,
    )
    return f"""
The previous build failed tests. Fix ONLY the reported issues — do not change unrelated code.

=== FAILING ACCEPTANCE CRITERIA ===
{criteria_summary}

=== ISSUES REPORTED BY TESTER ===
{issues_summary}

=== PREVIOUS BUILD (for reference) ===
Branch: {build_result.get('branch_name')}
Files changed: {[f['path'] for f in build_result.get('files', [])]}

Return the full corrected build result JSON with updated file contents.
""".strip()
