#!/usr/bin/env bun

import * as core from "@actions/core";
import {createJobRunLink, createCommentBody} from "./common";
import {
    isPullRequestReviewCommentEvent,
    type ParsedGitHubContext,
} from "../../context";
import type {Octokit} from "@octokit/rest";

export async function writeInitialFeedbackComment(
    octokit: Octokit,
    context: ParsedGitHubContext,
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
                pull_number: context.entityNumber,
                comment_id: context.payload.comment.id,
                body: initialBody,
            });
        } else {
            response = await octokit.rest.issues.createComment({
                owner: ownerLogin,
                repo: name,
                issue_number: context.entityNumber,
                body: initialBody,
            });
        }
        console.log(`Created initial comment with ID: ${response.data.id}`);
        const initCommentId =  response.data.id;
        core.setOutput('INIT_COMMENT_ID', initCommentId);

        return initCommentId;
    } catch (error) {
        console.error("Error in initial comment:", error);
        throw error;
    }
}