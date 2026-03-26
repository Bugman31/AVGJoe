# AVGJoe Agent System

A set of four Claude-powered agents that automate the full development lifecycle for the AVGJoe web app.

## Architecture

```
Feature Request
      │
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Planner   │────▶│   Builder   │────▶│   Tester    │────▶│  Deployer   │
│             │     │             │     │             │     │             │
│ Tasks       │     │ Code files  │     │ Test suite  │     │ CI/CD YAML  │
│ Arch notes  │     │ Branch/PR   │     │ Pass/fail   │     │ Deploy plan │
│ Test strat  │     │ Commit msg  │     │ Coverage    │     │ Env vars    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                         fail │ (deploy blocked)
                                              ▼
                                      Back to Builder
```

## Setup

```bash
cd avgjoe_agents
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and GITHUB_TOKEN
```

## Usage

### Full pipeline
```bash
python orchestrator.py "Add user authentication with JWT tokens"
```

### Single agents
```python
from orchestrator import Orchestrator

orch = Orchestrator()

# Just plan
plan = orch.plan_only("Add search functionality")

# Just build from an existing plan
build = orch.build_only(plan)

# Just test
result = orch.test_only(build, plan)

# Just deploy (requires passing tests)
deploy = orch.deploy_only(build, result)
```

## Agents

| Agent | File | Responsibility |
|-------|------|----------------|
| PlannerAgent | `agents/planner.py` | Turns feature requests into structured task plans |
| BuilderAgent | `agents/builder.py` | Generates code, branches, PRs |
| TesterAgent  | `agents/tester.py`  | Writes & runs unit/integration/e2e tests |
| DeployerAgent | `agents/deployer.py` | CI/CD YAML, env vars, deploy checklist |

## Configuration

All settings are in `.env` (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GITHUB_TOKEN` | GitHub personal access token (repo scope) |
| `GITHUB_REPO` | `owner/repo` — defaults to `Bugman31/AVGJoe` |
| `WRITE_FILES` | Write generated files to temp dir (`true`/`false`) |
| `RUN_TESTS` | Execute pytest in temp workspace (`true`/`false`) |

## Pipeline State

After a run, `pipeline_state.json` is saved in the working directory with the full output of all four agents — useful for debugging or resuming.
