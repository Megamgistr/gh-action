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
exports.gitAuth = gitAuth;
const config_1 = require("../api/config");
const bun_1 = require("bun");
function gitAuth(githubToken, parsedContext) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Configuring git authentication...");
        const defaultToken = process.env.DEFAULT_WORKFLOW_TOKEN;
        if (githubToken === defaultToken) {
            console.log("Using default token for git authentication");
            return;
        }
        const serverUrl = new URL(config_1.GITHUB_SERVER_URL);
        let gitUser;
        if (parsedContext.inputs.botId && parsedContext.inputs.botName) {
            console.log("Using bot credentials for git authentication");
            const noreplyDomain = serverUrl.hostname === "github.com"
                ? "users.noreply.github.com"
                : `users.noreply.${serverUrl.hostname}`;
            const email = `${parsedContext.inputs.botId}+${parsedContext.inputs.botName}@${noreplyDomain}`;
            gitUser = {
                login: parsedContext.inputs.botName,
                email: email,
            };
        }
        else {
            console.log("Use actor credentials for git authentication");
            gitUser = {
                login: parsedContext.actor,
                email: parsedContext.actorEmail,
            };
        }
        (0, bun_1.$) `git config user.name "${gitUser.login}"`;
        (0, bun_1.$) `git config user.email "${gitUser.email}"`;
        // Remove the authorization header that actions/checkout sets
        console.log("Removing existing git authentication headers...");
        try {
            (0, bun_1.$) `git config --unset-all http.${config_1.GITHUB_SERVER_URL}/.extraheader`;
            console.log("✓ Removed existing authentication headers");
        }
        catch (e) {
            console.log("No existing authentication headers to remove");
        }
        const owner = parsedContext.payload.repository.owner.login;
        const repo = parsedContext.payload.repository.name;
        const remoteUrl = `https://x-access-token:${githubToken}@${serverUrl.host}/${owner}/${repo}.git`;
        (0, bun_1.$) `git remote set-url origin ${remoteUrl}`;
        console.log("Git authentication configured successfully");
    });
}
