import {exportResultsOutputs} from "../github/junie/junie-inputs";
import {PR_TITLE_TEMPLATE, PR_BODY_TEMPLATE, COMMIT_MESSAGE_TEMPLATE} from "../github/constants";
import {GitHubContext, isEntityContext} from "../github/context";
import {execSync} from 'child_process';
import * as core from "@actions/core";

export enum ActionType {
    WRITE_COMMENT = 'WRITE_COMMENT',
    CREATE_PR = 'CREATE_PR',
    COMMIT_CHANGES = 'COMMIT_CHANGES',
    NOTHING = 'NOTHING'
}

export async function handleResults() {
    try {
        const junieJsonOutput = JSON.parse(process.env.JSON_JUNIE_OUTPUT!) as any
        const context = JSON.parse(process.env.PARSED_CONTEXT!) as GitHubContext
        console.log("Junie json output:", junieJsonOutput);
        const junieErrors = junieJsonOutput.errors
        if (junieErrors && (junieErrors as string[]).length > 0) {
            throw new Error(`Junie run failed with errors: ${junieErrors.join('\n')}`)
        }
        const actionToDo = await getActionToDo();
        const title = junieJsonOutput.taskName
        const body = junieJsonOutput.result
        let issueId
        if (isEntityContext(context)) {
            issueId = context.entityNumber
        }
        const commitMessage = COMMIT_MESSAGE_TEMPLATE(title, body, issueId)

        // Export outputs based on action type
        switch (actionToDo) {
            case ActionType.CREATE_PR:
                exportResultsOutputs(
                    title,
                    body,
                    commitMessage,
                    PR_TITLE_TEMPLATE(title),
                    PR_BODY_TEMPLATE(body, issueId));
                break;
            case ActionType.COMMIT_CHANGES:
                exportResultsOutputs(title, body, commitMessage);
                break;
            case ActionType.WRITE_COMMENT:
            case ActionType.NOTHING:
                exportResultsOutputs(title, body);
                break;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.setFailed(`Handle results step failed with error: ${errorMessage}`);
        core.setOutput("EXCEPTION", errorMessage);
        process.exit(1);
    }
}

async function getActionToDo(): Promise<ActionType> {
    // Check if there are changed files
    const hasChangedFiles = await checkForChangedFiles();
    const initCommentId = process.env.INIT_COMMENT_ID;
    const baseBranch = process.env.BASE_BRANCH!;
    const workingBranch = process.env.WORKING_BRANCH!;


    console.log(`Has changed files: ${hasChangedFiles}`);
    console.log(`Init comment ID: ${initCommentId}`);
    console.log(`Base branch: ${baseBranch}`);
    console.log(`Working branch: ${workingBranch}`);

    let action: ActionType
    if (!hasChangedFiles && initCommentId) {
        console.log('No changes found but has comment ID - will write comment');
        action = ActionType.WRITE_COMMENT;
    } else if (hasChangedFiles && baseBranch !== workingBranch) {
        console.log('Changes found and branches differ - will create PR');
        action = ActionType.CREATE_PR;
    } else if (hasChangedFiles && baseBranch === workingBranch) {
        console.log('Changes found and branches are same - will commit directly');
        action = ActionType.COMMIT_CHANGES;
    } else {
        console.log('No specific action matched - do nothing');
        action = ActionType.NOTHING;
    }

    console.log("Action to do:", action);
    core.setOutput('ACTION_TO_DO', action);
    return action;
}

async function checkForChangedFiles(): Promise<boolean> {
    try {
        // Check for staged and unstaged changes
        const gitStatus = execSync('git status --porcelain', {encoding: 'utf-8'});

        // If git status returns any output, there are changes
        return gitStatus.trim().length > 0;
    } catch (error) {
        console.error('Error checking for changed files:', error);
        // If we can't check, assume there are no changes to be safe
        return false;
    }
}


// @ts-ignore
if (import.meta.main) {
    handleResults();
}