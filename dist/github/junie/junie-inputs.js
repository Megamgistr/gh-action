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
exports.prepareJunieInputs = prepareJunieInputs;
exports.exportResultsOutputs = exportResultsOutputs;
const context_1 = require("../context");
const core = __importStar(require("@actions/core"));
function prepareJunieInputs(context, mcpConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const junieTask = {};
        if (context.inputs.prompt) {
            junieTask.textTask = { text: context.inputs.prompt };
        }
        if (((0, context_1.isIssueCommentEvent)(context) && !context.isPR) || (0, context_1.isIssuesEvent)(context)) {
            junieTask.gitHubIssue = { url: context.payload.issue.html_url };
        }
        if ((0, context_1.isIssueCommentEvent)(context) && context.isPR) {
            junieTask.gitHubPullRequestComment =
                {
                    pullRequestUrl: context.payload.issue.pull_request.html_url,
                    url: context.payload.comment.html_url
                };
        }
        if ((0, context_1.isPullRequestReviewEvent)(context)) {
            junieTask.gitHubPullRequestReview = { url: context.payload.review.html_url };
        }
        if ((0, context_1.isPullRequestReviewCommentEvent)(context)) {
            junieTask.gitHubPullRequestComment =
                {
                    pullRequestUrl: context.payload.pull_request.html_url,
                    url: context.payload.comment.html_url
                };
        }
        if ((0, context_1.isPullRequestEvent)(context)) {
            junieTask.gitHubPullRequest = { url: context.payload.pull_request.html_url };
        }
        core.setOutput('EJ_CLI_TOKEN', context.inputs.appToken);
        core.setOutput('EJ_TASK', JSON.stringify(junieTask));
        core.setOutput('EJ_MCP_CONFIG', mcpConfig);
        // core.setOutput('EJ_TASK_TEXT', junieTaskText);
    });
}
function exportResultsOutputs(junieTitle, junieSummary, commitMessage, prTitle, prBody) {
    core.setOutput('JUNIE_TITLE', junieTitle);
    core.setOutput('JUNIE_SUMMARY', junieSummary);
    if (commitMessage) {
        core.setOutput('COMMIT_MESSAGE', commitMessage);
    }
    if (prTitle && prBody) {
        core.setOutput('PR_TITLE', prTitle);
        core.setOutput('PR_BODY', prBody);
    }
}
