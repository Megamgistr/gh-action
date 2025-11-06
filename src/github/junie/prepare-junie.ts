import * as core from "@actions/core";
import {
    GitHubContext, isCheckSuiteEvent,
    isEntityContext
} from "../context";
import {checkHumanActor} from "../validation/actor";
import {writeInitialFeedbackComment} from "../operations/comments/feedback";
import {setupBranch} from "../operations/branch";
import {PrepareJunieOptions} from "./types/junie";
import {prepareJunieInputs} from "./junie-inputs";
import {checkContainsTrigger} from "../validation/trigger";
import {gitAuth} from "../operations/auth";


export async function prepare({
                                  context,
                                  octokit,
                                  githubToken,
                              }: PrepareJunieOptions) {
    if (!shouldHandle(context)) {
        console.log("No need to run junie")
        core.setOutput('SHOULD_SKIP', 'true');
        return;
    }
    core.setOutput('SHOULD_SKIP', 'false');

    await gitAuth(githubToken, context)

    if (isEntityContext(context)) {
        await checkHumanActor(octokit.rest, context);
        await writeInitialFeedbackComment(octokit.rest, context);
    }

    const branchInfo = await setupBranch(octokit, context);
    await prepareJunieInputs(context, branchInfo)
}

function shouldHandle(context: GitHubContext): boolean {
    if (context.inputs.prompt) {
        return true;
    }
    // Support only check_suite events for PRs
    if (isCheckSuiteEvent(context) && context.isPR) {
        return true;
    }
    return isEntityContext(context) && checkContainsTrigger(context);
}