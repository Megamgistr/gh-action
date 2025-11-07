import * as core from "@actions/core";
import {
    GitHubContext,
    isEntityContext
} from "../context";
import {checkHumanActor} from "../validation/actor";
import {writeInitialFeedbackComment} from "../operations/comments/feedback";
import {setupBranch} from "../operations/branch";
import {PrepareJunieOptions} from "./types/junie";
import {prepareJunieInputs} from "./junie-inputs";
import {checkContainsTrigger} from "../validation/trigger";
import {gitAuth} from "../operations/auth";
import {prepareMcpConfig} from "../../mcp/prepare-mcp-config";


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
    }

    await writeInitialFeedbackComment(octokit.rest, context);

    const branchInfo = await setupBranch(octokit, context);

    const mcpConfig = await prepareMcpConfig({
        junieWorkingDir: context.inputs.junieWorkingDir,
        allowedMcpServers: context.inputs.allowedMcpServers ? context.inputs.allowedMcpServers.split(',') : [],
        githubToken: githubToken,
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        currentBranch: branchInfo.currentBranch,
    })

    await prepareJunieInputs(context, mcpConfig)
}

function shouldHandle(context: GitHubContext): boolean {
    if (context.inputs.prompt) {
        return true;
    }
    return isEntityContext(context) && checkContainsTrigger(context);
}