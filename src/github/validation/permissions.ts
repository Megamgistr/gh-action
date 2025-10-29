import * as core from "@actions/core";
import type {GitHubContext, ParsedGitHubContext} from "../context";
import type {Octokit} from "@octokit/rest";

export async function isTokenHasPRCreatePermission(
    octokit: Octokit,
    context: GitHubContext
): Promise<boolean> {
    const {owner, name} = context.payload.repository;
    try {
        core.info(`Checking PR creation permissions for repository: ${owner}/${name}`);

        // Get repository information including permissions
        const {data: repository} = await octokit.repos.get({
            owner: owner.login,
            repo: name,
        });

        // Check if we have permissions object (only present when authenticated)
        if (!repository.permissions) {
            core.warning('No permissions object in repository response - token may not have required scopes');
            return false;
        }

        // To create a PR, we need at least pull (read) and push (write) permissions
        // pull: allows reading the repository
        // push: allows creating branches and pull requests
        const hasPullPermission = repository.permissions.pull;
        const hasPushPermission = repository.permissions.push;

        core.info(`Repository permissions - pull: ${hasPullPermission}, push: ${hasPushPermission}`);

        if (hasPullPermission && hasPushPermission) {
            core.info('Token has sufficient permissions to create PRs');
            return true;
        } else {
            core.warning(`Token lacks permissions to create PRs - pull: ${hasPullPermission}, push: ${hasPushPermission}`);
            return false;
        }
    } catch (error) {
        throw new Error(`Failed to check PR creation permissions for ${owner}/${name}: ${error}`);
    }
}

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
