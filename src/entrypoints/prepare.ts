#!/usr/bin/env bun

import * as core from "@actions/core";
import {setupGitHubToken} from "../github/token";
import {createOctokit} from "../github/api/client";
import {parseGitHubContext} from "../github/context";
import {prepare} from "../github/junie/prepare-junie";
import {fetchTokenOwnerInfo} from "../github/operations/auth";

async function run() {
    try {
        const githubToken = await setupGitHubToken();
        const octokit = createOctokit(githubToken);
        const tokenOwner = await fetchTokenOwnerInfo(octokit);

        const context = parseGitHubContext(tokenOwner);
        console.log("Parsed context:", context);

        await prepare({
            context,
            octokit,
            githubToken
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.setFailed(`Prepare step failed with error: ${errorMessage}`);
        core.setOutput("EXCEPTION", errorMessage);
        process.exit(1);
    }
}

// @ts-ignore
if (import.meta.main) {
    run();
}
