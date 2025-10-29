import * as core from "@actions/core";
import {
    GitHubContext,
    isEntityContext
} from "../context";
import {checkHumanActor} from "../validation/actor";
import {writeInitialFeedbackComment} from "../operations/comments/feedback";
import {setupBranch} from "../operations/branch";
import {PrepareJunieOptions} from "./types/junie";
import {exportPrepareOutputs, prepareJunieInputs} from "./junie-inputs";
import {checkContainsTrigger} from "../validation/trigger";


export async function prepare({
                                  context,
                                  octokit,
                                  githubToken,
                                  canCreatePR
                              }: PrepareJunieOptions) {
    if (!shouldHandle(context)) {
        console.log("No need to run junie")
        core.setOutput('SHOULD_SKIP', 'true');
        return;
    }
    core.setOutput('SHOULD_SKIP', 'false');

    let initCommentId
    if (isEntityContext(context)) {
        await checkHumanActor(octokit.rest, context);
        const initCommentData = await writeInitialFeedbackComment(octokit.rest, context);
        initCommentId = initCommentData.id;
    }
    const branchInfo = await setupBranch(octokit, context);
    const junieInputs = await prepareJunieInputs(context)
    exportPrepareOutputs({
        context,
        githubToken,
        junieInputs,
        branchInfo,
        initCommentId,
        canCreatePR
    })
}

function shouldHandle(context: GitHubContext): boolean {
    if (context.inputs.prompt) {
        return true;
    }
    return isEntityContext(context) && checkContainsTrigger(context);
}