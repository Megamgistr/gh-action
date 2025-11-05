#!/usr/bin/env bun
import * as core from "@actions/core";

export async function setupGitHubToken(): Promise<string> {
    let token
    const providedToken = process.env.OVERRIDE_GITHUB_TOKEN;

    if (providedToken) {
        console.log("Using provided OVERRIDE_GITHUB_TOKEN for authentication");
        token =  providedToken;
    } else {
        console.log("Using DEFAULT_WORKFLOW_TOKEN for authentication");
        token =  process.env.DEFAULT_WORKFLOW_TOKEN!;
    }

    core.setOutput("EJ_AUTH_GITHUB_TOKEN", token);
    return token;
}
