# Junie GitHub Action (Early Access Preview)

Automate repo chores and lightweight coding tasks with Junie — JetBrains’ coding agent — directly from GitHub issues, PRs, and comments.

This composite action parses GitHub context, validates permissions, prepares a working branch, calls Junie CLI, and then either opens a pull request or commits changes to a branch, depending on the situation. It can be triggered by phrases like "@junie", labels, assignees, or run manually with a custom prompt.

Important notes
- Early Access Preview: Junie can make mistakes — review generated changes before merging.
- OIDC-first auth: By default the action exchanges a GitHub OIDC token for a short‑lived GitHub App token. You can override this with a classic token via the `github_token` input.
- Default branch workflows: The OIDC exchange requires the workflow file to live in the repository’s default branch. If not, the action will skip. You may instead supply `github_token`.


## How it works
1. Prepare step parses event/context and validates the actor has write permissions.
2. If triggered (via phrase/label/assignee) or an explicit `prompt` is provided, the action:
   - Creates/uses a working branch under `junie/<something>` from `base_branch` (or the event base).
   - Builds a task for Junie (issue/PR/comment/review URL and/or `prompt`).
   - Posts an initial "Junie is working…" comment on entity events.
3. Runs Junie CLI with those inputs.
4. Collects results and either:
   - Creates a PR (if the working branch differs from the base), or
   - Commits directly to the working branch.
5. Uploads the Junie working directory as an artifact for inspection.


## Inputs
All inputs are optional unless noted.

- trigger_phrase (string, default: "@junie")
  - Exact phrase to look for in issue/PR titles/bodies and comments to trigger the action.
- assignee_trigger (string)
  - Assignee username (e.g. `@junie`) that triggers the action when an issue is assigned to that user.
- label_trigger (string, default: "junie")
  - Label name that triggers the action on issues when added.
- base_branch (string)
  - Base branch to use when creating the Junie working branch.

Junie configuration
- prompt (string)
  - Free‑form instructions for Junie. When provided, the action will run even outside entity events (e.g., workflow_dispatch).
- junie_version (string, default: "443.1")
  - Version hint for Junie. Currently informational; CLI is installed via npm.
- junie_work_dir (string, default: "/tmp/junie-work")
  - Directory used as Junie’s cache/output. Archived and uploaded as an artifact at the end.

Auth configuration
- junie_api_key (string)
  - API key used by Junie CLI (exported to CLI as authentication token).
- github_token (string)
  - Token with repo/PR permissions to act on your behalf. If omitted, the action requests an OIDC token and exchanges it for a GitHub App token automatically.


## Outputs
- branch_name
  - The name of the Junie working branch that was prepared: `${{ steps.prepare.outputs.WORKING_BRANCH }}`.


## Required permissions
Set explicit permissions in your workflow. Minimum recommended:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write   # required for OIDC exchange unless you pass github_token
```


## Usage

Basic: trigger by comment phrase or label
```yaml
name: Junie
on:
  issues:
    types: [opened, labeled, assigned]
  issue_comment:
    types: [created]
  pull_request:
    types: [opened, edited, synchronize]
  pull_request_review:
    types: [submitted, edited]
  pull_request_review_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write

jobs:
  junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Junie
        uses: Megamgistr/gh-action@v1
        with:
          trigger_phrase: "@junie"
          label_trigger: "junie"
          assignee_trigger: "@junie"
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
          # github_token: ${{ secrets.GH_PAT }}  # optionally override OIDC/App token with your own
```

Manual run with a prompt (workflow_dispatch)
```yaml
name: Junie (manual)
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: "What should Junie do?"
        required: true

permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write

jobs:
  junie:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Megamgistr/gh-action@v1
        with:
          prompt: ${{ github.event.inputs.prompt }}
          junie_api_key: ${{ secrets.JUNIE_API_KEY }}
```

Examples of triggers
- Comment: "@junie please refactor the utils module"
- Issue title/body contains "@junie"
- Issue labeled with `junie`
- Issue assigned to the user specified in `assignee_trigger`


## What gets created
- Working branch: `junie/<...>` from the selected base.
- Initial comment: "Junie is working…" on issues/PRs where applicable.
- Pull request: Created when the working branch differs from the base; otherwise a direct commit to the working branch.
- Artifact: An archive of `junie_work_dir` for debugging.


## Troubleshooting
- Action skipped because the workflow is not in the default branch
  - Cause: OIDC token exchange requires the workflow file to be on the default branch.
  - Fix: Move the workflow to the default branch, or pass `github_token` to override.
- Actor does not have write permissions
  - Cause: The actor triggering the run is neither admin nor has write access.
  - Fix: Ensure the user/app has at least write permissions for the repo.
- Trigger phrase not detected
  - The phrase is matched exactly as a separate word. Defaults to `@junie`. Check labels/assignee triggers too.


## Development
- Runtime: Composite action using Bun scripts and Node-based Junie CLI.
- Entrypoints: `src/entrypoints/prepare.ts` and `src/entrypoints/handle-results.ts`.
- Key pieces:
  - Context/trigger logic: `src/github/context.ts`, `src/github/validation/trigger.ts`
  - Permission checks: `src/github/validation/permissions.ts`
  - Token setup (OIDC → GitHub App): `src/github/token.ts`
  - Branch/PR ops: `src/github/operations/*`
  - Junie wiring: `src/github/junie/*`


## License
Apache-2.0 or project’s chosen license. Update this section if a specific license is applied.
