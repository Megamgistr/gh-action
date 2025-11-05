import {createOctokit} from "../github/api/client";
import * as core from "@actions/core";
import {
    PR_CREATED_FEEDBACK_COMMENT_TEMPLATE,
    COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE,
    SUCCESS_FEEDBACK_COMMENT_WITH_RESULT, MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE, ERROR_FEEDBACK_COMMENT_TEMPLATE
} from "../github/constants";
import {ActionType} from "./handle-results";
import {GitHubContext} from "../github/context";
import {GITHUB_SERVER_URL} from "../github/api/config";
import {createJobRunLink} from "../github/operations/comments/common";

function getFailedBody(owner: string, repoName: string, runId: string): string | undefined {
    const details = process.env.ERROR || "Check job logs for more details"
    const jobLink = createJobRunLink(owner, repoName, runId)
    return `${ERROR_FEEDBACK_COMMENT_TEMPLATE(details, jobLink)}`;
}

function getSuccessBody(repoFullName: string): string | undefined {
    const actionToDo = process.env.ACTION_TO_DO as keyof typeof ActionType;
    const prLink = process.env.PR_LINK;
    const commitSHA = process.env.COMMIT_SHA;
    const junieTitle = process.env.JUNIE_TITLE;
    const junieSummary = process.env.JUNIE_SUMMARY;
    const workingBranch = process.env.WORKING_BRANCH!;
    const baseBranch = process.env.BASE_BRANCH!;

    let result: string | undefined;
    switch (actionToDo) {
        case "COMMIT_CHANGES":
            console.log(`Commit pushed to current branch: ${commitSHA}`);
            result = COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE(commitSHA!);
            break;
        case "CREATE_PR":
            if (prLink) {
                console.log(`PR was created: ${prLink}`);
                result = PR_CREATED_FEEDBACK_COMMENT_TEMPLATE(prLink);
            } else {
                console.log(`Create PR manually`);
                const createPRLink = `${GITHUB_SERVER_URL}/${repoFullName}/compare/${baseBranch}...${workingBranch}`;
                result = MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE(createPRLink);
            }
            break;
        case "WRITE_COMMENT":
            console.log('No PR or commit - using Junie result');
            result = SUCCESS_FEEDBACK_COMMENT_WITH_RESULT(junieTitle || 'Task completed', junieSummary || 'No additional details');
            break;
    }

    return result;
}

export async function giveFeedback() {
    try {
        const jobStatus = process.env.JOB_STATUS;
        console.log(`Job status: ${jobStatus}`);
        const initCommentId = process.env.INIT_COMMENT_ID!;
        const parsedContext = JSON.parse(process.env.PARSED_CONTEXT!) as GitHubContext;
        const githubToken = process.env.GITHUB_TOKEN!;
        const {owner, name} = parsedContext.payload.repository;
        const ownerLogin = owner.login;
        const repoFullName = `${ownerLogin}/${name}`;
        let feedbackBody: string | undefined;
        if (jobStatus) {
            feedbackBody = getFailedBody(ownerLogin, name, parsedContext.runId)
        } else {
            feedbackBody = getSuccessBody(repoFullName)
        }

        if (!feedbackBody) {
            console.log('No feedback body - skipping feedback');
            return;
        }

        const octokit = createOctokit(githubToken);

        // Update the initial comment with feedback
        console.log(`Updating comment ${initCommentId} with feedback`);
        await octokit.rest.issues.updateComment({
            owner: ownerLogin,
            repo: name,
            comment_id: +initCommentId,
            body: feedbackBody,
        });

        console.log('Feedback comment updated successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.setFailed(`Give feedback step failed with error: ${errorMessage}`);
        core.setOutput("EXCEPTION", errorMessage);
        process.exit(1);
    }
}

// @ts-ignore
if (import.meta.main) {
    giveFeedback();
}