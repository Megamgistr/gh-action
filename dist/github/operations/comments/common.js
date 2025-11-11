"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJobRunLink = createJobRunLink;
exports.createBranchLink = createBranchLink;
exports.createCommentBody = createCommentBody;
const config_1 = require("../../api/config");
const constants_1 = require("../../constants");
function createJobRunLink(owner, repo, runId) {
    const jobRunUrl = `${config_1.GITHUB_SERVER_URL}/${owner}/${repo}/actions/runs/${runId}`;
    return `[View job run](${jobRunUrl})`;
}
function createBranchLink(owner, repo, branchName) {
    const branchUrl = `${config_1.GITHUB_SERVER_URL}/${owner}/${repo}/tree/${branchName}`;
    return `\n[View branch](${branchUrl})`;
}
function createCommentBody(jobRunLink) {
    return `${constants_1.INIT_COMMENT_BODY}

${jobRunLink}`;
}
