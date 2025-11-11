#!/usr/bin/env bun

import * as core from "@actions/core";
import {$} from "bun";
import {
    GitHubContext,
    isPullRequestEvent,
    isPullRequestReviewCommentEvent,
    isPullRequestReviewEvent,
} from "../context";
import type {Octokits} from "../api/client";
import {WORKING_BRANCH_PREFIX} from "../constants";

export type BranchInfo = {
    currentBranch: string;
    baseBranch: string;
    workingBranch: string;
};

async function createNewBranch(baseBranch: string, branchName: string) {
    const newBranch = branchName.toLowerCase().substring(0, 50);

    try {
        await $`pwd`
        console.log(`Current work dir ${process.env.GITHUB_WORKSPACE}`);
        console.log(`Creating new branch ${newBranch}`);
        await $`git fetch origin ${baseBranch} --depth=1`;
        await $`git checkout ${baseBranch}`;

        console.log(`Successfully created and checked out new branch: ${newBranch}`);

        return {
            baseBranch: baseBranch,
            currentBranch: baseBranch,
            workingBranch: newBranch,
        };
    } catch (error) {
        console.error("Error in branch setup:", error);
        process.exit(1);
    }
}

async function setupWorkingBranch(baseBranch: string, context: GitHubContext, octokit: Octokits) {
    console.log(`Git diff ${await $`git diff`}`)
    const entityNumber = context.entityNumber;
    const isPR = context.isPR;
    if (isPR && entityNumber) {
        let targetBranch: string
        let state: string;
        if (isPullRequestEvent(context)
            || isPullRequestReviewEvent(context)
            || isPullRequestReviewCommentEvent(context)) {
            targetBranch = context.payload.pull_request.head.ref;
            state = context.payload.pull_request.state;
        } else {
            const data = (await octokit.rest.pulls.get({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                pull_number: entityNumber,
            })).data;
            targetBranch = data.head.ref
            state = data.state;
        }

        console.log(`Target branch: ${targetBranch}`);

        if (state === "CLOSED" || state === "MERGED") {
            console.log(`PR #${entityNumber} is ${state}, creating new branch`);
        } else {
            const fetchDepth = 20
            await $`git fetch origin --depth=${fetchDepth} ${targetBranch}`;
            await $`git checkout ${targetBranch} --`;

            console.log(`Successfully checked out PR branch for PR #${entityNumber}`);

            return {
                currentBranch: targetBranch!,
                baseBranch: baseBranch,
                workingBranch: targetBranch!,
            };
        }
    }

    const entityType = isPR ? "pr" : entityNumber ? "issue" : "run";
    const branchName = `${WORKING_BRANCH_PREFIX}${entityType}-${entityNumber || context.runId}`;
    return await createNewBranch(baseBranch, branchName)
}

export async function setupBranch(octokit: Octokits, context: GitHubContext) {
    const baseBranch = context.inputs.baseBranch || context.payload.repository.default_branch
    console.log(`Base branch: ${baseBranch}. From input ${context.inputs.baseBranch}`);

    let branchInfo = await setupWorkingBranch(baseBranch, context, octokit)
    core.setOutput('BASE_BRANCH', branchInfo.baseBranch);
    core.setOutput('WORKING_BRANCH', branchInfo.workingBranch);
    core.setOutput("CURRENT_BRANCH", branchInfo.currentBranch);
    return branchInfo;
}
