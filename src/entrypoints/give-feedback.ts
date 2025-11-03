import {PrepareOutputOptions} from "../github/junie/types/junie";
import {createOctokit} from "../github/api/client";
import * as core from "@actions/core";
import {
    PR_CREATED_FEEDBACK_COMMENT_TEMPLATE,
    COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE,
    SUCCESS_FEEDBACK_COMMENT_WITH_RESULT, MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE
} from "../github/constants";
import {ActionType} from "./handle-results";

export async function giveFeedback() {
    try {
        const prepareOutput = JSON.parse(process.env.PREPARE_OUTPUT!) as PrepareOutputOptions
        const actionToDo = process.env.ACTION_TO_DO as keyof typeof ActionType
        const prLink = process.env.PR_LINK
        const commitSHA = process.env.COMMIT_SHA
        const junieTitle = process.env.JUNIE_TITLE
        const junieBody = process.env.JUNIE_BODY
        const initCommentId = prepareOutput.initCommentId
        const octokit = createOctokit(prepareOutput.githubToken);

        // If there's no initCommentId, nothing to do
        if (!initCommentId) {
            console.log('No initCommentId found - skipping feedback');
            return;
        }

        const {owner, name} = prepareOutput.context.payload.repository;
        const ownerLogin = owner.login;
        const {baseBranch, workingBranch} = prepareOutput.branchInfo;

        let feedbackBody: string | undefined;

        switch (actionToDo) {
            case "COMMIT_CHANGES":
                console.log(`Commit pushed to current branch: ${commitSHA}`);
                feedbackBody = COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE(commitSHA!);
                break;
            case "CREATE_PR":
                if (prLink) {
                    console.log(`PR was created: ${prLink}`);
                    feedbackBody = PR_CREATED_FEEDBACK_COMMENT_TEMPLATE(prLink);
                } else {
                    console.log(`Create PR manually`);
                    const createPRLink = `https://github.com/${ownerLogin}/${name}/compare/${baseBranch}...${workingBranch}`;
                    feedbackBody = MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE(createPRLink);
                }
                break;
            case "WRITE_COMMENT":
                console.log('No PR or commit - using Junie result');
                feedbackBody = SUCCESS_FEEDBACK_COMMENT_WITH_RESULT(junieTitle || 'Task completed', junieBody || 'No additional details');
                break;
        }

        if (!feedbackBody) {
            console.log('No feedback body - skipping feedback');
            return;
        }

        // Update the initial comment with feedback
        console.log(`Updating comment ${initCommentId} with feedback`);
        await octokit.rest.issues.updateComment({
            owner: ownerLogin,
            repo: name,
            comment_id: initCommentId,
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