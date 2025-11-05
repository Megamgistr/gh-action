#!/usr/bin/env bun

import * as core from "@actions/core";
import {setupGitHubToken} from "../github/token";
import {checkWritePermissions} from "../github/validation/permissions";
import {createOctokit} from "../github/api/client";
import {parseGitHubContext, isEntityContext } from "../github/context";
import {prepare} from "../github/junie/prepare-junie";

async function run() {
    try {
        const githubToken = await setupGitHubToken();
        const octokit = createOctokit(githubToken);
        const context = parseGitHubContext();
        console.log("Parsed context:", context);

        if (isEntityContext(context)) {
            const hasWritePermissions = await checkWritePermissions(
                octokit.rest,
                context,
            );
            if (!hasWritePermissions) {
                throw new Error(
                    "Actor does not have write permissions to the repository",
                );
            }
        }

        await prepare({
            context,
            octokit
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
