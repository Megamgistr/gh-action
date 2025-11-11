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
exports.fetchGitHubData = fetchGitHubData;
exports.fetchUserDisplayName = fetchUserDisplayName;
const child_process_1 = require("child_process");
const github_1 = require("../api/queries/github");
function fetchGitHubData(_a) {
    return __awaiter(this, arguments, void 0, function* ({ octokits, repository, entityNumber, isPR }) {
        var _b, _c, _d;
        const [owner, repo] = repository.split("/");
        if (!owner || !repo) {
            throw new Error("Invalid repository format. Expected 'owner/repo'.");
        }
        let contextData = null;
        let ghComments = [];
        let changedFiles = [];
        let reviewData = [];
        // Prepare base data
        try {
            if (isPR) {
                const prResult = yield octokits.graphql(github_1.PR_QUERY, {
                    owner,
                    repo,
                    number: parseInt(entityNumber),
                });
                const pullRequest = prResult.repository.pullRequest;
                contextData = pullRequest;
                changedFiles = pullRequest.files.nodes || [];
                ghComments = ((_b = pullRequest.comments) === null || _b === void 0 ? void 0 : _b.nodes) || [];
                reviewData = ((_c = pullRequest.reviews) === null || _c === void 0 ? void 0 : _c.nodes) || [];
                console.log(`Successfully fetched PR #${entityNumber} data`);
            }
            else {
                // Fetch issue data
                const issueResult = yield octokits.graphql(github_1.ISSUE_QUERY, {
                    owner,
                    repo,
                    number: parseInt(entityNumber),
                });
                contextData = issueResult.repository.issue;
                ghComments = (_d = contextData === null || contextData === void 0 ? void 0 : contextData.comments) === null || _d === void 0 ? void 0 : _d.nodes;
                console.log(`Successfully fetched issue #${entityNumber} data`);
            }
        }
        catch (error) {
            console.error(`Failed to fetch ${isPR ? "PR" : "issue"} data:`, error);
            throw new Error(`Failed to fetch ${isPR ? "PR" : "issue"} data`);
        }
        // Compute SHAs for changed files. For PRs only
        let changedFilesWithSHA = [];
        if (isPR && changedFiles.length > 0) {
            changedFilesWithSHA = changedFiles.map((file) => {
                // Don't compute SHA for deleted files
                if (file.changeType === "DELETED") {
                    return Object.assign(Object.assign({}, file), { sha: "deleted" });
                }
                try {
                    // Use git hash-object to compute the SHA for the current file content
                    const sha = (0, child_process_1.execFileSync)("git", ["hash-object", file.path], {
                        encoding: "utf-8",
                    }).trim();
                    return Object.assign(Object.assign({}, file), { sha });
                }
                catch (error) {
                    console.warn(`Failed to compute SHA for ${file.path}:`, error);
                    // Return original file without SHA if computation fails
                    return Object.assign(Object.assign({}, file), { sha: "unknown" });
                }
            });
        }
        return {
            contextData,
            comments: ghComments,
            changedFiles,
            changedFilesWithSHA,
            reviewData
        };
    });
}
function fetchUserDisplayName(octokits, login) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield octokits.graphql(github_1.USER_QUERY, {
                login,
            });
            return result.user.name;
        }
        catch (error) {
            console.warn(`Failed to fetch user display name for ${login}:`, error);
            return null;
        }
    });
}
