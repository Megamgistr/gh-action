#!/usr/bin/env bun
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const core = __importStar(require("@actions/core"));
const token_1 = require("../github/token");
const permissions_1 = require("../github/validation/permissions");
const client_1 = require("../github/api/client");
const context_1 = require("../github/context");
const prepare_junie_1 = require("../github/junie/prepare-junie");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const githubToken = yield (0, token_1.setupGitHubToken)();
            const octokit = (0, client_1.createOctokit)(githubToken);
            const context = (0, context_1.parseGitHubContext)();
            console.log("Parsed context:", context);
            if ((0, context_1.isEntityContext)(context)) {
                const hasWritePermissions = yield (0, permissions_1.checkWritePermissions)(octokit.rest, context);
                if (!hasWritePermissions) {
                    throw new Error("Actor does not have write permissions to the repository");
                }
            }
            yield (0, prepare_junie_1.prepare)({
                context,
                octokit,
                githubToken
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            core.setFailed(`Prepare step failed with error: ${errorMessage}`);
            core.setOutput("EXCEPTION", errorMessage);
            process.exit(1);
        }
    });
}
// @ts-ignore
if (import.meta.main) {
    run();
}
