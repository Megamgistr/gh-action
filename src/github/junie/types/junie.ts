import {GitHubContext} from "../../context";
import {Octokits} from "../../api/client";
import {BranchInfo} from "../../operations/branch";


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

export interface JunieRunInputs {
    junieIngrazzioToken: string;
    junieTask: JunieTask;
    junieTaskText?: string | null;
}


export type PrepareJunieOptions = {
    context: GitHubContext;
    octokit: Octokits;
    githubToken: string;
    canCreatePR: boolean;
};

export type PrepareOutputOptions = {
    context: GitHubContext;
    githubToken: string;
    junieInputs: JunieRunInputs;
    branchInfo: BranchInfo;
    initCommentId?: number | null;
    canCreatePR: boolean;
};