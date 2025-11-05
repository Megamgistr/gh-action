import { Octokits } from "../api/client";
import { GITHUB_SERVER_URL } from "../api/config";
import { GitHubContext } from "../context";
import {$} from "bun";

interface GitUser {
    login: string;
    id: string;
}

export async function gitAuth(octokit: Octokits, githubToken: string, parsedContext: GitHubContext) {
    console.log("Configuring git authentication...");
    const defaultToken = process.env.DEFAULT_WORKFLOW_TOKEN;
    if (githubToken === defaultToken) {
        console.log("Using default token for git authentication");
        return;
    }
    let gitUser: GitUser
    if (parsedContext.inputs.botId && parsedContext.inputs.botName) {
        console.log("Using bot credentials for git authentication");
        gitUser = {
            login: parsedContext.inputs.botName,
            id: parsedContext.inputs.botId,
        };

    } else {
        console.log("Fetching authenticated user...");
        const { data: user } = await octokit.rest.users.getAuthenticated();
        gitUser = {
            login: user.login,
            id: String(user.id),
        };
    }

    // Determine the noreply email domain based on GITHUB_SERVER_URL
    const serverUrl = new URL(GITHUB_SERVER_URL);
    const noreplyDomain =
        serverUrl.hostname === "github.com"
            ? "users.noreply.github.com"
            : `users.noreply.${serverUrl.hostname}`;

    $`git config user.name "${gitUser.login}"`;
    $`git config user.email "${gitUser.id}+${gitUser.login}@${noreplyDomain}"`;

    // Remove the authorization header that actions/checkout sets
    console.log("Removing existing git authentication headers...");
    try {
        $`git config --unset-all http.${GITHUB_SERVER_URL}/.extraheader`;
        console.log("✓ Removed existing authentication headers");
    } catch (e) {
        console.log("No existing authentication headers to remove");
    }

    const owner = parsedContext.payload.repository.owner.login;
    const repo = parsedContext.payload.repository.name;
    const remoteUrl = `https://x-access-token:${githubToken}@${serverUrl.host}/${owner}/${repo}.git`;

    $`git remote set-url origin ${remoteUrl}`;
    console.log("Git authentication configured successfully");
}