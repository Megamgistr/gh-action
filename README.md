# Junie GitHub Action

Automate GitHub issues and pull requests with Junie — JetBrains’ coding agent. This action watches issues/PRs for a trigger and, when activated, gathers GitHub context, prepares a task, runs Junie CLI, and optionally commits or opens a PR with the generated changes.

> Early Access Preview: Junie is evolving and may make mistakes. Review changes before merging.

## Key features
- Zero-config getting started — works on issues and PRs
- Trigger by phrase, assignee, or label
- Collects rich repo context (issue/PR body, comments, review comments, changed files)
- Runs Junie CLI in a temporary working directory
- Creates a PR or commits directly to a working branch
- Uploads Junie’s working directory as an artifact for auditing

## Usage
Add a workflow in `.github/workflows/junie.yml`:

```yaml
name: Junie
on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, edited]
  pull_request_target:
    types: [opened, edited]

jobs:
  run-junie:
    permissions:
      contents: write          # create commits/branches
      pull-requests: write     # open PRs
      issues: write            # comment if needed
      actions: read
    runs-on: ubuntu-latest
    steps:
      - uses: Megamgistr/gh-action@v1
        with:
          # Optional — see Inputs for full list
          prompt: |
            You are Junie. Follow our repository conventions. Prefer small, reviewable PRs.
          trigger_phrase: "@junie"     # phrase in issue/PR/comment to trigger
          label_trigger: "junie"        # or label to trigger
          assignee_trigger: "junie"     # or assignee to trigger
          base_branch: "main"           # base for the working branch
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

Notes:
- This action installs Bun and project dependencies, then runs small TypeScript entrypoints that prepare/run Junie.
- By default it uses the workflow’s `GITHUB_TOKEN`. You can override via `github_token` input.

## Inputs
The action exposes the following inputs (defaults shown where applicable):

- `trigger_phrase` (default: `"@junie"`)
  - Phrase in issue/PR body or comments that triggers the run.
- `assignee_trigger` (optional)
  - If set, action triggers when the specified user is assigned (e.g., `junie`).
- `label_trigger` (default: `"junie"`)
  - If set, action triggers when the label is present.
- `base_branch` (optional)
  - Base branch for creating the working branch.
- `prompt` (default: empty)
  - Custom instructions appended to the generated prompt.
- `junie_version` (default: `"443.1"`)
  - Version hint for Junie (informational; actual CLI installed from npm).
- `junie_work_dir` (default: `"/tmp/junie-work"`)
  - Cache/work directory on the runner used by Junie CLI.
- `junie_api_key` (optional)
  - API key for Junie CLI authentication (mapped to env `APP_TOKEN`/`CLI_TOKEN`).
- `github_token` (optional)
  - Token with repo/PR permissions. If omitted, the default workflow token is used.

## Outputs
- `branch_name`
  - The created working branch name (from the prepare step).

## How it works (high level)
1. Install Bun and project dependencies.
2. Prepare: `src/entrypoints/prepare.ts`
   - Resolves token and permissions, parses GitHub event/context, validates write access, and assembles the task for Junie.
3. Install Junie CLI: `@jetbrains/junie-cli`.
4. Run Junie with context and prompt; produce structured results.
5. Handle results: `src/entrypoints/handle-results.ts`
   - Either create a PR (via `peter-evans/create-pull-request`) or commit directly.
6. Upload working directory as artifact and revoke the temporary app token if applicable.

## Required permissions
Recommended minimal permissions on the job or workflow:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  actions: read
```

## Security considerations
- Prefer using `secrets.JUNIE_API_KEY` instead of plain-text values.
- When running on `pull_request_target`, ensure you understand the security model of running with elevated permissions on code from forks.
- The action revokes temporary installation tokens at the end of the run when possible.

## Development
- Source code lives under `src/` and is written in TypeScript.
- Build with `bun install` and `bun x tsc` or `npm run build` if you have Node/TypeScript locally.
- Entrypoints are invoked directly by the action; you don’t need to compile for GitHub-hosted runners because Bun runs TS.

## Troubleshooting
- "Actor does not have write permissions" — ensure the workflow job has `contents: write` (and `pull-requests: write` if you want PRs).
- No run when commenting — check that `trigger_phrase`, `label_trigger`, or `assignee_trigger` are configured as you expect and that your workflow `on:` section listens to the corresponding events.
- Junie didn’t create a PR — see the job logs for the "Handle Junie results" step; the action may have committed directly to the working branch if configured.

## Versioning
This repository is labeled as `Junie GH Action v1.0` in `action.yml`. Use a tagged release in your workflow for stability.

---
Made with ❤️ by JetBrains & contributors.