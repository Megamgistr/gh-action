import {
    GitHubContext,
    isIssueCommentEvent, isIssuesEvent, isPullRequestEvent, isPullRequestReviewEvent, ParsedGitHubContext
} from "../context";
import * as core from "@actions/core";
import {JunieRunInputs, JunieTask} from "./types/junie";

export async function prepareJunieInputs(
    ghToken: string,
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
        ghToken: ghToken,
        junieIngrazzioToken: context.inputs.appToken,
        junieTask: junieTask,
        junieTaskText: ""
    }
}

export function exportJunieInputsToEnv(inputs: JunieRunInputs): void {
    if (inputs.ghToken !== null) {
        core.setOutput('GH_TOKEN', String(inputs.ghToken));
    }
    if ( inputs.junieIngrazzioToken !== null) {
        core.setOutput('JUNIE_INGRAZZIO_TOKEN', String(inputs.junieIngrazzioToken));
    }
    if (inputs.junieTask !== null) {
        core.setOutput('JUNIE_TASK', JSON.stringify(inputs.junieTask));
    }
    if (inputs.junieTaskText !== null) {
        core.setOutput('JUNIE_TASK_TEXT', String(inputs.junieTaskText));
    }
}