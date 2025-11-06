import type { Octokit } from "@octokit/rest";
import * as core from "@actions/core";
import {GitHubContext} from "../context";

export interface FailedCheckInfo {
    checkName: string;
    output: string;
}

export interface ExtractFailedChecksResult {
    failedChecks: FailedCheckInfo[];
    combinedOutput: string;
}

export async function extractFailedChecksInfo(
    octokit: Octokit,
    context: GitHubContext,
    ref: string,
    maxLength: number = 19000
): Promise<ExtractFailedChecksResult> {
    const { owner, name } = context.payload.repository;
    const ownerLogin = owner.login;
    console.log(`Extracting failed checks for ${ownerLogin}/${name} ref: ${ref}`);

    try {
        // Get check runs for the ref
        const { data: checkRuns } = await octokit.rest.checks.listForRef({
            owner: ownerLogin,
            repo: name,
            ref,
            per_page: 100,
        });

        // Filter only failed check runs
        const failedCheckRuns = checkRuns.check_runs.filter(
            (check) => check.conclusion === 'failure'
        );

        core.info(`Found ${failedCheckRuns.length} failed check runs`);

        const failedChecksInfo: FailedCheckInfo[] = [];

        // Extract information from each failed check
        for (const checkRun of failedCheckRuns) {
            const checkInfo = await extractCheckRunLog(
                octokit,
                ownerLogin,
                name,
                checkRun
            );

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
            core.warning(
                `Combined output is too long (${combinedOutput.length} chars), exceeds max length ${maxLength}. Truncating...`
            );
            combinedOutput = combinedOutput.substring(0, maxLength);
        }

        core.info(`Successfully extracted info from ${failedChecksInfo.length} failed checks`);

        return {
            failedChecks: failedChecksInfo,
            combinedOutput,
        };
    } catch (error) {
        core.error(`Failed to extract failed checks info: ${error}`);
        throw error;
    }
}

async function extractCheckRunLog(
    octokit: Octokit,
    owner: string,
    repo: string,
    checkRun: any
): Promise<string | null> {
    try {
        // Extract job ID from details URL
        const jobId = extractJobIdFromUrl(checkRun.html_url, `${owner}/${repo}`);

        if (!jobId) {
            console.log(`Could not extract job ID from URL: ${checkRun.html_url}`);
            // Fallback to check run output text
            return checkRun.output?.text || null;
        }

        // Try to download workflow job logs
        try {
            const logsResponse = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
                owner,
                repo,
                job_id: jobId,
            });

            // Parse logs (logs are returned as a redirect URL, we need to fetch the actual content)
            let logText: string;
            if (typeof logsResponse.data === 'string') {
                logText = logsResponse.data;
            } else {
                // If data is a URL or buffer, handle appropriately
                logText = String(logsResponse.data);
            }

            const logLines = logText.split('\n');
            const cleanedLogs = clearTimestampFromGhLogs(logLines);
            const relevantInfo = extractRelevantInfo(cleanedLogs);

            return relevantInfo || null;
        } catch (logError) {
            core.debug(`Failed to download logs, using output text: ${logError}`);
            // Fallback to check run output text
            const outputText = checkRun.output?.text;
            if (outputText) {
                const logLines = outputText.split('\n');
                const relevantInfo = extractRelevantInfo(logLines);
                return relevantInfo || null;
            }
            return null;
        }
    } catch (error) {
        core.warning(`Failed to extract check run log: ${error}`);
        return null;
    }
}

function extractJobIdFromUrl(detailsUrl: string, repoFullName: string): number | null {
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

function clearTimestampFromGhLogs(logLines: string[]): string[] {
    return logLines.map((line) => {
        // Remove timestamp prefix (ISO 8601 format at the start of line)
        return line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '');
    });
}

export function extractRelevantInfo(logLines: string[]): string {
    const relevantLines: string[] = [];
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
        } else if (insideFailedTask) {
            if (line.includes('FAILURE: ')) {
                relevantLines.push(line);
                insideFailedTask = false;
            } else {
                relevantLines.push(line);
            }
        }
    }

    return relevantLines.join('\n').trim();
}
