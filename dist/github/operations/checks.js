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
exports.extractFailedChecksInfo = extractFailedChecksInfo;
exports.extractRelevantInfo = extractRelevantInfo;
const core = __importStar(require("@actions/core"));
function extractFailedChecksInfo(octokit_1, owner_1, repo_1, ref_1) {
    return __awaiter(this, arguments, void 0, function* (octokit, owner, repo, ref, maxLength = 19000) {
        console.log(`Extracting failed checks for ${owner}/${repo} ref: ${ref}`);
        try {
            // Get check runs for the ref
            const { data: checkRuns } = yield octokit.rest.checks.listForRef({
                owner,
                repo,
                ref,
                per_page: 100,
            });
            // Filter only failed check runs
            const failedCheckRuns = checkRuns.check_runs.filter((check) => check.conclusion === 'failure');
            core.info(`Found ${failedCheckRuns.length} failed check runs`);
            const failedChecksInfo = [];
            // Extract information from each failed check
            for (const checkRun of failedCheckRuns) {
                const checkInfo = yield extractCheckRunLog(octokit, owner, repo, checkRun);
                if (checkInfo) {
                    failedChecksInfo.push({
                        checkName: checkRun.name,
                        output: checkInfo,
                    });
                }
            }
            // Combine all failed checks info
            let combinedOutput = failedChecksInfo
                .map((check) => `[Check name] ${check.checkName}\n[Check output]\n${check.output}`)
                .join('\n\n');
            if (combinedOutput.length > maxLength) {
                core.warning(`Combined output is too long (${combinedOutput.length} chars), exceeds max length ${maxLength}. Truncating...`);
                combinedOutput = combinedOutput.substring(0, maxLength);
            }
            core.info(`Successfully extracted info from ${failedChecksInfo.length} failed checks`);
            return {
                failedChecks: failedChecksInfo,
                combinedOutput,
            };
        }
        catch (error) {
            core.error(`Failed to extract failed checks info: ${error}`);
            throw error;
        }
    });
}
function extractCheckRunLog(octokit, owner, repo, checkRun) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Extract job ID from details URL
            const jobId = extractJobIdFromUrl(checkRun.html_url, `${owner}/${repo}`);
            if (!jobId) {
                console.log(`Could not extract job ID from URL: ${checkRun.html_url}`);
                // Fallback to check run output text
                return ((_a = checkRun.output) === null || _a === void 0 ? void 0 : _a.text) || null;
            }
            // Try to download workflow job logs
            try {
                const logsResponse = yield octokit.rest.actions.downloadJobLogsForWorkflowRun({ owner, repo, job_id: jobId });
                let logText;
                const data = logsResponse.data;
                if (typeof data === 'string' && /^https?:\/\//.test(data)) {
                    const res = yield fetch(data);
                    logText = yield res.text();
                }
                else if (typeof data === 'string') {
                    logText = data;
                }
                else {
                    logText = String(data);
                }
                const logLines = logText.split('\n');
                const cleanedLogs = clearTimestampFromGhLogs(logLines);
                const relevantInfo = extractRelevantInfo(cleanedLogs);
                return relevantInfo || null;
            }
            catch (logError) {
                core.debug(`Failed to download logs, using output text: ${logError}`);
                // Fallback to check run output text
                const outputText = (_b = checkRun.output) === null || _b === void 0 ? void 0 : _b.text;
                if (outputText) {
                    const logLines = outputText.split('\n');
                    const relevantInfo = extractRelevantInfo(logLines);
                    return relevantInfo || null;
                }
                return null;
            }
        }
        catch (error) {
            core.warning(`Failed to extract check run log: ${error}`);
            return null;
        }
    });
}
function extractJobIdFromUrl(detailsUrl, repoFullName) {
    // Check if URL is related to the correct repository
    if (!detailsUrl.includes(repoFullName)) {
        core.debug(`Details URL relates to another repository: ${detailsUrl}`);
        return null;
    }
    // Extract job ID from URL pattern /job/{jobId}
    const match = detailsUrl.match(/\/job\/(\d+)/);
    if (!match || !match[1]) {
        core.debug(`Could not find job ID in URL: ${detailsUrl}`);
        return null;
    }
    const jobId = parseInt(match[1], 10);
    return isNaN(jobId) ? null : jobId;
}
function clearTimestampFromGhLogs(logLines) {
    return logLines.map((line) => {
        // Remove timestamp prefix (ISO 8601 format at the start of line)
        return line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '');
    });
}
function extractRelevantInfo(logLines) {
    const relevantLines = [];
    let insideFailedTask = false;
    for (let i = 0; i < logLines.length; i++) {
        const line = logLines[i];
        // Maven errors: lines with [ERROR] prefix
        if (line.startsWith('[ERROR]')) {
            relevantLines.push(line);
            continue;
        }
        // Kotlin compiler errors: lines with "e:" prefix
        if (line.startsWith('e:')) {
            relevantLines.push(line);
            continue;
        }
        // Gradle: Extract lines between "Task :(.*) FAILED" and "FAILURE: "
        if (/Task :.*FAILED/.test(line)) {
            insideFailedTask = true;
            relevantLines.push(line);
        }
        else if (insideFailedTask) {
            if (line.includes('FAILURE: ')) {
                relevantLines.push(line);
                insideFailedTask = false;
            }
            else {
                relevantLines.push(line);
            }
        }
    }
    return relevantLines.join('\n').trim();
}
