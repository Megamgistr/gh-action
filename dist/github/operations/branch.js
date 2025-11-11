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
exports.setupBranch = setupBranch;
const core = __importStar(require("@actions/core"));
const bun_1 = require("bun");
const context_1 = require("../context");
const constants_1 = require("../constants");
function createNewBranch(baseBranch, branchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const newBranch = branchName.toLowerCase().substring(0, 50);
        try {
            yield (0, bun_1.$) `pwd`;
            console.log(`Current work dir ${process.env.GITHUB_WORKSPACE}`);
            console.log(`Creating new branch ${newBranch}`);
            yield (0, bun_1.$) `git fetch origin ${baseBranch} --depth=1`;
            yield (0, bun_1.$) `git checkout ${baseBranch}`;
            console.log(`Successfully created and checked out new branch: ${newBranch}`);
            return {
                baseBranch: baseBranch,
                currentBranch: baseBranch,
                workingBranch: newBranch,
            };
        }
        catch (error) {
            console.error("Error in branch setup:", error);
            process.exit(1);
        }
    });
}
function setupWorkingBranch(baseBranch, context, octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        const entityNumber = context.entityNumber;
        const isPR = context.isPR;
        if (isPR && entityNumber) {
            let targetBranch;
            let state;
            if ((0, context_1.isPullRequestEvent)(context)
                || (0, context_1.isPullRequestReviewEvent)(context)
                || (0, context_1.isPullRequestReviewCommentEvent)(context)) {
                targetBranch = context.payload.pull_request.head.ref;
                state = context.payload.pull_request.state;
            }
            else {
                const data = (yield octokit.rest.pulls.get({
                    owner: context.payload.repository.owner.login,
                    repo: context.payload.repository.name,
                    pull_number: entityNumber,
                })).data;
                targetBranch = data.head.ref;
                state = data.state;
            }
            console.log(`Target branch: ${targetBranch}`);
            if (state === "CLOSED" || state === "MERGED") {
                console.log(`PR #${entityNumber} is ${state}, creating new branch`);
            }
            else {
                const fetchDepth = 20;
                yield (0, bun_1.$) `git fetch origin --depth=${fetchDepth} ${targetBranch}`;
                yield (0, bun_1.$) `git checkout ${targetBranch} --`;
                console.log(`Successfully checked out PR branch for PR #${entityNumber}`);
                return {
                    currentBranch: targetBranch,
                    baseBranch: baseBranch,
                    workingBranch: targetBranch,
                };
            }
        }
        const entityType = isPR ? "pr" : entityNumber ? "issue" : "run";
        const branchName = `${constants_1.WORKING_BRANCH_PREFIX}${entityType}-${entityNumber || context.runId}`;
        return yield createNewBranch(baseBranch, branchName);
    });
}
function setupBranch(octokit, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseBranch = context.inputs.baseBranch || context.payload.repository.default_branch;
        console.log(`Base branch: ${baseBranch}. From input ${context.inputs.baseBranch}`);
        let branchInfo = yield setupWorkingBranch(baseBranch, context, octokit);
        core.setOutput('BASE_BRANCH', branchInfo.baseBranch);
        core.setOutput('WORKING_BRANCH', branchInfo.workingBranch);
        core.setOutput("CURRENT_BRANCH", branchInfo.currentBranch);
        return branchInfo;
    });
}
