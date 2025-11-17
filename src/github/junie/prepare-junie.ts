import * as core from "@actions/core";
import {
    GitHubContext,
    isEntityContext, isPullRequestEvent, isPushEvent
} from "../context";
import {checkHumanActor} from "../validation/actor";
import {writeInitialFeedbackComment} from "../operations/comments/feedback";
import {setupBranch} from "../operations/branch";
import {PrepareJunieOptions} from "./types/junie";
import {checkContainsTrigger} from "../validation/trigger";
import {gitAuth} from "../operations/auth";
import {prepareMcpConfig} from "../../mcp/prepare-mcp-config";
import {checkWritePermissions} from "../validation/permissions";
import {Octokits} from "../api/client";
import {prepareJunieTask} from "./junie-tasks";
import {prepareJunieCLIToken} from "./junie-token";


export async function prepare({
                                  context,
                                  octokit,
                                  githubToken,
                              }: PrepareJunieOptions) {
    const handle = await shouldHandle(context, octokit)

    if (!handle) {
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

    await prepareMcpConfig({
        junieWorkingDir: context.inputs.junieWorkingDir,
        allowedMcpServers: context.inputs.allowedMcpServers ? context.inputs.allowedMcpServers.split(',') : [],
        githubToken: githubToken,
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        currentBranch: branchInfo.currentBranch,
    })

    await prepareJunieCLIToken(context)

    await prepareJunieTask(context, branchInfo)
}

async function shouldHandle(context: GitHubContext, octokit: Octokits): Promise<boolean> {
    if (isEntityContext(context)) {
        const hasWritePermissions = await checkWritePermissions(
            octokit.rest,
            context,
        );
        if (!hasWritePermissions) {
            console.log("No write permissions, skipping junie");
            return false;
        }
    }

    if (context.inputs.resolveConflicts) {
        return await hasConflicts(context, octokit)
    }

    if (context.inputs.prompt) {
        return true;
    }
    return isEntityContext(context) && checkContainsTrigger(context);
}


async function hasConflicts(context: GitHubContext, octokit: Octokits): Promise<boolean> {
    console.log('Checking for conflicts...')
    const maxAttempts = 10
    const delay = 6000
    const {owner, name} = context.payload.repository
    let attempt = 0
    let state = 'unknown'
    let result = false

    while (attempt < maxAttempts) {
        if (isPullRequestEvent(context)) {
            const pr = await octokit.rest.pulls.get({
                owner: owner.login,
                repo: name,
                pull_number: context.entityNumber!,
            })
            state = pr.data.mergeable_state
        } else if (isPushEvent(context)) {
            const branch = context.payload.ref.replace("refs/heads/", "");

            const prs = await octokit.rest.pulls.list({
                owner: owner.login,
                repo: name,
                head: `${owner}:${branch}`,
                state: "open"
            });

            if (prs.data.length > 0) {
                const prNumber = prs.data[0].number;
                const pr = await octokit.rest.pulls.get({
                    owner: owner.login,
                    repo: name,
                    pull_number: prNumber
                });
                state = pr.data.mergeable_state;
            }
            {
                state = 'no prs'
            }
        } else {
            throw new Error('Resolve conflicts only works for pull requests')
        }
        console.log(`Attempt ${attempt}: Mergeable state is ${state}`)

        if (state == 'unknown') {
            attempt++
            await new Promise(resolve => setTimeout(resolve, delay))
        } else {
            result = state == 'dirty'
            break
        }


    }
    return result
}

