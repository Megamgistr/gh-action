#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const rest_1 = require("@octokit/rest");
const checks_1 = require("../github/operations/checks");
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const HEAD_SHA = process.env.HEAD_SHA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = process.env.GITHUB_API_URL;
function log(message) {
    console.log(`[GitHub Checks Server] ${message}`);
}
function logError(message) {
    console.error(`[GitHub Checks Server] ${message}`);
}
if (!REPO_OWNER || !REPO_NAME || !HEAD_SHA || !GITHUB_TOKEN || !GITHUB_API_URL) {
    logError("REPO_OWNER, REPO_NAME, HEAD_SHA, GITHUB_API_URL and GITHUB_TOKEN environment variables are required");
    process.exit(1);
}
const server = new mcp_js_1.McpServer({
    name: "GitHub Checks Server",
    version: "1.0.0",
});
log("instance created");
server.tool("get_pr_failed_checks_info", "Get detailed information about failed checks for a Pull Request, including extracted error logs", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new rest_1.Octokit({
            auth: GITHUB_TOKEN,
            baseUrl: GITHUB_API_URL,
        });
        // Extract failed checks info using the new function
        log(`Extracting failed checks info...`);
        const failedChecksResult = yield (0, checks_1.extractFailedChecksInfo)(client, REPO_OWNER, REPO_NAME, HEAD_SHA, 19000);
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
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
}));
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transport = new stdio_js_1.StdioServerTransport();
            yield server.connect(transport);
            process.on("exit", () => {
                server.close();
            });
        }
        catch (error) {
            throw error;
        }
    });
}
runServer().catch(() => {
    process.exit(1);
});
