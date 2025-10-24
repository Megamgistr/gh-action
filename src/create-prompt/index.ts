#!/usr/bin/env bun

import * as core from "@actions/core";
import {mkdir, writeFile} from "fs/promises";
import type {FetchDataResult} from "../github/data/fetcher";
import {
    formatBody,
    formatChangedFilesWithSHA,
    formatComments,
    formatContext,
    formatReviewComments,
} from "../github/data/formatter";
import {sanitizeContent} from "../utils/sanitizer";
import type {ParsedGitHubContext} from "../github/context";
import {
    isIssueCommentEvent,
    isPullRequestReviewCommentEvent,
    isPullRequestReviewEvent,
} from "../github/context";

function getCommentInfo(context: ParsedGitHubContext): string | null {
    if (isIssueCommentEvent(context) || isPullRequestReviewCommentEvent(context)) {
        return context.payload.comment.body
    }
    if (isPullRequestReviewEvent(context)) {
        return context.payload.review.body
    }
    return null
}

export function generateBasePrompt(
    context: ParsedGitHubContext,
    githubData: FetchDataResult,
): string {
    const {
        contextData,
        comments,
        changedFilesWithSHA,
        reviewData,
    } = githubData;
    const isPR = context.isPR;

    const formattedContext = formatContext(contextData, isPR);
    const formattedComments = formatComments(comments);
    const formattedReviewComments = isPR
        ? formatReviewComments(reviewData)
        : "";
    const formattedChangedFiles = isPR
        ? formatChangedFilesWithSHA(changedFilesWithSHA)
        : "";


    const formattedBody = contextData?.body
        ? formatBody(contextData.body)
        : "No description provided";

    const body = getCommentInfo(context)

    return `You are Junie, an AI assistant designed to help with GitHub issues and pull requests. Think carefully as you analyze the context and respond appropriately. Here's the context for your current task:

<formatted_context>
${formattedContext}
</formatted_context>

<pr_or_issue_body>
${formattedBody}
</pr_or_issue_body>

<comments>
${formattedComments || "No comments"}
</comments>

${
        isPR
            ? `<review_comments>
${formattedReviewComments || "No review comments"}
</review_comments>`
            : ""
    }

${
        isPR
            ? `<changed_files>
${formattedChangedFiles || "No files changed"}
</changed_files>`
            : ""
    }
<repository>${context.payload.repository.full_name}</repository>
${isPR && context.entityNumber ? `<pr_number>${context.entityNumber}</pr_number>` : ""}
${!isPR && context.entityNumber ? `<issue_number>${context.entityNumber}</issue_number>` : ""}
${body != null ? `<trigger_comment>${sanitizeContent(body)}</trigger_comment>` : ""}
Your task is to analyze the context, understand the request, and provide helpful responses and/or implement code changes as needed.
${context.inputs.prompt ? `<custom_instructions>${context.inputs.prompt}</custom_instructions>` : ""}
`
}

export async function createPrompt(
    githubData: FetchDataResult,
    context: ParsedGitHubContext,
) {
    try {
        await mkdir(`${process.env.RUNNER_TEMP || "/tmp"}/junie-prompts`, {
            recursive: true,
        });

        // Generate the prompt directly
        const promptContent = generateBasePrompt(
            context,
            githubData,
        );

        // Write the prompt file
        await writeFile(
            `${process.env.RUNNER_TEMP || "/tmp"}/junie-prompts/prompt.txt`,
            promptContent,
        );
    } catch (error) {
        core.setFailed(`Create prompt failed with error: ${error}`);
        process.exit(1);
    }
}
