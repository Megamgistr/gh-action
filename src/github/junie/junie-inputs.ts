import {
    GitHubContext,
    isIssueCommentEvent, isIssuesEvent, isPullRequestEvent,
    isPullRequestReviewCommentEvent, isPullRequestReviewEvent, ParsedGitHubContext
} from "../context";
import * as core from "@actions/core";
import {JunieRunInputs, JunieTask, PrepareOutputOptions} from "./types/junie";

export async function prepareJunieInputs(
    context: GitHubContext,
): Promise<JunieRunInputs> {
    const junieTask: JunieTask = {}

    // If explicit prompt provided via inputs, prefer it
    if (context.inputs.prompt) {
        junieTask.textTask = {text: context.inputs.prompt}
    }

    // Provide direct links for Junie to fetch additional context
    if ((isIssueCommentEvent(context) && !context.isPR) || isIssuesEvent(context)) {
        junieTask.gitHubIssue = {url: context.payload.issue.html_url}
    }

    if (isIssueCommentEvent(context) && context.isPR) {
        junieTask.gitHubPullRequestComment =
            {
                pullRequestUrl: context.payload.issue.pull_request!.html_url!,
                url: context.payload.comment.html_url
            }
    }

    if (isPullRequestReviewEvent(context)) {
        junieTask.gitHubPullRequestReview = {url: context.payload.review.html_url}
    }

    if (isPullRequestReviewCommentEvent(context)) {
        junieTask.gitHubPullRequestComment =
            {
                pullRequestUrl: context.payload.pull_request.html_url!,
                url: context.payload.comment.html_url
            }
    }

    if (isPullRequestEvent(context)) {
        junieTask.gitHubPullRequest = {url: context.payload.pull_request.html_url}
    }

    // Derive a textual task for Junie from the triggering event when available
    let derivedText = "";
    try {
        if (context.inputs.prompt) {
            derivedText = context.inputs.prompt;
        } else if (isIssuesEvent(context)) {
            const title = context.payload.issue.title ?? "";
            const body = context.payload.issue.body ?? "";
            derivedText = [title, body].filter(Boolean).join("\n\n");
        } else if (isIssueCommentEvent(context)) {
            derivedText = context.payload.comment.body ?? "";
        } else if (isPullRequestEvent(context)) {
            const title = context.payload.pull_request.title ?? "";
            const body = context.payload.pull_request.body ?? "";
            derivedText = [title, body].filter(Boolean).join("\n\n");
        } else if (isPullRequestReviewEvent(context)) {
            derivedText = context.payload.review.body ?? "";
        } else if (isPullRequestReviewCommentEvent(context)) {
            derivedText = context.payload.comment.body ?? "";
        }
    } catch {
        // Best-effort; keep empty if structure differs
        derivedText = derivedText || "";
    }

    return {
        junieIngrazzioToken: context.inputs.appToken,
        junieTask: junieTask,
        junieTaskText: derivedText // Provide Junie with explicit instructions when possible
    }
}

export function exportPrepareOutputs(prepareOutputOptions: PrepareOutputOptions): void {
    // Export actor info
    core.setOutput('EJ_ACTOR_NAME', prepareOutputOptions.context.actor);
    core.setOutput('EJ_ACTOR_EMAIL', prepareOutputOptions.context.actorEmail);

    // Export branch info
    core.setOutput('EJ_BASE_BRANCH', prepareOutputOptions.branchInfo.baseBranch);
    core.setOutput('EJ_WORKING_BRANCH', prepareOutputOptions.branchInfo.workingBranch);

    // Export junie run inputs
    core.setOutput('EJ_AUTH_GITHUB_TOKEN', String(prepareOutputOptions.githubToken));
    core.setOutput('EJ_CLI_TOKEN', String(prepareOutputOptions.junieInputs.junieIngrazzioToken));
    core.setOutput('EJ_TASK', JSON.stringify(prepareOutputOptions.junieInputs.junieTask));
    if (prepareOutputOptions.junieInputs.junieTaskText !== null) {
        core.setOutput('EJ_TASK_TEXT', String(prepareOutputOptions.junieInputs.junieTaskText));
    }

    // Export other outputs
    if (prepareOutputOptions.initCommentId) {
        core.setOutput('EJ_INIT_COMMENT_ID', String(prepareOutputOptions.initCommentId));
    }
    core.setOutput('PREPARE_OUTPUT', JSON.stringify(prepareOutputOptions));
}

export function exportResultsOutputs(createPR: boolean,
                                     commitMessage: string,
                                     prTitle?: string,
                                     prBody?: string): void {
    core.setOutput('CREATE_PR', createPR);
    core.setOutput('COMMIT_MESSAGE', commitMessage);

    if (prTitle && prBody) {
        core.setOutput('PR_TITLE', prTitle);
        core.setOutput('PR_BODY', prBody);
    }
}


