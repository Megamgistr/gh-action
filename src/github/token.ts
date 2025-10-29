#!/usr/bin/env bun

import * as core from "@actions/core";
import {retryWithBackoff} from "../utils/retry";

async function getOidcToken(): Promise<string> {
  try {
    return await core.getIDToken("junie-github-action");
  } catch (error) {
    console.error("Failed to get OIDC token:", error);
    throw new Error(
      "Could not fetch an OIDC token. Maybe you need to add `id-token: write` to your workflow permissions",
    );
  }
}

async function exchangeForAppToken(oidcToken: string): Promise<string> {
  const response = await fetch(
    "https://junie-carmen.labs.jb.gg/api/public/github/get-app-token",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${oidcToken}`,
      },
    },
  );

  if (!response.ok) {
    const responseJson = (await response.json()) as {
      error: {
        message: string;
        error_code: string;
      };
    };

    const errorCode = responseJson.error.error_code;

    if (errorCode === "workflow_is_not_in_default_branch") {
      core.warning(`Skipping action due to workflow validation: ${responseJson.error?.message}`);
      console.log("Action skipped due to workflow file is not in the default branch");
      process.exit(0);
    }

    console.error(
      `Failed to obtain app token: ${response.status} ${response.statusText} - ${responseJson.error.message}`,
    );
    throw new Error(`${responseJson.error.message}`);
  }

  const appTokenData = (await response.json()) as {
    app_token: string;
  };

  return  appTokenData.app_token;
}

export async function setupGitHubToken(): Promise<string> {
  try {
    const providedToken = process.env.OVERRIDE_GITHUB_TOKEN;

    if (providedToken) {
      console.log("Using provided GITHUB_TOKEN for authentication");
      return providedToken;
    }

    const defaultWFToken = process.env.DEFAULT_WORKFLOW_TOKEN;

    if (defaultWFToken) {
        console.log("Using DEFAULT_WORKFLOW_TOKEN for authentication");
        return defaultWFToken;
    }

    console.log("Requesting OIDC token...");
    const oidcToken = await retryWithBackoff(() => getOidcToken());

    console.log("Exchanging OIDC token for app token...");
    const appToken = await retryWithBackoff(() =>
      exchangeForAppToken(oidcToken),
    );

    console.log("Using GITHUB_TOKEN from OIDC");
    return appToken;
  } catch (error) {
    core.setFailed(
      `Failed to setup GitHub token: ${error}\n\nIf you instead wish to use this action with a custom GitHub token or custom GitHub app, provide a \`github_token\` in the \`uses\` section of the app in your workflow yml file.`,
    );
    process.exit(1);
  }
}
