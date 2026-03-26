"""
AVGJoe Agent Orchestrator
Coordinates Planning → Building → Testing → Deploying agents
"""

import json
import os
from typing import Optional
from agents.planner import PlannerAgent
from agents.builder import BuilderAgent
from agents.tester import TesterAgent
from agents.deployer import DeployerAgent
from config.settings import Settings


class Orchestrator:
    """
    Top-level controller that routes tasks to the right agent
    and passes state between them through the pipeline.
    """

    def __init__(self, repo_url: str = "https://github.com/Bugman31/AVGJoe.git"):
        self.repo_url = repo_url
        self.settings = Settings()
        self.state: dict = {
            "repo_url": repo_url,
            "plan": None,
            "build_result": None,
            "test_result": None,
            "deploy_result": None,
        }

        self.planner  = PlannerAgent(self.settings)
        self.builder  = BuilderAgent(self.settings)
        self.tester   = TesterAgent(self.settings)
        self.deployer = DeployerAgent(self.settings)

    # ------------------------------------------------------------------
    # Full pipeline
    # ------------------------------------------------------------------

    def run_full_pipeline(self, feature_request: str) -> dict:
        """
        Run all four agents end-to-end for a feature request.
        Returns the final state dict.
        """
        print(f"\n{'='*60}")
        print(f"AVGJoe Pipeline — Feature: {feature_request}")
        print(f"{'='*60}\n")

        # 1. Plan
        print("▶ [1/4] Planning …")
        self.state["plan"] = self.planner.run(
            feature_request=feature_request,
            repo_url=self.repo_url,
        )
        print(f"  ✓ Plan ready — {len(self.state['plan'].get('tasks', []))} tasks\n")

        # 2. Build
        print("▶ [2/4] Building …")
        self.state["build_result"] = self.builder.run(
            plan=self.state["plan"],
            repo_url=self.repo_url,
        )
        print(f"  ✓ Build complete — PR: {self.state['build_result'].get('pr_url', 'N/A')}\n")

        # 3. Test
        print("▶ [3/4] Testing …")
        self.state["test_result"] = self.tester.run(
            build_result=self.state["build_result"],
            plan=self.state["plan"],
        )
        passed = self.state["test_result"].get("passed", False)
        print(f"  {'✓' if passed else '✗'} Tests {'passed' if passed else 'FAILED'}\n")

        if not passed:
            print("  ⚠️  Tests failed — aborting deploy. Review test_result for details.")
            return self.state

        # 4. Deploy
        print("▶ [4/4] Deploying …")
        self.state["deploy_result"] = self.deployer.run(
            build_result=self.state["build_result"],
            test_result=self.state["test_result"],
        )
        print(f"  ✓ Deployed — URL: {self.state['deploy_result'].get('deploy_url', 'N/A')}\n")

        print("🎉 Pipeline complete!\n")
        return self.state

    # ------------------------------------------------------------------
    # Single-agent entry points (for selective use)
    # ------------------------------------------------------------------

    def plan_only(self, feature_request: str) -> dict:
        return self.planner.run(feature_request=feature_request, repo_url=self.repo_url)

    def build_only(self, plan: dict) -> dict:
        return self.builder.run(plan=plan, repo_url=self.repo_url)

    def test_only(self, build_result: dict, plan: Optional[dict] = None) -> dict:
        return self.tester.run(build_result=build_result, plan=plan or {})

    def deploy_only(self, build_result: dict, test_result: dict) -> dict:
        return self.deployer.run(build_result=build_result, test_result=test_result)

    def save_state(self, path: str = "pipeline_state.json") -> None:
        with open(path, "w") as f:
            json.dump(self.state, f, indent=2)
        print(f"State saved → {path}")


# ------------------------------------------------------------------
# CLI entry point
# ------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    feature = " ".join(sys.argv[1:]) or "Add user authentication with JWT"
    orch = Orchestrator()
    final_state = orch.run_full_pipeline(feature)
    orch.save_state()
