#!/usr/bin/env bun

import type {Octokit} from "@octokit/rest";
import type {ParsedGitHubContext} from "../context";

export async function checkHumanActor(
    octokit: Octokit,
    githubContext: ParsedGitHubContext,
) {
    const {data: userData} = await octokit.users.getByUsername({
        username: githubContext.actor,
    });

    const actorType = userData.type;

    console.log(`Actor type: ${actorType}`);

    if (actorType !== "User") {
        const botName = githubContext.actor.toLowerCase().replace(/\[bot\]$/, "");
        throw new Error(
            `Workflow initiated by non-human actor: ${botName} (type: ${actorType})`,
        );
    }

    console.log(`Verified human actor: ${githubContext.actor}`);
}
