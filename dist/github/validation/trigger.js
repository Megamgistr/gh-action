#!/usr/bin/env bun
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkContainsTrigger = checkContainsTrigger;
exports.escapeRegExp = escapeRegExp;
const context_1 = require("../context");
function checkContainsTrigger(context) {
    var _a, _b;
    const { inputs: { assigneeTrigger, labelTrigger, triggerPhrase }, } = context;
    const triggerPhraseRegex = new RegExp(`(^|\\s)${escapeRegExp(triggerPhrase)}([\\s.,!?;:]|$)`);
    if ((0, context_1.isIssuesAssignedEvent)(context)) {
        let triggerUser = assigneeTrigger.replace(/^@/, "");
        const assigneeUsername = ((_a = context.payload.assignee) === null || _a === void 0 ? void 0 : _a.login) || "";
        if (triggerUser && assigneeUsername === triggerUser) {
            console.log(`Issue assigned to trigger user '${triggerUser}'`);
            return true;
        }
    }
    if ((0, context_1.isIssuesEvent)(context) && context.eventAction === "labeled") {
        const labelName = ((_b = context.payload.label) === null || _b === void 0 ? void 0 : _b.name) || "";
        if (labelTrigger && labelName === labelTrigger) {
            console.log(`Issue labeled with trigger label '${labelTrigger}'`);
            return true;
        }
    }
    if ((0, context_1.isIssuesEvent)(context) && context.eventAction === "opened") {
        const issueBody = context.payload.issue.body || "";
        const issueTitle = context.payload.issue.title || "";
        if (triggerPhraseRegex.test(issueBody)) {
            console.log(`Issue body contains exact trigger phrase '${triggerPhrase}'`);
            return true;
        }
        if (triggerPhraseRegex.test(issueTitle)) {
            console.log(`Issue title contains exact trigger phrase '${triggerPhrase}'`);
            return true;
        }
    }
    if ((0, context_1.isPullRequestEvent)(context)) {
        const prBody = context.payload.pull_request.body || "";
        const prTitle = context.payload.pull_request.title || "";
        if (triggerPhraseRegex.test(prBody)) {
            console.log(`Pull request body contains exact trigger phrase '${triggerPhrase}'`);
            return true;
        }
        if (triggerPhraseRegex.test(prTitle)) {
            console.log(`Pull request title contains exact trigger phrase '${triggerPhrase}'`);
            return true;
        }
    }
    if ((0, context_1.isPullRequestReviewEvent)(context) &&
        (context.eventAction === "submitted" || context.eventAction === "edited")) {
        const reviewBody = context.payload.review.body || "";
        if (triggerPhraseRegex.test(reviewBody)) {
            console.log(`Pull request review contains exact trigger phrase '${triggerPhrase}'`);
            return true;
        }
    }
    if ((0, context_1.isIssueCommentEvent)(context) ||
        (0, context_1.isPullRequestReviewCommentEvent)(context)) {
        const commentBody = context.payload.comment.body;
        if (triggerPhraseRegex.test(commentBody)) {
            console.log(`Comment contains exact trigger phrase '${triggerPhrase}'`);
            return true;
        }
    }
    console.log(`No trigger was met for ${triggerPhrase}`);
    return false;
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
