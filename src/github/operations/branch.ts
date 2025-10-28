#!/usr/bin/env bun

import {$} from "bun";
import {
    AutomationContext,
    GitHubContext, isEntityContext,
    isIssueCommentEvent,
    isPullRequestEvent,
    isPullRequestReviewCommentEvent,
    isPullRequestReviewEvent,
    ParsedGitHubContext
} from "../context";
import type {Octokits} from "../api/client";
import {WORKING_BRANCH_PREFIX} from "../constants";

export type BranchInfo = {
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
            workingBranch: newBranch,
        };
    } catch (error) {
        console.error("Error in branch setup:", error);
        process.exit(1);
    }
}

async function setupBrunchEntityEvent(baseBranch: string, context: ParsedGitHubContext) {
    const entityNumber = context.entityNumber;
    const isPR = context.isPR;
    const targetBranch = context.inputs.targetBranch

    if (isPR && targetBranch) {
        let state: string = "";
        if (isPullRequestEvent(context)
            || isPullRequestReviewEvent(context)
            || isPullRequestReviewCommentEvent(context)) {
            state = context.payload.pull_request.state;
        }
        if (isIssueCommentEvent(context)) {
            state = context.payload.issue.state;
        }

        if (state === "CLOSED" || state === "MERGED") {
            console.log(`PR #${entityNumber} is ${state}, creating new branch`);
        } else {
            const fetchDepth = 20
            await $`git fetch origin --depth=${fetchDepth} ${targetBranch}`;
            await $`git checkout ${targetBranch} --`;

            console.log(`Successfully checked out PR branch for PR #${entityNumber}`);

            return {
                baseBranch: baseBranch,
                workingBranch: targetBranch,
            };
        }
    }
    const entityType = isPR ? "pr" : "issue";
    const branchName = `${WORKING_BRANCH_PREFIX}${entityType}-${entityNumber}`;
    return await createNewBranch(baseBranch, branchName)
}

async function setupBrunchNonEntityEvent(baseBranch: string, context: AutomationContext) {
    const branchName = `${WORKING_BRANCH_PREFIX}${context.eventName}-${crypto.randomUUID()}`;
    return await createNewBranch(baseBranch, branchName)
}

export async function setupBranch(
    octokits: Octokits,
    context: GitHubContext,
): Promise<BranchInfo> {
    const {owner, name} = context.payload.repository;
    const login = owner.login
    const baseBranch = context.inputs.baseBranch || (await octokits.rest.repos.get({
        owner: login,
        repo: name,
    })).data.default_branch;

    if (isEntityContext(context)) {
        return setupBrunchEntityEvent(baseBranch, context)
    } else {
        return setupBrunchNonEntityEvent(baseBranch, context)
    }
}
