import {execFileSync} from "child_process";
import type {Octokits} from "../api/client";
import {ISSUE_QUERY, PR_QUERY, USER_QUERY} from "../api/queries/github";
import type {
    GitHubComment,
    GitHubFile,
    GitHubIssue,
    GitHubPullRequest,
    GitHubReview,
    IssueQueryResponse,
    PullRequestQueryResponse,
} from "../api/queries/types";


type FetchDataParams = {
    octokits: Octokits;
    repository: string;
    entityNumber: string;
    isPR: boolean;
    triggerUsername?: string;
    triggerTime?: string;
};

export type GitHubFileWithSHA = GitHubFile & {
    sha: string;
};

export type FetchDataResult = {
    contextData: GitHubPullRequest | GitHubIssue;
    comments: GitHubComment[];
    changedFiles: GitHubFile[];
    changedFilesWithSHA: GitHubFileWithSHA[];
    reviewData: GitHubReview[] | [];
};

export async function fetchGitHubData({
                                          octokits,
                                          repository,
                                          entityNumber,
                                          isPR
                                      }: FetchDataParams): Promise<FetchDataResult> {
    const [owner, repo] = repository.split("/");
    if (!owner || !repo) {
        throw new Error("Invalid repository format. Expected 'owner/repo'.");
    }

    let contextData: GitHubPullRequest | GitHubIssue | null = null;
    let ghComments: GitHubComment[] = [];
    let changedFiles: GitHubFile[] = [];
    let reviewData: GitHubReview[] = [];

    // Prepare base data
    try {
        if (isPR) {
            const prResult = await octokits.graphql<PullRequestQueryResponse>(
                PR_QUERY,
                {
                    owner,
                    repo,
                    number: parseInt(entityNumber),
                },
            );

            const pullRequest = prResult.repository.pullRequest;
            contextData = pullRequest;
            changedFiles = pullRequest.files.nodes || [];
            ghComments = pullRequest.comments?.nodes || [];
            reviewData = pullRequest.reviews?.nodes || [];

            console.log(`Successfully fetched PR #${entityNumber} data`);
        } else {
            // Fetch issue data
            const issueResult = await octokits.graphql<IssueQueryResponse>(
                ISSUE_QUERY,
                {
                    owner,
                    repo,
                    number: parseInt(entityNumber),
                },
            );
            contextData = issueResult.repository.issue;
            ghComments = contextData?.comments?.nodes

            console.log(`Successfully fetched issue #${entityNumber} data`);
        }
    } catch (error) {
        console.error(`Failed to fetch ${isPR ? "PR" : "issue"} data:`, error);
        throw new Error(`Failed to fetch ${isPR ? "PR" : "issue"} data`);
    }

    // Compute SHAs for changed files. For PRs only
    let changedFilesWithSHA: GitHubFileWithSHA[] = [];
    if (isPR && changedFiles.length > 0) {
        changedFilesWithSHA = changedFiles.map((file) => {
            // Don't compute SHA for deleted files
            if (file.changeType === "DELETED") {
                return {
                    ...file,
                    sha: "deleted",
                };
            }

            try {
                // Use git hash-object to compute the SHA for the current file content
                const sha = execFileSync("git", ["hash-object", file.path], {
                    encoding: "utf-8",
                }).trim();
                return {
                    ...file,
                    sha,
                };
            } catch (error) {
                console.warn(`Failed to compute SHA for ${file.path}:`, error);
                // Return original file without SHA if computation fails
                return {
                    ...file,
                    sha: "unknown",
                };
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
}

export type UserQueryResponse = {
    user: {
        name: string | null;
    };
};

export async function fetchUserDisplayName(
    octokits: Octokits,
    login: string,
): Promise<string | null> {
    try {
        const result = await octokits.graphql<UserQueryResponse>(USER_QUERY, {
            login,
        });
        return result.user.name;
    } catch (error) {
        console.warn(`Failed to fetch user display name for ${login}:`, error);
        return null;
    }
}
