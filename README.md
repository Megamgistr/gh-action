# Junie GitHub Action (Early Access)

Powerful GitHub automation powered by Junie, the coding agent by JetBrains. This action can watch issues and pull requests for a trigger (for example, the phrase "@junie"), spin up a working branch, run Junie against the referenced entity, and either open a pull request or commit directly back to the repository. It also uploads Junie’s working directory as an artifact so you can inspect the full run.

Important: This is an Early Access Preview. Junie is still learning and may make mistakes. Please review changes before merging.


## What this action does

On supported GitHub events, the action:
- Validates the actor has write permissions (for entity events).
- Determines whether to run based on configured triggers (phrase, label, assignee) or a provided prompt input.
- Sets up a working branch:
  - If running on an existing PR branch, it checks out that branch.
  - Otherwise, it creates a new branch with the prefix `junie/` (for example, `junie/issue-123`).
- Installs Junie CLI and runs it with context derived from the event (issue, PR, review, etc.).
- Posts an initial feedback comment on the issue/PR.
- Either creates a pull request with a templated title/body or commits changes directly.
- Uploads the Junie working directory as an artifact for inspection.


## Supported events and triggers

Entity events (require write permission checks):
- `issues` (opened, labeled, assigned)
- `issue_comment`
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment`

Automation events:
- `workflow_dispatch`
- `repository_dispatch`
- `schedule`
- `workflow_run`

Trigger conditions (checked for entity events):
- Trigger phrase in the title/body/comment (default: `@junie`).
- Matching label on issues (exact match).
- Assigned user equals the configured assignee trigger.

You can also bypass triggers entirely by providing a non-empty `prompt` input; in that case the action runs unconditionally for that event.


## Inputs

The composite action inputs are defined in `action.yml`.

- `trigger_phrase` (string, optional)
  - The exact phrase to look for in issue/PR titles, bodies, comments, reviews.
  - Default: `@junie`
- `assignee_trigger` (string, optional)
  - If set, the action runs when the issue is assigned to this user (you can pass with or without the leading `@`).
- `label_trigger` (string, optional)
  - If set, the action runs when an issue is labeled with this exact label.
  - Default: `junie`
- `base_branch` (string, optional)
  - Base branch to use when creating a new working branch. If omitted, the repository’s default branch is used.

Junie configuration:
- `prompt` (string, optional)
  - Free-form instructions for Junie. If provided, the action will run even if no other trigger is present.
  - Default: empty
- `junie_version` (string, optional)
  - Version of Junie to use.
  - Default: `443.1`
- `junie_work_dir` (string, optional)
  - Where to store Junie’s working files/cache on the runner.
  - Default: `/tmp/junie-work`

Auth configuration:
- `junie_api_key` (string, optional)
  - API key for Junie. If not set, the action attempts to obtain a GitHub App token using OIDC (see Permissions below).
- `github_token` (string, optional)
  - Custom GitHub token to use for repository operations (alternative to OIDC/App token). If provided, it overrides the automatically acquired token.


## Outputs

- `branch_name`
  - The resulting Junie working branch name.

Internally, the action also sets several step-level outputs (for PR title/body and commit message) used by the workflow steps, but the only public action output is `branch_name`.


## Required permissions

To allow the action to authenticate and perform repository operations, set permissions on your workflow/job:

```yaml
permissions:
  id-token: write      # Required to fetch OIDC token for GitHub App exchange (if not using github_token)
  contents: write      # Required to push commits / create branches
  pull-requests: write # Required to create PRs
  issues: write        # Required to create issue/PR comments
```

Notes:
- If you supply `github_token`, the `id-token: write` scope is not required.
- If your workflow file is not located on the repository’s default branch, the action may skip with a validation warning.


## Usage examples

1) Run automatically when someone comments with the trigger phrase on issues/PRs

```yaml
name: Junie on comments
on:
  issue_comment:
    types: [created, edited]
  pull_request_review:
    types: [submitted, edited]
permissions:
  id-token: write
  contents: write
  pull-requests: write
  issues: write
jobs:
  run-junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Megamgistr/gh-action@v1
        with:
          trigger_phrase: "@junie"
          label_trigger: "junie"
```

2) Force a run with a direct prompt (no trigger needed)

```yaml
name: Junie prompt run
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: "Instructions for Junie"
        required: true
        type: string
permissions:
  id-token: write
  contents: write
  pull-requests: write
  issues: write
jobs:
  run-junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Megamgistr/gh-action@v1
        with:
          prompt: ${{ inputs.prompt }}
```

3) Override GitHub token (use your own PAT or App token)

```yaml
jobs:
  run-junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Megamgistr/gh-action@v1
        with:
          github_token: ${{ secrets.REPO_WRITE_TOKEN }}
```


## How branching works

- For PR-related events with an existing target branch, the action checks out that branch and works there.
- Otherwise, it creates a new branch from the base branch using the prefix `junie/` and a suffix reflecting the context, for example:
  - `junie/issue-123`
  - `junie/pr-45`
  - `junie/workflow_dispatch-<uuid>`

The created branch name is exposed as the `branch_name` output.


## Artifacts

After a run, the action uploads a `junie-working-directory` artifact that contains a tar.gz archive of the Junie work directory. You can download and inspect it to review what happened during the run.


## Troubleshooting

- Prepare step failed with error: Could not fetch an OIDC token…
  - Ensure your workflow/job includes `permissions: id-token: write`.
- Skipping action due to workflow validation: workflow is not in the default branch
  - The action acquires tokens using a validation endpoint that can require workflows to reside on the default branch. Move the workflow to the default branch or provide `github_token` to bypass OIDC.
- Actor does not have write permissions to the repository
  - The actor that triggered the event needs write/admin access for entity events. Adjust repository permissions or trigger the action from an authorized user.
- No trigger was met for @junie
  - Add the trigger phrase to the title/body/comment, add the configured label, assign the configured user, or provide a non-empty `prompt`.


## Development

- Runtime: Bun is installed via `oven-sh/setup-bun`.
- Build: `bun install` then `bun run src/entrypoints/prepare.ts` / `bun run src/entrypoints/handle-results.ts` for local dry-runs with appropriate environment variables.
- TypeScript configuration is under `tsconfig.json`.


## License

This repository is provided as part of an Early Access Preview. See the repository’s license terms if present.