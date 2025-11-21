#!/usr/bin/env bun

import * as core from "@actions/core";
import {$} from "bun";
import {
    GitHubContext,
    isPullRequestEvent,
    isPullRequestReviewCommentEvent,
    isPullRequestReviewEvent,
    isPushEvent,
} from "../context";
import type {Octokits} from "../api/client";
import {WORKING_BRANCH_PREFIX} from "../constants";

export type BranchInfo = {
    currentBranch: string;
    baseBranch: string;
    workingBranch: string;
};

/**
 * Determines if the existing PR branch should be used instead of creating a new one.
 * Returns true if:
 * - createNewBranchForPR setting is not enabled, OR
 * - actor is the PR author, OR
 * - PR author is the token owner (e.g., a bot)
 */
function shouldUseExistingPRBranch(
    createNewBranchForPR: boolean,
    actor: string,
    prAuthor: string,
    tokenOwnerLogin: string,
): boolean {
    console.log(`PR author: ${prAuthor}`);
    console.log(`Actor: ${actor}`);
    console.log(`Token owner: ${tokenOwnerLogin}`);
    console.log(`Create new branch for PR setting: ${createNewBranchForPR}`);

    if (!createNewBranchForPR) {
        return true;
    }

    if (actor === prAuthor) {
        return true;
    }

    return prAuthor === tokenOwnerLogin;
}

async function createNewBranch(baseBranch: string, branchName: string) {
    const newBranch = branchName.toLowerCase().substring(0, 50);

    try {
        console.log(`Creating new branch ${newBranch} from ${baseBranch}`);
        await $`git fetch origin ${baseBranch} --depth=1`;
        await $`git checkout -b ${newBranch} origin/${baseBranch}`;

        console.log(`Successfully created and checked out new branch: ${newBranch}`);

        return {
            baseBranch: baseBranch,
            currentBranch: newBranch,
            workingBranch: newBranch,
        };
    } catch (error) {
        console.error("Error in branch setup:", error);
        process.exit(1);
    }
}

async function setupWorkingBranch(context: GitHubContext, octokit: Octokits) {
    let baseBranch = context.inputs.baseBranch || context.payload.repository.default_branch
    const entityNumber = context.entityNumber;
    const isPR = context.isPR;
    const createNewBranchForPR = context.inputs.createNewBranchForPR;

    if (isPR && entityNumber) {
        let sourceBranch: string
        let state: string;
        let prAuthor: string;
        if (isPullRequestEvent(context)
            || isPullRequestReviewEvent(context)
            || isPullRequestReviewCommentEvent(context)) {
            baseBranch = context.payload.pull_request.base.ref;
            sourceBranch = context.payload.pull_request.head.ref;
            state = context.payload.pull_request.state;
            prAuthor = context.payload.pull_request.user.login;
        } else {
            const data = (await octokit.rest.pulls.get({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                pull_number: entityNumber,
            })).data;
            baseBranch = data.base.ref;
            sourceBranch = data.head.ref
            state = data.state;
            prAuthor = data.user.login;
        }

        console.log(`Base branch: ${baseBranch}`);
        console.log(`Target branch: ${sourceBranch}`);

        const useExistingBranch = shouldUseExistingPRBranch(
            createNewBranchForPR,
            context.actor,
            prAuthor,
            context.tokenOwner.login,
        );

        console.log(`Use existing PR branch: ${useExistingBranch}`);

        if (state === "CLOSED" || state === "MERGED") {
            console.log(`PR #${entityNumber} is ${state}, creating new branch`);
        } else if (useExistingBranch) {
            const fetchDepth = 20
            await $`git fetch origin --depth=${fetchDepth} ${sourceBranch}`;
            await $`git checkout ${sourceBranch}`;

            console.log(`Successfully checked out PR branch for PR #${entityNumber}`);

            return {
                currentBranch: sourceBranch!,
                baseBranch: baseBranch,
                workingBranch: sourceBranch!,
            };
        } else {
            console.log(`Creating new branch for PR #${entityNumber} based on ${sourceBranch}`);
            baseBranch = sourceBranch;
        }
    }

    if (isPushEvent(context)) {
        baseBranch = context.payload.ref.replace("refs/heads/", "");
        console.log(`Push event detected, base branch: ${baseBranch}`);
    }

    const entityType = isPR ? "pr" : entityNumber ? "issue" : "run";
    const branchName = `${WORKING_BRANCH_PREFIX}${entityType}-${entityNumber || context.runId}`;
    return await createNewBranch(baseBranch, branchName)
}

export async function setupBranch(octokit: Octokits, context: GitHubContext) {
    let branchInfo = await setupWorkingBranch(context, octokit)
    core.setOutput('BASE_BRANCH', branchInfo.baseBranch);
    core.setOutput('WORKING_BRANCH', branchInfo.workingBranch);
    core.setOutput("CURRENT_BRANCH", branchInfo.currentBranch);
    return branchInfo;
}
