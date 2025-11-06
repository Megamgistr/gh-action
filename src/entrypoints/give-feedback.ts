import * as core from "@actions/core";
import {FinishFeedbackData, writeFinishFeedbackComment} from "../github/operations/comments/feedback";
import {GitHubContext} from "../github/context";
import {ActionType} from "./handle-results";


export async function giveFeedback() {
    try {
        const data: FinishFeedbackData = {
            githubToken: process.env.GITHUB_TOKEN!,
            initCommentId: process.env.INIT_COMMENT_ID!,
            isJobFailed: process.env.IS_JOB_FAILED === 'true',
            parsedContext: JSON.parse(process.env.PARSED_CONTEXT!) as GitHubContext
        }
        if (data.isJobFailed) {
            data.failureData = {error: process.env.ERROR}
        } else{
            data.successData = {
                actionToDo: process.env.ACTION_TO_DO as keyof typeof ActionType,
                baseBranch: process.env.BASE_BRANCH,
                commitSHA: process.env.COMMIT_SHA,
                junieSummary: process.env.JUNIE_SUMMARY,
                junieTitle: process.env.JUNIE_TITLE,
                prLink: process.env.PR_LINK,
                workingBranch: process.env.WORKING_BRANCH
            }
        }

       await writeFinishFeedbackComment(data)
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