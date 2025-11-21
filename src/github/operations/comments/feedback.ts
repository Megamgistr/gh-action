#!/usr/bin/env bun

import * as core from "@actions/core";
import {createCommentBody, createJobRunLink} from "./common";
import {GitHubContext, isPullRequestReviewCommentEvent,} from "../../context";
import type {Octokit} from "@octokit/rest";
import {createOctokit} from "../../api/client";
import {
    COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE,
    ERROR_FEEDBACK_COMMENT_TEMPLATE,
    MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE,
    PR_CREATED_FEEDBACK_COMMENT_TEMPLATE,
    SUCCESS_FEEDBACK_COMMENT_WITH_RESULT
} from "../../constants";
import {ActionType} from "../../../entrypoints/handle-results";
import {GITHUB_SERVER_URL} from "../../api/config";
import {OUTPUT_VARS} from "../../../constants/environment";

export async function writeInitialFeedbackComment(
    octokit: Octokit,
    context: GitHubContext,
) {
    const {owner, name} = context.payload.repository;
    const ownerLogin = owner.login;

    const jobRunLink = createJobRunLink(ownerLogin, name, context.runId);
    const initialBody = createCommentBody(jobRunLink);

    try {
        let response;

        if (isPullRequestReviewCommentEvent(context)) {
            response = await octokit.rest.pulls.createReplyForReviewComment({
                owner: ownerLogin,
                repo: name,
                pull_number: context.entityNumber!,
                comment_id: context.payload.comment.id,
                body: initialBody,
            });
        } else if (context.entityNumber) {
            response = await octokit.rest.issues.createComment({
                owner: ownerLogin,
                repo: name,
                issue_number: context.entityNumber,
                body: initialBody,
            });
        } else {
            console.log(`Skip creating initial comment for ${context.eventName} event`);
            return;
        }
        console.log(`Created initial comment with ID: ${response.data.id}`);
        const initCommentId = response.data.id;
        core.setOutput(OUTPUT_VARS.INIT_COMMENT_ID, initCommentId);

        return initCommentId;
    } catch (error) {
        console.error("Error in initial comment:", error);
        throw error;
    }
}


export async function writeFinishFeedbackComment(data: FinishFeedbackData) {
    const {owner, name} = data.parsedContext.payload.repository;
    const ownerLogin = owner.login;
    const repoFullName = `${ownerLogin}/${name}`;
    let feedbackBody: string | undefined;
    if (data.isJobFailed) {
        feedbackBody = getFailedBody(ownerLogin, name, data.parsedContext.runId, data.failureData!)
    } else {
        feedbackBody = getSuccessBody(repoFullName, data.successData!)
    }

    if (!feedbackBody) {
        console.log('No feedback body - skipping feedback');
        return;
    }

    const octokit = createOctokit(data.githubToken);

    const isReviewComment = isPullRequestReviewCommentEvent(data.parsedContext);
    const initCommentId = data.initCommentId;
    console.log(`Updating comment ${initCommentId} (review comment: ${isReviewComment})`);
    if (isReviewComment) {
        await octokit.rest.pulls.updateReviewComment({
            owner: ownerLogin,
            repo: name,
            comment_id: +initCommentId,
            body: feedbackBody,
        });
    } else {
        await octokit.rest.issues.updateComment({
            owner: ownerLogin,
            repo: name,
            comment_id: +initCommentId,
            body: feedbackBody,
        });
    }

    console.log('Feedback comment updated successfully');
}

export interface FinishFeedbackData {
    initCommentId: string;
    isJobFailed: boolean;
    githubToken: string;
    parsedContext: GitHubContext;
    successData?: SuccessFeedbackData;
    failureData?: FailureFeedbackData;
}

interface SuccessFeedbackData {
    actionToDo: keyof typeof ActionType;
    prLink?: string;
    commitSHA?: string;
    junieTitle?: string;
    junieSummary?: string;
    workingBranch?: string;
    baseBranch?: string;
}

interface FailureFeedbackData {
    error?: string;
}

function getFailedBody(owner: string, repoName: string, runId: string, failureData: FailureFeedbackData): string | undefined {
    const details = failureData.error || "Check job logs for more details"
    const jobLink = createJobRunLink(owner, repoName, runId)
    return `${ERROR_FEEDBACK_COMMENT_TEMPLATE(details, jobLink)}`;
}

function getSuccessBody(repoFullName: string, successData: SuccessFeedbackData): string | undefined {
    let result: string | undefined;
    switch (successData.actionToDo) {
        case "COMMIT_CHANGES":
            console.log(`Commit pushed to current branch: ${successData.commitSHA}`);
            result = COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE(successData.commitSHA!, successData.junieTitle!, successData.junieSummary!);
            break;
        case "PUSH":
            console.log('Unpushed commits were pushed to remote');
            result = SUCCESS_FEEDBACK_COMMENT_WITH_RESULT(successData.junieTitle || 'Changes pushed', successData.junieSummary || 'Unpushed commits have been pushed to the remote branch');
            break;
        case "CREATE_PR":
            if (successData.prLink) {
                console.log(`PR was created: ${successData.prLink}`);
                result = PR_CREATED_FEEDBACK_COMMENT_TEMPLATE(successData.prLink);
            } else {
                console.log(`Create PR manually`);
                const createPRLink = `${GITHUB_SERVER_URL}/${repoFullName}/compare/${successData.baseBranch}...${successData.workingBranch}`;
                result = MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE(createPRLink);
            }
            break;
        case "WRITE_COMMENT":
            console.log('No PR or commit - using Junie result');
            result = SUCCESS_FEEDBACK_COMMENT_WITH_RESULT(successData.junieTitle || 'Task completed', successData.junieSummary || 'No additional details');
            break;
    }

    return result;
}