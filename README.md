# Junie GitHub Action

A composite GitHub Action that lets Junie (JetBrains’ autonomous programmer) help on your repository: prepare a task from your GitHub event, run Junie with safe credentials, and optionally open a pull request with the resulting changes.

This action:
- Obtains credentials securely (via OIDC or a provided token) and validates repository permissions.
- Parses the current GitHub event (issues, comments, PRs, workflow/dispatch, schedule, etc.).
- Prepares a task and runs the Junie CLI.
- Either opens a PR (preferred) or commits directly to a working branch.

## Requirements

- GitHub-hosted or self-hosted runners with Node 20+ (composite installs Bun and the Junie CLI on the fly).
- Permissions: the workflow that uses this action should include
  - `id-token: write` (required when you do NOT pass a custom `github_token`, so the action can exchange an OIDC token for an installation token),
  - `contents: write` and `pull-requests: write` (to create branches/PRs).

If you prefer to provide your own token or GitHub App installation token, pass it via the `github_token` input and you may omit `id-token: write`.

## Inputs

- `trigger_phrase` (string, default: `@junie`) — A phrase to listen for in issue/PR comments or description.
- `assignee_trigger` (string) — If the specified user is assigned, the action can trigger.
- `label_trigger` (string, default: `junie`) — If the label is applied, the action can trigger.
- `base_branch` (string) — The base branch for the Junie working branch.

Junie configuration:
- `prompt` (string) — Free-form instructions for Junie (either a direct prompt or a template).
- `junie_version` (string, default: `443.1`) — Junie version to use.
- `junie_work_dir` (string, default: `/tmp/junie-work`) — Work/cache directory.

Auth configuration:
- `junie_api_key` (string) — API key for Junie (CLI auth token).
- `github_token` (string) — A token with repo and PR permissions. Optional if using OIDC exchange.

## Outputs

- `branch_name` — The Junie working branch created by the action.

## Basic usage

Trigger Junie when someone comments with `@junie` on issues or pull requests:

```yaml
name: Junie
on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, edited, reopened, assigned]
  pull_request:
    types: [opened, edited, synchronize, reopened]

permissions:
  id-token: write        # needed if you don’t pass inputs.github_token
  contents: write
  pull-requests: write

jobs:
  run-junie:
    runs-on: ubuntu-latest
    steps:
      - name: Run Junie action
        uses: Megamgistr/gh-action@v1
        with:
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
          # Optional fine-tuning:
          trigger_phrase: "@junie"
          label_trigger: "junie"
          base_branch: main
          prompt: |
            You are Junie. When triggered, analyze the repository and propose a small improvement.
```

## Using a custom GitHub token

If you prefer to supply your own token (PAT or GitHub App installation token), pass it with the `github_token` input. In this case you can omit `id-token: write`:

```yaml
permissions:
  contents: write
  pull-requests: write

steps:
  - uses: Megamgistr/gh-action@v1
    with:
      junie_api_key: ${{ secrets.JUNIE_API_KEY }}
      github_token: ${{ secrets.REPO_TOKEN }}
```

## How it works (high level)

- The composite action installs Bun and project dependencies, then runs a "prepare" script to:
  - Parse the GitHub context (event type, actor, branches, triggers).
  - Obtain a GitHub token either from `inputs.github_token` or via OIDC exchange.
  - Validate that the triggering actor has write permissions to the repository.
  - Generate a task for Junie.
- It installs the Junie CLI and runs it with JSON output.
- Results are parsed; the action either:
  - Creates a PR with the changes (default), or
  - Commits directly to the working branch when configured by the result handler.

## Notes and troubleshooting

- If you see an error about OIDC such as "Could not fetch an OIDC token" or the action exits early with a message about the workflow being outside the default branch, verify that:
  - The workflow has `permissions: id-token: write` when not passing `github_token`.
  - The workflow file is stored on the repository’s default branch (or provide a `github_token`).
- Ensure your `JUNIE_API_KEY` secret is set in the repository or organization.
- You can control when the action triggers via `trigger_phrase`, `assignee_trigger`, and `label_trigger`.

## License

MIT
