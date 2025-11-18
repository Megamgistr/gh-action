import {GITHUB_SERVER_URL} from "../api/config";
import {GitHubContext} from "../context";
import {$} from "bun";

interface GitUser {
    login: string;
    email: string;
}

export async function gitAuth(githubToken: string, parsedContext: GitHubContext) {
    console.log("Configuring git authentication...");
    const defaultToken = process.env.DEFAULT_WORKFLOW_TOKEN;
    if (githubToken === defaultToken) {
        console.log("Using default token for git authentication");
        return;
    }
    const serverUrl = new URL(GITHUB_SERVER_URL);

    let gitUser: GitUser
    if (parsedContext.inputs.botId && parsedContext.inputs.botName) {
        console.log("Using bot credentials for git authentication");
        const noreplyDomain =
            serverUrl.hostname === "github.com"
                ? "users.noreply.github.com"
                : `users.noreply.${serverUrl.hostname}`;

        const email = `${parsedContext.inputs.botId}+${parsedContext.inputs.botName}@${noreplyDomain}`
        gitUser = {
            login: parsedContext.inputs.botName,
            email: email,
        };

    } else {
        console.log("Use actor credentials for git authentication");
        gitUser = {
            login: parsedContext.actor,
            email: parsedContext.actorEmail,
        };
    }

    $`git config user.name "${gitUser.login}"`;
    $`git config user.email "${gitUser.email}"`;

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