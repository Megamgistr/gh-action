#!/usr/bin/env bun

/**
 * Create the initial tracking comment when Junie starts working
 */

import {createJobRunLink, createCommentBody} from "./common";
import {
    isPullRequestReviewCommentEvent,
    type ParsedGitHubContext,
} from "../../context";
import type {Octokit} from "@octokit/rest";

export async function createInitialComment(
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
            // Only use createReplyForReviewComment if it's a PR review comment AND we have a comment_id
            response = await octokit.rest.pulls.createReplyForReviewComment({
                owner: ownerLogin,
                repo: name,
                pull_number: context.entityNumber,
                comment_id: context.payload.comment.id,
                body: initialBody,
            });
        } else {
            // For all other cases (issues, issue comments, or missing comment_id)
            response = await octokit.rest.issues.createComment({
                owner: ownerLogin,
                repo: name,
                issue_number: context.entityNumber,
                body: initialBody,
            });
        }
        console.log(`✅ Created initial comment with ID: ${response.data.id}`);
        return response.data;
    } catch (error) {
        console.error("Error in initial comment:", error);
        throw error;
    }
}
