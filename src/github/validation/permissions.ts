import * as core from "@actions/core";
import type {ParsedGitHubContext} from "../context";
import type {Octokit} from "@octokit/rest";

export async function checkWritePermissions(
    octokit: Octokit,
    context: ParsedGitHubContext
): Promise<boolean> {
    const {actor} = context;
    const repo = context.payload.repository;
    try {
        core.info(`Checking permissions for actor: ${actor}`);
        if (actor.endsWith("[bot]")) {
            core.info(`Actor is a GitHub App: ${actor}`);
            return true;
        }

        const response = await octokit.repos.getCollaboratorPermissionLevel({
            owner: repo.owner.login,
            repo: repo.name,
            username: actor,
        });

        const permissionLevel = response.data.permission;
        core.info(`Permission level retrieved: ${permissionLevel}`);

        if (permissionLevel === "admin" || permissionLevel === "write") {
            core.info(`Actor has write access: ${permissionLevel}`);
            return true;
        } else {
            core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
            return false;
        }
    } catch (error) {
        core.error(`Failed to check permissions: ${error}`);
        throw new Error(`Failed to check permissions for ${actor}: ${error}`);
    }
}
