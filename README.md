# Junie GitHub Action

Powerful GitHub automation with Junie, JetBrains’ coding agent. This composite action listens to GitHub events (issues, issue comments, PRs, PR reviews, etc.), prepares a task for Junie, runs the Junie CLI, and then optionally opens a pull request or commits changes back to the repository.


## How it works
1. Install dependencies with Bun.
2. Prepare phase:
   - Parses the GitHub event context and validates permissions.
   - Determines or creates a working branch (junie/<entity>).
   - Prepares inputs for Junie based on the event (issue/PR/comment).
   - Exports outputs for subsequent steps.
3. Run Junie via the Junie CLI.
4. Handle results:
   - If changes are made on a new branch, open a PR.
   - Otherwise, commit directly to the existing branch.


## Inputs
These map directly to `action.yml`.

- trigger_phrase (string, default: "@junie")
  The trigger phrase to look for in comments or issue body.
- assignee_trigger (string)
  The assignee username that triggers the action (e.g. `@junie`).
- label_trigger (string, default: "junie")
  The label that triggers the action.
- base_branch (string)
  The branch to use as the source when creating the Junie working branch.
- prompt (string)
  Instructions for Junie. Can be a direct prompt or custom template.
- junie_version (string, default: "443.1")
  Version of Junie to use.
- junie_work_dir (string, default: "/tmp/junie-work")
  Directory to use for Junie working files (cache/output).
- junie_api_key (string)
  Junie API key used to authenticate the CLI.
- github_token (string)
  GitHub token with repo/PR permissions. Optional if using the GitHub App path.


## Outputs
- branch_name
  The working branch used by the action (`junie/...`).

Internal step outputs (exposed to later steps within this action):
- EJ_BASE_BRANCH, EJ_WORKING_BRANCH, EJ_AUTH_GITHUB_TOKEN, EJ_CLI_TOKEN, EJ_TASK, EJ_TASK_TEXT, EJ_INIT_COMMENT_ID, PREPARE_OUTPUT
- CREATE_PR, COMMIT_MESSAGE, PR_TITLE, PR_BODY


## Required permissions
This action can authenticate in two ways:

1) Using the built‑in OIDC + GitHub App exchange (recommended)
- workflow permissions:
  - id-token: write
  - contents: write
  - pull-requests: write

2) Using a provided token
- Pass `github_token` input that has repo/PR permissions.

The action verifies that the human actor has write/admin permissions on the repository for entity events (issues/PRs).


## Supported events
- issues
- issue_comment
- pull_request / pull_request_target
- pull_request_review
- pull_request_review_comment
- workflow_dispatch
- repository_dispatch
- schedule
- workflow_run


## Usage examples

### Respond to issue comments and issues
```yaml
name: Junie on Issues and Comments
on:
  issues:
    types: [opened, edited, labeled, assigned]
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  run-junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Junie
        uses: Megamgistr/gh-action@main
        with:
          trigger_phrase: "@junie"
          label_trigger: "junie"
          junie_work_dir: "/tmp/junie-work"
          # If you want to override app-based auth, provide your token:
          # github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Run with a direct prompt (workflow_dispatch)
```yaml
name: Junie Prompt
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: "Prompt for Junie"
        required: true
        type: string

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  run-junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Junie with Prompt
        uses: Megamgistr/gh-action@main
        with:
          prompt: ${{ inputs.prompt }}
```

### Notes
- The action will create a comment like "Junie is working…" on supported entity events and will work in a branch prefixed with `junie/`.
- When running on an existing PR’s branch, the action may commit directly to that branch; otherwise, it will create a new branch and open a PR.
- You can provide `ASSIGNEE_TRIGGER` or `LABEL_TRIGGER` to gate when Junie should run.


## Development

Install dependencies and build:
```bash
bun install
bun run build
```

Entry points:
- `src/entrypoints/prepare.ts` – prepares context, branch, and inputs for Junie
- `src/entrypoints/handle-results.ts` – processes Junie results and exports outputs

Key modules:
- `src/github/context.ts` – parses GitHub context and inputs
- `src/github/operations/branch.ts` – working branch logic
- `src/github/operations/comments/feedback.ts` – initial feedback comment
- `src/github/junie/*` – Junie input/output handling

