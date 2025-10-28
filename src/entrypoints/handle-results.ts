import {PrepareOutputOptions} from "../github/junie/types/junie";
import {exportResultsOutputs} from "../github/junie/junie-inputs";
import {PR_TITLE_TEMPLATE, PR_BODY_TEMPLATE, COMMIT_MESSAGE_TEMPLATE} from "../github/constants";
import {isEntityContext} from "../github/context";

export async function handleResults() {
    const prepareOutput = JSON.parse(process.env.PREPARE_OUTPUT!) as PrepareOutputOptions
    console.log("Parsed prepare output:", prepareOutput);
    const junieJsonOutput = JSON.parse(process.env.JSON_JUNIE_OUTPUT!) as any
    console.log("Junie json output:", junieJsonOutput);
    const shouldCreatePR = prepareOutput.branchInfo.baseBranch !== prepareOutput.branchInfo.workingBranch
    console.log("Should create PR:", shouldCreatePR);
    const title = junieJsonOutput.taskName
    const body = junieJsonOutput.result
    let issueId
    if (isEntityContext(prepareOutput.context)) {
        issueId = prepareOutput.context.entityNumber
    }
    const commitMessage = COMMIT_MESSAGE_TEMPLATE(title, body, issueId)
    shouldCreatePR ? exportResultsOutputs(shouldCreatePR, commitMessage, PR_TITLE_TEMPLATE(title), PR_BODY_TEMPLATE(body, issueId)) :
        exportResultsOutputs(shouldCreatePR, commitMessage)

}


// @ts-ignore
if (import.meta.main) {
    handleResults();
}