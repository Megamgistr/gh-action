# Junie GitHub Action (v1.0)

Powerful GitHub automation with Junie — a coding agent by JetBrains (Early Access Preview). This composite action parses the current GitHub event, prepares a task for Junie CLI, runs Junie, and optionally creates a pull request or commits changes back to the working branch.

Note: Junie is an EAP product and may make mistakes. Review all generated changes. Join the Discord to share feedback: https://jb.gg/junie/github


## What this action does
- Detects triggers from issues, issue comments, pull requests, PR reviews, and automation events.
- Prepares an authenticated Junie task using repository context.
- Installs Junie CLI and executes the task.
- If changes are produced, either:
  - opens a pull request with a templated title/body, or
  - commits directly to the working branch.
- Uploads the working directory as an artifact for inspection.


## Supported events
The action can be used with the following events (see examples below):
- issues
- issue_comment
- pull_request (including pull_request_target)
- pull_request_review
- pull_request_review_comment
- workflow_dispatch
- repository_dispatch
- schedule
- workflow_run

Event parsing logic lives in `src/github/context.ts`.


## Inputs
Defined in `action.yml`.

- trigger_phrase (string)
  - Description: The trigger phrase to look for in comments or issue body.
  - Required: false
  - Default: "@junie"
- assignee_trigger (string)
  - Description: The assignee username that triggers the action (e.g. @junie).
  - Required: false
- label_trigger (string)
  - Description: The label that triggers the action (e.g. junie).
  - Required: false
  - Default: "junie"
- base_branch (string)
  - Description: The branch to use as the source when creating Junie working branch.
  - Required: false
- prompt (string)
  - Description: Instructions for Junie. Can be a direct prompt or custom template.
  - Required: false
  - Default: ""
- junie_version (string)
  - Description: Version of Junie to use (informational, CLI is installed via npm).
  - Required: false
  - Default: "443.1"
- junie_work_dir (string)
  - Description: Directory to use for Junie working files.
  - Required: false
  - Default: "/tmp/junie-work"
- junie_api_key (string)
  - Description: Junie API key.
  - Required: false
- github_token (string)
  - Description: GitHub token with repo and pull request permissions (optional if using the default GITHUB_TOKEN or a GitHub App).
  - Required: false


## Outputs
- branch_name
  - Description: Junie working branch name created for the run.

Additional step-level outputs (from internal steps) you may find useful in your workflows:
- CREATE_PR, COMMIT_MESSAGE, PR_TITLE, PR_BODY, EJ_* values exported during the prepare and handle-results steps.


## Required permissions
Grant the workflow run appropriate permissions (adjust if your repository policies differ):

permissions:
  contents: write
  pull-requests: write
  issues: write

The action validates that the actor (user or app) has write permissions; see `src/github/validation/permissions.ts`.


## Usage
Below are two common setups. Adapt triggers and conditions for your repository.

### 1) Trigger from issues and comments using a phrase or label
This runs when a new issue is opened or an issue comment is created, and proceeds only if the body contains the trigger phrase (default "@junie") or the issue has the given label.

```yaml
name: Junie (issues & comments)
on:
  issues:
    types: [opened, edited, labeled]
  issue_comment:
    types: [created]

jobs:
  junie:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Junie Action
        uses: Megamgistr/gh-action@v1
        with:
          trigger_phrase: "@junie"
          label_trigger: "junie"
          prompt: |
            <issue_description>
            Do what the issue asks.
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
```

### 2) Run on pull requests and reviews
This runs Junie when a PR is opened or synchronized, and when reviews or review comments are submitted.

```yaml
name: Junie (pull requests)
on:
  pull_request:
    types: [opened, synchronize, edited, labeled]
  pull_request_review:
    types: [submitted]
  pull_request_review_comment:
    types: [created]

jobs:
  junie:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Junie Action
        uses: Megamgistr/gh-action@v1
        with:
          trigger_phrase: "@junie"
          prompt: "Please address the review feedback automatically."
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
```

### 3) Manual trigger
Run via workflow dispatch, optionally providing a prompt.

```yaml
name: Junie (manual)
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: "Instructions for Junie"
        required: false
        default: ""

jobs:
  junie:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Junie Action
        uses: Megamgistr/gh-action@v1
        with:
          prompt: ${{ github.event.inputs.prompt }}
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
```


## How it works (high level)
1. Prepare step (`src/entrypoints/prepare.ts`)
   - Parses the event context and validates actor permissions.
   - Prepares inputs for Junie (`src/github/junie/junie-inputs.ts`) and exports step outputs.
2. Run Junie
   - Installs Junie CLI (`npm install -g @jetbrains/junie-cli`).
   - Executes the generated task with the provided API key.
3. Handle results (`src/entrypoints/handle-results.ts`)
   - Parses Junie results and exports `CREATE_PR`, `COMMIT_MESSAGE`, and (when applicable) `PR_TITLE`/`PR_BODY`.
   - Creates a pull request or commits directly, then uploads the working directory artifact.


## Notes
- The action installs Bun and project dependencies automatically.
- Working files are stored in `junie_work_dir` (default `/tmp/junie-work`) and uploaded as an artifact named `junie-working-directory`.
- To force creating a PR vs committing directly, the logic compares base vs working branch in `handle-results.ts`.


## Local development
- TypeScript sources are under `src/`.
- Build with `bun install` and `bun run tsc` or `npm run build` (TypeScript compiles to `dist/`).


## License
MIT (or the license used by this repository).
