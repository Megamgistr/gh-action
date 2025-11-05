import {GitHubContext} from "../../context";
import {Octokits} from "../../api/client";


export interface JunieTask {
    gitHubIssue?: GitHubIssue | null;
    gitHubPullRequestReview?: GitHubPullRequestReview | null;
    gitHubPullRequestComment?: GitHubPullRequestComment | null;
    gitHubPullRequest?: GitHubPullRequest | null;
    textTask?: TextTask | null;
}

export interface GitHubIssue {
    url: string;
}

export interface GitHubPullRequestReview {
    url: string;
}

export interface GitHubPullRequestComment {
    pullRequestUrl: string;
    url: string;
}

export interface GitHubPullRequest {
    url: string;
}

export interface TextTask {
    text: string;
}


export type PrepareJunieOptions = {
    context: GitHubContext;
    octokit: Octokits;
    githubToken: string;
};