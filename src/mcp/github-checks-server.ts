#!/usr/bin/env node

import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {Octokit} from "@octokit/rest";
import {extractFailedChecksInfo} from "../github/operations/checks";

const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const HEAD_SHA = process.env.HEAD_SHA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = process.env.GITHUB_API_URL;

function log(message: string) {
    console.log(`[GitHub Checks Server] ${message}`);
}
function logError(message: string) {
    console.error(`[GitHub Checks Server] ${message}`);
}

if (!REPO_OWNER || !REPO_NAME || !HEAD_SHA || !GITHUB_TOKEN || !GITHUB_API_URL) {
    logError("REPO_OWNER, REPO_NAME, HEAD_SHA, GITHUB_API_URL and GITHUB_TOKEN environment variables are required");
    process.exit(1);
}

const server = new McpServer({
    name: "GitHub Checks Server",
    version: "1.0.0",
});

log("instance created");


server.tool(
    "get_pr_failed_checks_info",
    "Get detailed information about failed checks for a Pull Request, including extracted error logs",
    async () => {
        try {
            const client = new Octokit({
                auth: GITHUB_TOKEN,
                baseUrl: GITHUB_API_URL,
            });

            // Extract failed checks info using the new function
            log(`Extracting failed checks info...`);
            const failedChecksResult = await extractFailedChecksInfo(
                client,
                REPO_OWNER!,
                REPO_NAME!,
                HEAD_SHA,
                19000
            );

            if (!failedChecksResult || failedChecksResult.failedChecks.length === 0) {
                log(`No failed checks found`);
                return {
                    content: [
                        {
                            type: "text",
                            text: "No failed checks found"
                        }
                    ],
                };
            }

            log(`Found ${failedChecksResult.failedChecks.length} failed checks`);

            return {
                content: [
                    {
                        type: "text",
                        text: failedChecksResult.combinedOutput,
                    },
                ],
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            logError(errorMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${errorMessage}`,
                    },
                ],
                error: errorMessage,
                isError: true,
            };
        }
    },
);

async function runServer() {
    try {
        const transport = new StdioServerTransport();

        await server.connect(transport);

        process.on("exit", () => {
            server.close();
        });
    } catch (error) {
        throw error;
    }
}

runServer().catch(() => {
    process.exit(1);
});
