#!/usr/bin/env python3
"""
cli.py — Interactive command-line interface for the AVGJoe agent system.

Usage:
    python cli.py                        # interactive menu
    python cli.py feature "Add search"   # run full pipeline
    python cli.py plan "Add search"      # planning only
    python cli.py build                  # build from saved plan
    python cli.py test                   # test from saved build
    python cli.py deploy                 # deploy from saved build+test
    python cli.py hotfix "Bug desc" file1.py file2.py
    python cli.py status                 # show last pipeline_state.json
"""

import json
import os
import sys
import textwrap
from datetime import datetime
from pathlib import Path

from config.settings import Settings
from orchestrator import Orchestrator
from workflows.feedback_loop import run_with_feedback
from workflows.hotfix import run_hotfix

STATE_FILE = "pipeline_state.json"
REPO_URL = "https://github.com/Bugman31/AVGJoe.git"

# ── ANSI colours ─────────────────────────────────────────────────────────────
R = "\033[0m"
BOLD = "\033[1m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
DIM = "\033[2m"


def header():
    print(f"""
{CYAN}{BOLD}
  ╔═══════════════════════════════════════╗
  ║        AVGJoe Agent System            ║
  ║  Plan · Build · Test · Deploy         ║
  ╚═══════════════════════════════════════╝{R}
""")


def divider(label: str = ""):
    w = 45
    if label:
        pad = (w - len(label) - 2) // 2
        print(f"{DIM}{'─'*pad} {label} {'─'*pad}{R}")
    else:
        print(f"{DIM}{'─'*w}{R}")


def load_state() -> dict:
    if Path(STATE_FILE).exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}


def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
    print(f"{DIM}  State saved → {STATE_FILE}{R}")


def get_settings() -> Settings:
    # Support python-dotenv if installed
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    s = Settings()
    s.validate()
    return s


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_feature(args: list[str]):
    """Full pipeline with feedback loop."""
    feature = " ".join(args) if args else input(f"{CYAN}Feature request: {R}").strip()
    if not feature:
        print(f"{RED}No feature provided.{R}")
        return

    settings = get_settings()
    print(f"\n{BOLD}Running full pipeline with feedback loop …{R}")
    divider()
    result = run_with_feedback(feature, REPO_URL, settings)
    _print_result(result)
    save_state(result)


def cmd_plan(args: list[str]):
    """Planning agent only."""
    feature = " ".join(args) if args else input(f"{CYAN}Feature request: {R}").strip()
    settings = get_settings()
    orch = Orchestrator(REPO_URL)
    print(f"\n{BOLD}Planning …{R}")
    plan = orch.plan_only(feature)
    _print_plan(plan)
    state = load_state()
    state["plan"] = plan
    save_state(state)


def cmd_build(args: list[str]):
    """Builder agent — uses saved plan."""
    state = load_state()
    if not state.get("plan"):
        print(f"{RED}No plan found. Run `plan` first.{R}")
        return
    settings = get_settings()
    orch = Orchestrator(REPO_URL)
    print(f"\n{BOLD}Building …{R}")
    build = orch.build_only(state["plan"])
    _print_build(build)
    state["build_result"] = build
    save_state(state)


def cmd_test(args: list[str]):
    """Tester agent — uses saved build + plan."""
    state = load_state()
    if not state.get("build_result"):
        print(f"{RED}No build found. Run `build` first.{R}")
        return
    settings = get_settings()
    orch = Orchestrator(REPO_URL)
    print(f"\n{BOLD}Testing …{R}")
    result = orch.test_only(state["build_result"], state.get("plan"))
    _print_test(result)
    state["test_result"] = result
    save_state(state)


def cmd_deploy(args: list[str]):
    """Deployer agent — uses saved build + test."""
    state = load_state()
    if not state.get("build_result") or not state.get("test_result"):
        print(f"{RED}Need both build and test results. Run `build` then `test` first.{R}")
        return
    if not state["test_result"].get("passed"):
        print(f"{RED}Tests did not pass — refusing to deploy. Fix issues first.{R}")
        return
    settings = get_settings()
    orch = Orchestrator(REPO_URL)
    print(f"\n{BOLD}Deploying …{R}")
    deploy = orch.deploy_only(state["build_result"], state["test_result"])
    _print_deploy(deploy)
    state["deploy_result"] = deploy
    save_state(state)


def cmd_hotfix(args: list[str]):
    """Hotfix workflow."""
    if len(args) < 2:
        bug = input(f"{CYAN}Bug description: {R}").strip()
        files_raw = input(f"{CYAN}Affected files (comma-separated): {R}").strip()
        files = [f.strip() for f in files_raw.split(",") if f.strip()]
    else:
        bug = args[0]
        files = args[1:]
    settings = get_settings()
    result = run_hotfix(bug, files, REPO_URL, settings)
    _print_result(result)
    save_state(result)


def cmd_status(args: list[str]):
    """Show last saved state."""
    state = load_state()
    if not state:
        print(f"{YELLOW}No pipeline state found. Run a pipeline first.{R}")
        return
    divider("Pipeline State")
    print(f"  Status : {GREEN if state.get('status')=='success' else RED}{state.get('status','unknown')}{R}")
    if state.get("plan"):
        p = state["plan"]
        print(f"  Plan   : {p.get('summary','—')}")
        print(f"  Tasks  : {len(p.get('tasks',[]))}")
    if state.get("build_result"):
        b = state["build_result"]
        print(f"  Branch : {b.get('branch_name','—')}")
        print(f"  PR     : {b.get('pr_url','—')}")
    if state.get("test_result"):
        t = state["test_result"]
        icon = GREEN+"✓"+R if t.get("passed") else RED+"✗"+R
        print(f"  Tests  : {icon} {t.get('summary','')}")
    if state.get("deploy_result"):
        d = state["deploy_result"]
        print(f"  Deploy : {d.get('deploy_url','—')}")
    divider()


