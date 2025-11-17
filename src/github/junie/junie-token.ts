import {GitHubContext} from "../context";
import * as core from "@actions/core";

export async function prepareJunieCLIToken(context: GitHubContext) {
    core.setOutput('EJ_CLI_TOKEN', context.inputs.appToken);
}