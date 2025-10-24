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

// Run inputs bundle used inside the action when invoking Junie
export interface JunieRunInputs {
  ghToken: string;
  junieIngrazzioToken?: string | null;
  junieTask: JunieTask;
  junieTaskText?: string | null;
}


export type PrepareJunieOptions = {
    context: GitHubContext;
    octokit: Octokits;
    githubToken: string;
};

export type PrepareJunieResult = {
    initCommentId?: number;
    branchInfo: {
        baseBranch: string;
        workingBranch: string;
    };
};