# ── Pretty printers ───────────────────────────────────────────────────────────

def _print_plan(plan: dict):
    divider("Plan")
    print(f"  {BOLD}{plan.get('summary','')}{R}")
    print(f"  Complexity : {plan.get('estimated_complexity')}")
    for t in plan.get("tasks", []):
        print(f"  {CYAN}[{t['id']}]{R} {t['title']}")
        for ac in t.get("acceptance_criteria", []):
            print(f"        • {ac}")
    if plan.get("risks"):
        print(f"\n  {YELLOW}Risks:{R}")
        for r in plan["risks"]:
            print(f"    ⚠ {r}")
    divider()


def _print_build(build: dict):
    divider("Build")
    print(f"  Branch  : {CYAN}{build.get('branch_name')}{R}")
    print(f"  PR      : {build.get('pr_url')}")
    print(f"  Commit  : {build.get('commit_message','')[:70]}")
    print(f"  Files   : {len(build.get('files',[]))}")
    for f in build.get("files", []):
        action_colour = GREEN if f["action"] == "create" else YELLOW if f["action"] == "modify" else RED
        print(f"    {action_colour}{f['action']:8}{R}  {f['path']}")
    divider()


def _print_test(result: dict):
    divider("Test Results")
    icon = GREEN+"✓ PASS"+R if result.get("passed") else RED+"✗ FAIL"+R
    print(f"  {icon}  — {result.get('summary','')}")
    print(f"  Coverage  : {result.get('coverage_estimate','?')}")
    for cr in result.get("acceptance_criteria_results", []):
        s = cr.get("status")
        col = GREEN if s == "pass" else RED if s == "fail" else DIM
        print(f"  {col}[{s:11}]{R}  {cr['criterion'][:60]}")
    issues = result.get("issues", [])
    if issues:
        print(f"\n  {YELLOW}Issues ({len(issues)}):{R}")
        for i in issues:
            sev_col = RED if i["severity"] == "critical" else YELLOW
            print(f"    {sev_col}[{i['severity']}]{R} {i['description'][:70]}")
    divider()


def _print_deploy(deploy: dict):
    divider("Deployment")
    print(f"  URL   : {GREEN}{deploy.get('deploy_url')}{R}")
    print(f"  Env   : {deploy.get('environment','staging')}")
    print(f"  Files : {len(deploy.get('deployment_files',[]))} generated")
    if deploy.get("warnings"):
        for w in deploy["warnings"]:
            print(f"  {YELLOW}⚠ {w}{R}")
    divider()


def _print_result(result: dict):
    status = result.get("status")
    if status == "success":
        print(f"\n{GREEN}{BOLD}🎉 Pipeline completed successfully!{R}")
    else:
        print(f"\n{RED}{BOLD}💥 Pipeline failed.{R}")
    if result.get("plan"):       _print_plan(result["plan"])
    if result.get("build_result"): _print_build(result["build_result"])
    if result.get("test_result"):  _print_test(result["test_result"])
    if result.get("deploy_result"): _print_deploy(result["deploy_result"])


# ── Interactive menu ──────────────────────────────────────────────────────────

COMMANDS = {
    "feature": (cmd_feature, "Full pipeline (plan+build+test+deploy) with retry loop"),
    "plan":    (cmd_plan,    "Planning agent only"),
    "build":   (cmd_build,   "Builder agent (uses saved plan)"),
    "test":    (cmd_test,    "Tester agent (uses saved build)"),
    "deploy":  (cmd_deploy,  "Deployer agent (uses saved build+test)"),
    "hotfix":  (cmd_hotfix,  "Hotfix workflow (no planning phase)"),
    "status":  (cmd_status,  "Show last pipeline state"),
    "quit":    (None,        "Exit"),
}


def interactive_menu():
    header()
    while True:
        divider("Commands")
        for i, (name, (_, desc)) in enumerate(COMMANDS.items(), 1):
            print(f"  {CYAN}{i:2}.{R} {BOLD}{name:<10}{R}  {DIM}{desc}{R}")
        divider()
        choice = input(f"\n{CYAN}Command (name or number): {R}").strip().lower()

        if not choice:
            continue

        # Allow numeric selection
        if choice.isdigit():
            idx = int(choice) - 1
            keys = list(COMMANDS.keys())
            choice = keys[idx] if 0 <= idx < len(keys) else choice

        if choice == "quit":
            print("Goodbye! 👋")
            break

        # Support "feature Add search bar" inline
        parts = choice.split(None, 1)
        cmd_name = parts[0]
        inline_args = parts[1].split() if len(parts) > 1 else []

        if cmd_name in COMMANDS:
            fn, _ = COMMANDS[cmd_name]
            if fn:
                try:
                    fn(inline_args)
                except KeyboardInterrupt:
                    print("\nCancelled.")
                except Exception as e:
                    print(f"{RED}Error: {e}{R}")
        else:
            print(f"{YELLOW}Unknown command: {cmd_name}{R}")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if not args:
        interactive_menu()
    else:
        cmd = args[0].lower()
        rest = args[1:]
        if cmd in COMMANDS and COMMANDS[cmd][0]:
            try:
                COMMANDS[cmd][0](rest)
            except Exception as e:
                print(f"{RED}Error: {e}{R}")
                sys.exit(1)
        else:
            print(f"Unknown command: {cmd}")
            print(f"Available: {', '.join(COMMANDS)}")
            sys.exit(1)
