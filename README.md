# Junie GitHub Action

Automate GitHub workflows with Junie — JetBrains’ coding agent (Early Access Preview). This action listens to issues, pull requests, and comments, prepares a working branch, runs Junie CLI on your repository, and either opens a pull request or commits changes directly.

> Note: Junie is in Early Access Preview. Review all generated changes before merging.

## What this action does

- Detects a trigger to run Junie:
  - A direct prompt via the `prompt` input, or
  - A trigger phrase in an Issue/PR description or comment (default `@junie`), or
  - Optional assignee/label triggers.
- Verifies the actor is human (not a bot) and has write permissions.
- Creates/uses a working branch from the configured base branch.
- Runs `@jetbrains/junie-cli` with the task derived from the context (issue/PR/comment) or the provided prompt.
- Posts an initial feedback comment, uploads the working directory as an artifact, and prepares commit/PR metadata.
- Either opens a PR or commits directly depending on whether a separate working branch is used.
- Revokes the temporary GitHub App token at the end of the run.

## Inputs

All inputs are optional unless noted.

- `trigger_phrase` (string): Phrase to look for in issue/PR text or comments. Default: `@junie`.
- `assignee_trigger` (string): If set, action triggers when the assignee matches this username (e.g., `@junie`).
- `label_trigger` (string): If set, action triggers when the label matches. Default: `junie`.
- `base_branch` (string): Branch to use as the source when creating the working branch.

Junie configuration:
- `prompt` (string): Direct instructions for Junie. If provided, Junie runs regardless of triggers.
- `junie_version` (string): Version of Junie to use. Default: `443.1`. (Currently handled by installing `@jetbrains/junie-cli` globally.)
- `junie_work_dir` (string): Directory for Junie working files. Default: `/tmp/junie-work`.

Auth configuration:
- `junie_api_key` (string): API key for Junie.
- `github_token` (string): Custom GitHub token with repo/PR permissions. If omitted, the action will obtain an app token via OIDC.

## Outputs

- `branch_name`: The working branch name created/used by the action.

Additionally, step `Handle Junie results` exposes these outputs you can capture from the step with `id: junie-run-results`:
- `CREATE_PR` (boolean): Whether a PR should be created.
- `COMMIT_MESSAGE` (string): Commit message composed from Junie summary.
- `PR_TITLE` (string, when applicable): Suggested PR title.
- `PR_BODY` (string, when applicable): Suggested PR body.

## Required permissions

If you rely on OIDC (no `github_token` provided), grant these workflow permissions:

```yaml
permissions:
  id-token: write   # required to fetch an OIDC token
  contents: write   # create branches/commits
  pull-requests: write
  issues: write     # post feedback comments
```

If you provide a custom `github_token`, ensure it has equivalent repository and PR permissions.

## Usage

### 1) React to an Issue/PR comment with the trigger phrase

```yaml
name: Junie on comments
on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, edited]

jobs:
  junie:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - name: Run Junie action
        uses: Megamgistr/gh-action@v1
        with:
          trigger_phrase: "@junie"
          label_trigger: "junie"
          # Optional: provide token explicitly
          # github_token: ${{ secrets.GH_TOKEN_WITH_REPO_SCOPE }}
```

### 2) Run Junie with a direct prompt (manual trigger or scheduled)

```yaml
name: Junie prompt
on:
  workflow_dispatch: {}
  schedule:
    - cron: "0 9 * * 1"  # Mondays at 09:00 UTC

jobs:
  junie:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - name: Run Junie with prompt
        uses: Megamgistr/gh-action@v1
        with:
          prompt: "Scan the repo and create a contributing guide."
          base_branch: main
          junie_work_dir: /tmp/junie
```

### 3) Capture PR/commit metadata from the action

```yaml
jobs:
  junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Junie
        id: run
        uses: Megamgistr/gh-action@v1
      - name: Use outputs
        if: steps.run.outputs.CREATE_PR == 'true'
        run: |
          echo "Title:  ${{ steps.run.outputs.PR_TITLE }}"
          echo "Body:   ${{ steps.run.outputs.PR_BODY }}"
          echo "Commit: ${{ steps.run.outputs.COMMIT_MESSAGE }}"
```

## How it works (high level)

1. Install Bun and dependencies.
2. Prepare step (`src/entrypoints/prepare.ts`):
   - Build context from the GitHub event, validate triggers, check actor permissions, create/choose working branch, compute Junie inputs, and set outputs.
3. Install Junie CLI (`@jetbrains/junie-cli`).
4. Run Junie with computed task and tokens.
5. Handle results (`src/entrypoints/handle-results.ts`):
   - Parse results, craft commit message, PR title/body, and set step outputs.
6. Create PR with `peter-evans/create-pull-request@v7` or commit directly.
7. Upload working dir as an artifact and revoke temporary app token.

## Troubleshooting

- Error: "Could not fetch an OIDC token... add `id-token: write`" — Ensure workflow permissions include `id-token: write` and the workflow file is on the repository’s default branch.
- "Action skipped due to workflow file is not in the default branch" — Move the workflow file to the default branch or provide a custom `github_token`.
- "Actor does not have write permissions to the repository" — The triggering user must have write access for branch/PR operations.
- Nothing happens on comment — Confirm the comment contains the trigger phrase (default `@junie`) or supply a `prompt` input.

## Local development

This is a composite action. To work on it:

```bash
bun install
bun run ./src/entrypoints/prepare.ts
bun run ./src/entrypoints/handle-results.ts
```

TypeScript is compiled by `tsc` via `npm run build` if needed for local checks. The action itself runs TypeScript via Bun in GitHub Actions.

---

Made with ❤️ by JetBrains Labs. Feedback welcome: https://jb.gg/junie/github
