import {
    GitHubContext,
    isIssueCommentEvent, isIssuesEvent, isPullRequestEvent, isPullRequestReviewEvent, ParsedGitHubContext
} from "../context";
import * as core from "@actions/core";
import {JunieRunInputs, JunieTask, PrepareOutputOptions} from "./types/junie";

export async function prepareJunieInputs(
    context: GitHubContext,
): Promise<JunieRunInputs> {
    const junieTask: JunieTask = {}

    if (context.inputs.prompt) {
        junieTask.textTask = {text: context.inputs.prompt}
    }

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

    if (isPullRequestEvent(context)) {
        junieTask.gitHubPullRequest = {url: context.payload.pull_request.html_url}
    }

    return {
        junieIngrazzioToken: context.inputs.appToken,
        junieTask: junieTask,
        junieTaskText: "" // If we create a prompt here
    }
}

export function exportPrepareOutputs(prepareOutputOptions: PrepareOutputOptions): void {
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


