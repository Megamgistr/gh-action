import {GITHUB_SERVER_URL} from "../api/config";
import {GitHubContext} from "../context";
import {$} from "bun";
import type {Octokits} from "../api/client";
import {GITHUB_ACTIONS_BOT} from "../constants";
import type {GitHubTokenConfig} from "../token";

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
 *
 * For custom tokens, queries GitHub API to get owner details (user, bot, or organization).
 * For default GITHUB_TOKEN, returns well-known github-actions[bot] credentials to avoid
 * unnecessary API calls (default token has limited permissions).
 *
 * @param octokit - Octokit clients for GitHub API
 * @param tokenConfig - Token configuration (default or custom)
 * @returns Token owner information (login, id, type)
 * @throws {Error} if unable to authenticate with the provided token
 */
export async function getTokenOwnerInfo(octokit: Octokits, tokenConfig: GitHubTokenConfig): Promise<TokenOwner> {
    try {
        // Default GITHUB_TOKEN has limited permissions and can't read user info
        // Return well-known github-actions bot credentials to avoid unnecessary API call
        if (tokenConfig.isDefaultToken()) {
            console.log("Using default GITHUB_TOKEN - skipping token owner API call (insufficient permissions)");
            return GITHUB_ACTIONS_BOT;
        }

        // For custom tokens (PATs, GitHub App tokens), fetch owner information from API
        console.log("Using custom token - fetching token owner info");
        const { data } = await octokit.rest.users.getAuthenticated();

        console.log(`Token owner: ${data.login} (ID: ${data.id}, Type: ${data.type})`);

        // Map GitHub API types to our internal type system
        // GitHub API can return: "User", "Bot", "Organization"
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

/**
 * Configures git authentication for pushing commits and creating branches.
 *
 * For default GITHUB_TOKEN: Uses credentials already set by actions/checkout, no changes needed.
 * For custom tokens: Configures git user credentials and remote URL with token authentication.
 *
 * Git user setup logic:
 * - For bots/apps: Use noreply email format (id+login@users.noreply.github.com)
 * - For human users: Use actor's credentials from GitHub context
 *
 * @param parsedContext - GitHub context with token owner and actor information
 * @param tokenConfig - Token configuration (default or custom)
 * @throws {Error} if git configuration fails (git not installed, permission issues)
 */
export async function gitAuth(parsedContext: GitHubContext, tokenConfig: GitHubTokenConfig) {
    console.log("Configuring git authentication...");

    // Default token: actions/checkout already configured git, nothing to do
    if (tokenConfig.isDefaultToken()) {
        console.log("Using default token for git authentication");
        return;
    }

    const serverUrl = new URL(GITHUB_SERVER_URL);

    let gitUser: GitUser;
    const tokenOwner = parsedContext.tokenOwner;

    // Determine which credentials to use for git commits
    // Bots/Apps should commit as themselves, not as the human actor
    if (tokenOwner.type === "Bot" || tokenOwner.type === "Organization") {
        console.log(`Using token owner (${tokenOwner.type.toLowerCase()}) credentials for git authentication: ${tokenOwner.login}`);

        // Generate GitHub noreply email address for bots
        // Format: {id}+{login}@users.noreply.github.com
        // Example: 41898282+github-actions[bot]@users.noreply.github.com
        const noreplyDomain =
            serverUrl.hostname === "github.com"
                ? "users.noreply.github.com"
                : `users.noreply.${serverUrl.hostname}`; // For GitHub Enterprise

        const email = `${tokenOwner.id}+${tokenOwner.login}@${noreplyDomain}`;
        gitUser = {
            login: tokenOwner.login,
            email: email,
        };
    } else {
        // For human users with custom PATs, use their actual credentials
        console.log("Using actor credentials for git authentication");
        gitUser = {
            login: parsedContext.actor,
            email: parsedContext.actorEmail,
        };
    }

    try {
        await $`git config user.name "${gitUser.login}"`;
        await $`git config user.email "${gitUser.email}"`;
        console.log(`✓ Git user configured: ${gitUser.login} <${gitUser.email}>`);
    } catch (error) {
        throw new Error(
            `❌ Failed to configure git user credentials. ` +
            `This could be due to:\n` +
            `• Git is not installed or not in PATH\n` +
            `• Insufficient permissions to modify git config\n` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
        );
    }

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
    const remoteUrl = `https://x-access-token:${tokenConfig.workingToken}@${serverUrl.host}/${owner}/${repo}.git`;

    try {
        await $`git remote set-url origin ${remoteUrl}`;
        console.log("✓ Git authentication configured successfully");
    } catch (error) {
        throw new Error(
            `❌ Failed to configure git remote URL for authentication. ` +
            `This could be due to:\n` +
            `• Git remote 'origin' does not exist\n` +
            `• Insufficient permissions to modify git config\n` +
            `• Invalid repository URL format\n` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}