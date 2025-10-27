import {
    GitHubContext,
    isEntityContext
} from "../context";
import {checkHumanActor} from "../validation/actor";
import {writeInitialFeedbackComment} from "../operations/comments/feedback";
import {setupBranch} from "../operations/branch";
import {PrepareJunieOptions} from "./types/junie";
import {exportPrepareOutputs, prepareJunieInputs} from "./junie-inputs";


export async function prepare({
                                  context,
                                  octokit,
                                  githubToken,
                              }: PrepareJunieOptions) {
    if (!canHandle(context)) {
        throw new Error(`We don't support this event yet. ${context.payload}`);
    }

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
        initCommentId
    })
}

function canHandle(context: GitHubContext): boolean {
    if (context.inputs.prompt) {
        return true;
    }
    return !!isEntityContext(context);
}