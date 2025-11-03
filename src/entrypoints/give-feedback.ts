import {PrepareOutputOptions} from "../github/junie/types/junie";
import {createOctokit} from "../github/api/client";
import * as core from "@actions/core";
import {
    PR_CREATED_FEEDBACK_COMMENT_TEMPLATE,
    COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE,
    SUCCESS_FEEDBACK_COMMENT_WITH_RESULT
} from "../github/constants";

export async function giveFeedback() {
    try {
        const prepareOutput = JSON.parse(process.env.PREPARE_OUTPUT!) as PrepareOutputOptions
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

        let feedbackBody: string;

        // Case 1: PR was created
        if (prLink) {
            console.log(`PR was created: ${prLink}`);
            feedbackBody = PR_CREATED_FEEDBACK_COMMENT_TEMPLATE(prLink);
        }
        // Case 2: Commit was made
        else if (commitSHA) {
            // Case 2a: Commit to current branch (baseBranch == workingBranch)
            if (workingBranch === baseBranch) {
                console.log(`Commit pushed to current branch: ${commitSHA}`);
                feedbackBody = COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE(commitSHA);
            }
            // Case 2b: Commit to working branch, but PR was not created
            else {
                console.log(`Commit pushed to working branch: ${commitSHA}, but PR was not created`);
                // Generate link for creating PR from workingBranch to baseBranch
                const createPRLink = `https://github.com/${ownerLogin}/${name}/compare/${baseBranch}...${workingBranch}`;
                feedbackBody = `${COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE(commitSHA)}\n\n📝 You can create a PR manually: [Create Pull Request](${createPRLink})`;
            }
        }
        // Case 3: No PR, no commit - use junie result
        else {
            console.log('No PR or commit - using Junie result');
            feedbackBody = SUCCESS_FEEDBACK_COMMENT_WITH_RESULT(junieTitle || 'Task completed', junieBody || 'No additional details');
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