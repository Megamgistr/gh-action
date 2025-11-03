import {PrepareOutputOptions} from "../github/junie/types/junie";
import {exportResultsOutputs} from "../github/junie/junie-inputs";
import {PR_TITLE_TEMPLATE, PR_BODY_TEMPLATE, COMMIT_MESSAGE_TEMPLATE} from "../github/constants";
import {isEntityContext} from "../github/context";
import {execSync} from 'child_process';

export enum ActionType {
    WRITE_COMMENT = 'WRITE_COMMENT',
    CREATE_PR = 'CREATE_PR',
    COMMIT_CHANGES = 'COMMIT_CHANGES',
    NOTHING = 'NOTHING'
}

export async function handleResults() {
    const prepareOutput = JSON.parse(process.env.PREPARE_OUTPUT!) as PrepareOutputOptions
    console.log("Parsed prepare output:", prepareOutput);
    const junieJsonOutput = JSON.parse(process.env.JSON_JUNIE_OUTPUT!) as any
    console.log("Junie json output:", junieJsonOutput);
    const actionToDo = await getActionToDo(prepareOutput);
    console.log("Action to do:", actionToDo);
    const title = junieJsonOutput.taskName
    const body = junieJsonOutput.result
    let issueId
    if (isEntityContext(prepareOutput.context)) {
        issueId = prepareOutput.context.entityNumber
    }
    const commitMessage = COMMIT_MESSAGE_TEMPLATE(title, body, issueId)

    // Export outputs based on action type
    switch (actionToDo) {
        case ActionType.CREATE_PR:
            exportResultsOutputs(actionToDo,
                title,
                body,
                commitMessage,
                PR_TITLE_TEMPLATE(title),
                PR_BODY_TEMPLATE(body, issueId));
            break;
        case ActionType.COMMIT_CHANGES:
            exportResultsOutputs(actionToDo, title, body, commitMessage);
            break;
        case ActionType.WRITE_COMMENT:
        case ActionType.NOTHING:
            exportResultsOutputs(actionToDo, title, body);
            break;
    }
}

async function getActionToDo(prepareOutput: PrepareOutputOptions): Promise<ActionType> {
    // Check if there are changed files
    const hasChangedFiles = await checkForChangedFiles();
    const canCreatePr = prepareOutput.canCreatePR


    console.log(`Has changed files: ${hasChangedFiles}`);
    console.log(`Init comment ID: ${prepareOutput.initCommentId}`);
    console.log(`Base branch: ${prepareOutput.branchInfo.baseBranch}`);
    console.log(`Working branch: ${prepareOutput.branchInfo.workingBranch}`);
    console.log(`Can create PR ${canCreatePr}`)

    // WRITE_COMMENT: no changed files AND has initCommentId
    if (!hasChangedFiles && prepareOutput.initCommentId) {
        console.log('No changes found but has comment ID - will write comment');
        return ActionType.WRITE_COMMENT;
    }

    // CREATE_PR: has changed files AND branches are different
    if (hasChangedFiles && canCreatePr && prepareOutput.branchInfo.baseBranch !== prepareOutput.branchInfo.workingBranch) {
        console.log('Changes found and branches differ - will create PR');
        return ActionType.CREATE_PR;
    }

    // COMMIT_CHANGES: has changed files AND branches are the same
    if (hasChangedFiles && (!canCreatePr || prepareOutput.branchInfo.baseBranch === prepareOutput.branchInfo.workingBranch)) {
        console.log('Changes found and branches are same - will commit directly');
        return ActionType.COMMIT_CHANGES;
    }

    console.log('No specific action matched - do nothing');
    return ActionType.NOTHING;
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