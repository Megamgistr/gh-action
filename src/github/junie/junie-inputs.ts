import {
    GitHubContext,
    isIssueCommentEvent, isIssuesEvent, isPullRequestEvent,
    isPullRequestReviewCommentEvent, isPullRequestReviewEvent, ParsedGitHubContext
} from "../context";
import * as core from "@actions/core";
import {JunieTask} from "./types/junie";
import {ActionType} from "../../entrypoints/handle-results";

export async function prepareJunieInputs(
    context: GitHubContext,
) {
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

    core.setOutput('EJ_CLI_TOKEN', context.inputs.appToken);
    core.setOutput('EJ_TASK', JSON.stringify(junieTask));
    // core.setOutput('EJ_TASK_TEXT', junieTaskText);
}

export function exportResultsOutputs(junieTitle: string,
                                     junieSummary: string,
                                     commitMessage?: string,
                                     prTitle?: string,
                                     prBody?: string): void {
    core.setOutput('JUNIE_TITLE', junieTitle);
    core.setOutput('JUNIE_SUMMARY', junieSummary);

    if (commitMessage) {
        core.setOutput('COMMIT_MESSAGE', commitMessage);
    }

    if (prTitle && prBody) {
        core.setOutput('PR_TITLE', prTitle);
        core.setOutput('PR_BODY', prBody);
    }
}


