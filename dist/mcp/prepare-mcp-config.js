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
exports.prepareMcpConfig = prepareMcpConfig;
const config_1 = require("../github/api/config");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const os_1 = require("os");
function prepareMcpConfig(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { githubToken, owner, repo, currentBranch, allowedMcpServers, } = params;
        const hasGHCheksServer = allowedMcpServers.some((name) => name == "mcp_github_checks_server");
        const baseMcpConfig = {
            mcpServers: {},
        };
        if (hasGHCheksServer) {
            baseMcpConfig.mcpServers.github_checks = {
                command: "bun",
                args: [
                    "run",
                    `${process.env.GITHUB_ACTION_PATH}/src/mcp/github-checks-server.ts`,
                ],
                env: {
                    GITHUB_API_URL: config_1.GITHUB_API_URL,
                    GITHUB_TOKEN: githubToken,
                    REPO_OWNER: owner,
                    REPO_NAME: repo,
                    HEAD_SHA: currentBranch,
                },
            };
        }
        const configJsonString = JSON.stringify(baseMcpConfig, null, 2);
        // Create ~/.junie directory if it doesn't exist
        const junieDir = (0, path_1.join)((0, os_1.homedir)(), '.junie');
        yield (0, promises_1.mkdir)(junieDir, { recursive: true });
        // Write mcp.json config file to ~/.junie/mcp.json
        const mcpConfigPath = (0, path_1.join)(junieDir, 'mcp.json');
        yield (0, promises_1.writeFile)(mcpConfigPath, configJsonString, 'utf-8');
        console.log(`MCP config written to: ${mcpConfigPath}`);
        return configJsonString;
    });
}
