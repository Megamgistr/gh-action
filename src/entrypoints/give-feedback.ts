import * as core from "@actions/core";
import {FinishFeedbackData, writeFinishFeedbackComment} from "../github/operations/comments/feedback";
import {GitHubContext} from "../github/context";
import {ActionType} from "./handle-results";
import {ENV_VARS, OUTPUT_VARS} from "../constants/environment";


export async function giveFeedback() {
    try {
        const data: FinishFeedbackData = {
            githubToken: process.env[ENV_VARS.GITHUB_TOKEN]!,
            initCommentId: process.env[OUTPUT_VARS.INIT_COMMENT_ID]!,
            isJobFailed: process.env[ENV_VARS.IS_JOB_FAILED] === "true",
            parsedContext: JSON.parse(process.env[OUTPUT_VARS.PARSED_CONTEXT]!) as GitHubContext
        }
        if (data.isJobFailed) {
            data.failureData = {error: process.env[ENV_VARS.ERROR]}
        } else {
            data.successData = {
                actionToDo: process.env[OUTPUT_VARS.ACTION_TO_DO] as keyof typeof ActionType,
                baseBranch: process.env[OUTPUT_VARS.BASE_BRANCH],
                commitSHA: process.env[ENV_VARS.COMMIT_SHA],
                junieSummary: process.env[OUTPUT_VARS.JUNIE_SUMMARY],
                junieTitle: process.env[OUTPUT_VARS.JUNIE_TITLE],
                prLink: process.env[ENV_VARS.PR_LINK],
                workingBranch: process.env[OUTPUT_VARS.WORKING_BRANCH]
            }
        }

        await writeFinishFeedbackComment(data)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.setFailed(`Give feedback step failed with error: ${errorMessage}`);
        core.setOutput(OUTPUT_VARS.EXCEPTION, errorMessage);
        process.exit(1);
    }
}

// @ts-ignore
if (import.meta.main) {
    giveFeedback();
}