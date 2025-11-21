import {GITHUB_SERVER_URL} from "../api/config";
import {GitHubContext} from "../context";
import {$} from "bun";
import type {Octokits} from "../api/client";

interface GitUser {
    login: string;
    email: string;
}

export interface TokenOwner {
    login: string;
    id: number;
    type: "User" | "Bot" | "Organization";
}

/**
 * Fetches information about the owner of the provided GitHub token.
 * This can be a user, bot, or GitHub App installation.
 */
export async function fetchTokenOwnerInfo(octokit: Octokits): Promise<TokenOwner> {
    try {
        const { data } = await octokit.rest.users.getAuthenticated();

        console.log(`Token owner: ${data.login} (ID: ${data.id}, Type: ${data.type})`);

        // Map GitHub API types to our internal types
        let type: TokenOwner["type"];
        if (data.type === "Bot") {
            type = "Bot";
        } else if (data.type === "Organization") {
            type = "Organization";
        } else {
            type = "User";
        }

        return {
            login: data.login,
            id: data.id,
            type,
        };
    } catch (error) {
        console.error("Failed to fetch token owner info:", error);
        throw new Error(`Unable to authenticate with provided token: ${error}`);
    }
}

export async function gitAuth(githubToken: string, parsedContext: GitHubContext) {
    console.log("Configuring git authentication...");
    const defaultToken = process.env.DEFAULT_WORKFLOW_TOKEN;
    if (githubToken === defaultToken) {
        console.log("Using default token for git authentication");
        return;
    }
    const serverUrl = new URL(GITHUB_SERVER_URL);

    let gitUser: GitUser;
    const tokenOwner = parsedContext.tokenOwner;

    // Check if token owner is a bot or organization (GitHub App)
    if (tokenOwner.type === "Bot" || tokenOwner.type === "Organization") {
        console.log(`Using token owner (${tokenOwner.type.toLowerCase()}) credentials for git authentication: ${tokenOwner.login}`);
        const noreplyDomain =
            serverUrl.hostname === "github.com"
                ? "users.noreply.github.com"
                : `users.noreply.${serverUrl.hostname}`;

        const email = `${tokenOwner.id}+${tokenOwner.login}@${noreplyDomain}`;
        gitUser = {
            login: tokenOwner.login,
            email: email,
        };
    } else {
        console.log("Using actor credentials for git authentication");
        gitUser = {
            login: parsedContext.actor,
            email: parsedContext.actorEmail,
        };
    }

    await $`git config user.name "${gitUser.login}"`;
    await $`git config user.email "${gitUser.email}"`;

    // Remove the authorization header that actions/checkout sets
    console.log("Removing existing git authentication headers...");
    try {
        await $`git config --unset-all http.${GITHUB_SERVER_URL}/.extraheader`;
        console.log("✓ Removed existing authentication headers");
    } catch (e) {
        console.log("No existing authentication headers to remove");
    }

    const owner = parsedContext.payload.repository.owner.login;
    const repo = parsedContext.payload.repository.name;
    const remoteUrl = `https://x-access-token:${githubToken}@${serverUrl.host}/${owner}/${repo}.git`;

    await $`git remote set-url origin ${remoteUrl}`;
    console.log("Git authentication configured successfully");
}