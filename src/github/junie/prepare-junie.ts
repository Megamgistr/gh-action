import {
    GitHubContext,
    isEntityContext
} from "../context";
import {checkHumanActor} from "../validation/actor";
import {createInitialComment} from "../operations/comments/create-initial";
import {setupBranch} from "../operations/branch";
import {PrepareJunieOptions, PrepareJunieResult} from "./types/junie";
import {exportJunieInputsToEnv, prepareJunieInputs} from "./junie-inputs";


export async function prepare({
                                  context,
                                  octokit,
                                  githubToken,
                              }: PrepareJunieOptions): Promise<PrepareJunieResult> {
    if (!canHandle(context)) {
        throw new Error(`We don't support this event yet. ${context.payload}`);
    }

    let initCommentId
    if (isEntityContext(context)) {
        await checkHumanActor(octokit.rest, context);
        const initCommentData = await createInitialComment(octokit.rest, context);
        initCommentId = initCommentData.id;
    }
    const branchInfo = await setupBranch(octokit, context);
    const junieInputs = await prepareJunieInputs(githubToken, context)
    exportJunieInputsToEnv(junieInputs)
    return {
        initCommentId,
        branchInfo,
    };
}

function canHandle(context: GitHubContext): boolean {
    if (context.inputs.prompt) {
        return true;
    }
    return !!isEntityContext(context);
}