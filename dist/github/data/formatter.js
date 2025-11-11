"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatContext = formatContext;
exports.formatBody = formatBody;
exports.formatComments = formatComments;
exports.formatReviewComments = formatReviewComments;
exports.formatChangedFiles = formatChangedFiles;
exports.formatChangedFilesWithSHA = formatChangedFilesWithSHA;
const sanitizer_1 = require("../../utils/sanitizer");
function formatContext(contextData, isPR) {
    if (isPR) {
        const prData = contextData;
        return `PR Title: ${prData.title}
PR Author: ${prData.author.login}
PR Branch: ${prData.headRefName} -> ${prData.baseRefName}
PR State: ${prData.state}
PR Additions: ${prData.additions}
PR Deletions: ${prData.deletions}
Total Commits: ${prData.commits.totalCount}
Changed Files: ${prData.files.nodes.length} files`;
    }
    else {
        const issueData = contextData;
        return `Issue Title: ${issueData.title}
Issue Author: ${issueData.author.login}
Issue State: ${issueData.state}`;
    }
}
function formatBody(body) {
    let processedBody = body;
    processedBody = (0, sanitizer_1.sanitizeContent)(processedBody);
    return processedBody;
}
function formatComments(comments) {
    return comments
        .filter((comment) => !comment.isMinimized)
        .map((comment) => {
        let body = comment.body;
        body = (0, sanitizer_1.sanitizeContent)(body);
        return `[${comment.author.login} at ${comment.createdAt}]: ${body}`;
    })
        .join("\n\n");
}
function formatReviewComments(reviewData) {
    if (reviewData.length === 0) {
        return "";
    }
    const formattedReviews = reviewData.map((review) => {
        let reviewOutput = `[Review by ${review.author.login} at ${review.submittedAt}]: ${review.state}`;
        if (review.body && review.body.trim()) {
            let body = review.body;
            const sanitizedBody = (0, sanitizer_1.sanitizeContent)(body);
            reviewOutput += `\n${sanitizedBody}`;
        }
        if (review.comments &&
            review.comments.nodes &&
            review.comments.nodes.length > 0) {
            const comments = review.comments.nodes
                .filter((comment) => !comment.isMinimized)
                .map((comment) => {
                let body = comment.body;
                body = (0, sanitizer_1.sanitizeContent)(body);
                return `  [Comment on ${comment.path}:${comment.line || "?"}]: ${body}`;
            })
                .join("\n");
            if (comments) {
                reviewOutput += `\n${comments}`;
            }
        }
        return reviewOutput;
    });
    return formattedReviews.join("\n\n");
}
function formatChangedFiles(changedFiles) {
    return changedFiles
        .map((file) => `- ${file.path} (${file.changeType}) +${file.additions}/-${file.deletions}`)
        .join("\n");
}
function formatChangedFilesWithSHA(changedFiles) {
    return changedFiles
        .map((file) => `- ${file.path} (${file.changeType}) +${file.additions}/-${file.deletions} SHA: ${file.sha}`)
        .join("\n");
}
