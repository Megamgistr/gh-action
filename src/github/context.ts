import * as github from "@actions/github";
import type {
    IssuesEvent,
    IssuesAssignedEvent,
    IssueCommentEvent,
    PullRequestEvent,
    PullRequestReviewEvent,
    PullRequestReviewCommentEvent,
    WorkflowRunEvent,
} from "@octokit/webhooks-types";
import {DEFAULT_TRIGGER_PHRASE, JUNIE_APP_ID, JUNIE_APP_USERNAME} from "./constants";
export type WorkflowDispatchEvent = {
    action?: never;
    inputs?: Record<string, any>;
    ref?: string;
    repository: {
        name: string;
        owner: {
            login: string;
        };
    };
    sender: {
        login: string;
    };
    workflow: string;
};

export type RepositoryDispatchEvent = {
    action: string;
    client_payload?: Record<string, any>;
    repository: {
        name: string;
        owner: {
            login: string;
        };
    };
    sender: {
        login: string;
    };
};

export type ScheduleEvent = {
    action?: never;
    schedule?: string;
    repository: {
        name: string;
        owner: {
            login: string;
        };
    };
};

// Event name constants for better maintainability
const ENTITY_EVENT_NAMES = [
    "issues",
    "issue_comment",
    "pull_request",
    "pull_request_review",
    "pull_request_review_comment",
] as const;

const AUTOMATION_EVENT_NAMES = [
    "workflow_dispatch",
    "repository_dispatch",
    "schedule",
    "workflow_run",
] as const;

type EntityEventName = (typeof ENTITY_EVENT_NAMES)[number];
type AutomationEventName = (typeof AUTOMATION_EVENT_NAMES)[number];

type BaseContext = {
    runId: string;
    eventAction?: string;
    actor: string;
    inputs: {
        appToken: string;
        baseBranch?: string;
        targetBranch?: string;
        prompt: string;
        triggerPhrase: string;
        assigneeTrigger: string;
        labelTrigger: string;
        workingBranch?: string;
        botId: string;
        botName: string;
    };
};

export type ParsedGitHubContext = BaseContext & {
    eventName: EntityEventName;
    payload:
        | IssuesEvent
        | IssueCommentEvent
        | PullRequestEvent
        | PullRequestReviewEvent
        | PullRequestReviewCommentEvent;
    entityNumber: number;
    isPR: boolean;
};

export type AutomationContext = BaseContext & {
    eventName: AutomationEventName;
    payload:
        | WorkflowDispatchEvent
        | RepositoryDispatchEvent
        | ScheduleEvent
        | WorkflowRunEvent;
};

export type GitHubContext = ParsedGitHubContext | AutomationContext;

export function parseGitHubContext(): GitHubContext {
    const context = github.context;

    const commonFields = {
        runId: process.env.GITHUB_RUN_ID!,
        eventAction: context.payload.action,
        actor: "Megamgistr",
        inputs: {
            headRef: process.env.GITHUB_HEAD_REF,
            appToken: process.env.APP_TOKEN!,
            prompt: process.env.PROMPT || "",
            triggerPhrase: process.env.TRIGGER_PHRASE ?? DEFAULT_TRIGGER_PHRASE,
            assigneeTrigger: process.env.ASSIGNEE_TRIGGER ?? "",
            labelTrigger: process.env.LABEL_TRIGGER ?? "",
            baseBranch: process.env.BASE_BRANCH,
            botId: String(JUNIE_APP_ID),
            botName: JUNIE_APP_USERNAME,
        },
    };

    switch (context.eventName) {
        case "issues": {
            const payload = context.payload as IssuesEvent;
            return {
                ...commonFields,
                eventName: context.eventName,
                payload,
                entityNumber: payload.issue.number,
                isPR: false,
            };
        }
        case "issue_comment": {
            const payload = context.payload as IssueCommentEvent;
            return {
                ...commonFields,
                eventName: context.eventName,
                payload,
                entityNumber: payload.issue.number,
                isPR: Boolean(payload.issue.pull_request),
            };
        }
        case "pull_request":
        case "pull_request_target": {
            const payload = context.payload as PullRequestEvent;
            return {
                ...commonFields,
                eventName: "pull_request",
                payload,
                entityNumber: payload.pull_request.number,
                isPR: true,
            };
        }
        case "pull_request_review": {
            const payload = context.payload as PullRequestReviewEvent;
            return {
                ...commonFields,
                eventName: context.eventName,
                payload,
                entityNumber: payload.pull_request.number,
                isPR: true,
            };
        }
        case "pull_request_review_comment": {
            const payload = context.payload as PullRequestReviewCommentEvent;
            return {
                ...commonFields,
                eventName: context.eventName,
                payload,
                entityNumber: payload.pull_request.number,
                isPR: true,
            };
        }
        case "workflow_dispatch": {
            return {
                ...commonFields,
                eventName: context.eventName,
                payload: context.payload as unknown as WorkflowDispatchEvent,
            };
        }
        case "repository_dispatch": {
            return {
                ...commonFields,
                eventName: context.eventName,
                payload: context.payload as unknown as RepositoryDispatchEvent,
            };
        }
        case "schedule": {
            return {
                ...commonFields,
                eventName: context.eventName,
                payload: context.payload as unknown as ScheduleEvent,
            };
        }
        case "workflow_run": {
            return {
                ...commonFields,
                eventName: context.eventName,
                payload: context.payload as unknown as WorkflowRunEvent,
            };
        }
        default:
            throw new Error(`Unsupported event type: ${context.eventName}`);
    }
}

export function isIssuesEvent(
    context: GitHubContext,
): context is ParsedGitHubContext & { payload: IssuesEvent } {
    return context.eventName === "issues";
}

export function isIssueCommentEvent(
    context: GitHubContext,
): context is ParsedGitHubContext & { payload: IssueCommentEvent } {
    return context.eventName === "issue_comment";
}

export function isPullRequestEvent(
    context: GitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestEvent } {
    return context.eventName === "pull_request";
}

export function isPullRequestReviewEvent(
    context: GitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewEvent } {
    return context.eventName === "pull_request_review";
}

export function isPullRequestReviewCommentEvent(
    context: GitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewCommentEvent } {
    return context.eventName === "pull_request_review_comment";
}

export function isIssuesAssignedEvent(
    context: GitHubContext,
): context is ParsedGitHubContext & { payload: IssuesAssignedEvent } {
    return isIssuesEvent(context) && context.eventAction === "assigned";
}

export function isEntityContext(
    context: GitHubContext,
): context is ParsedGitHubContext {
    return ENTITY_EVENT_NAMES.includes(context.eventName as EntityEventName);
}


export function isAutomationContext(
    context: GitHubContext,
): context is AutomationContext {
    return AUTOMATION_EVENT_NAMES.includes(
        context.eventName as AutomationEventName,
    );
}
