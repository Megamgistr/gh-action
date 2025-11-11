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
exports.writeInitialFeedbackComment = writeInitialFeedbackComment;
exports.writeFinishFeedbackComment = writeFinishFeedbackComment;
const core = __importStar(require("@actions/core"));
const common_1 = require("./common");
const context_1 = require("../../context");
const client_1 = require("../../api/client");
const constants_1 = require("../../constants");
const config_1 = require("../../api/config");
function writeInitialFeedbackComment(octokit, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const { owner, name } = context.payload.repository;
        const ownerLogin = owner.login;
        const jobRunLink = (0, common_1.createJobRunLink)(ownerLogin, name, context.runId);
        const initialBody = (0, common_1.createCommentBody)(jobRunLink);
        try {
            let response;
            if ((0, context_1.isPullRequestReviewCommentEvent)(context)) {
                response = yield octokit.rest.pulls.createReplyForReviewComment({
                    owner: ownerLogin,
                    repo: name,
                    pull_number: context.entityNumber,
                    comment_id: context.payload.comment.id,
                    body: initialBody,
                });
            }
            else if (context.entityNumber) {
                response = yield octokit.rest.issues.createComment({
                    owner: ownerLogin,
                    repo: name,
                    issue_number: context.entityNumber,
                    body: initialBody,
                });
            }
            else {
                console.log(`Skip creating initial comment for ${context.eventName} event`);
                return;
            }
            console.log(`Created initial comment with ID: ${response.data.id}`);
            const initCommentId = response.data.id;
            core.setOutput('INIT_COMMENT_ID', initCommentId);
            return initCommentId;
        }
        catch (error) {
            console.error("Error in initial comment:", error);
            throw error;
        }
    });
}
function writeFinishFeedbackComment(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const { owner, name } = data.parsedContext.payload.repository;
        const ownerLogin = owner.login;
        const repoFullName = `${ownerLogin}/${name}`;
        let feedbackBody;
        if (data.isJobFailed) {
            feedbackBody = getFailedBody(ownerLogin, name, data.parsedContext.runId, data.failureData);
        }
        else {
            feedbackBody = getSuccessBody(repoFullName, data.successData);
        }
        if (!feedbackBody) {
            console.log('No feedback body - skipping feedback');
            return;
        }
        const octokit = (0, client_1.createOctokit)(data.githubToken);
        const isReviewComment = (0, context_1.isPullRequestReviewCommentEvent)(data.parsedContext);
        const initCommentId = data.initCommentId;
        console.log(`Updating comment ${initCommentId} (review comment: ${isReviewComment})`);
        if (isReviewComment) {
            yield octokit.rest.pulls.updateReviewComment({
                owner: ownerLogin,
                repo: name,
                comment_id: +initCommentId,
                body: feedbackBody,
            });
        }
        else {
            yield octokit.rest.issues.updateComment({
                owner: ownerLogin,
                repo: name,
                comment_id: +initCommentId,
                body: feedbackBody,
            });
        }
        console.log('Feedback comment updated successfully');
    });
}
function getFailedBody(owner, repoName, runId, failureData) {
    const details = failureData.error || "Check job logs for more details";
    const jobLink = (0, common_1.createJobRunLink)(owner, repoName, runId);
    return `${(0, constants_1.ERROR_FEEDBACK_COMMENT_TEMPLATE)(details, jobLink)}`;
}
function getSuccessBody(repoFullName, successData) {
    let result;
    switch (successData.actionToDo) {
        case "COMMIT_CHANGES":
            console.log(`Commit pushed to current branch: ${successData.commitSHA}`);
            result = (0, constants_1.COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE)(successData.commitSHA, successData.junieTitle, successData.junieSummary);
            break;
        case "CREATE_PR":
            if (successData.prLink) {
                console.log(`PR was created: ${successData.prLink}`);
                result = (0, constants_1.PR_CREATED_FEEDBACK_COMMENT_TEMPLATE)(successData.prLink);
            }
            else {
                console.log(`Create PR manually`);
                const createPRLink = `${config_1.GITHUB_SERVER_URL}/${repoFullName}/compare/${successData.baseBranch}...${successData.workingBranch}`;
                result = (0, constants_1.MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE)(createPRLink);
            }
            break;
        case "WRITE_COMMENT":
            console.log('No PR or commit - using Junie result');
            result = (0, constants_1.SUCCESS_FEEDBACK_COMMENT_WITH_RESULT)(successData.junieTitle || 'Task completed', successData.junieSummary || 'No additional details');
            break;
    }
    return result;
}
