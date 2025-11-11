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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitHubContext = parseGitHubContext;
exports.isCheckSuiteEvent = isCheckSuiteEvent;
exports.isIssuesEvent = isIssuesEvent;
exports.isIssueCommentEvent = isIssueCommentEvent;
exports.isPullRequestEvent = isPullRequestEvent;
exports.isPullRequestReviewEvent = isPullRequestReviewEvent;
exports.isPullRequestReviewCommentEvent = isPullRequestReviewCommentEvent;
exports.isIssuesAssignedEvent = isIssuesAssignedEvent;
exports.isEntityContext = isEntityContext;
exports.isAutomationContext = isAutomationContext;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const constants_1 = require("./constants");
const ENTITY_EVENT_NAMES = [
    "issues",
    "issue_comment",
    "pull_request",
    "pull_request_review",
    "pull_request_review_comment",
];
const AUTOMATION_EVENT_NAMES = [
    "workflow_dispatch",
    "repository_dispatch",
    "schedule",
    "workflow_run",
    "check_suite",
];
function parseGitHubContext() {
    var _a, _b, _c;
    const context = github.context;
    const commonFields = {
        runId: process.env.GITHUB_RUN_ID,
        eventAction: context.payload.action,
        actor: context.actor,
        actorEmail: getActorEmail(),
        inputs: {
            junieWorkingDir: process.env.JUNIE_WORKING_DIR,
            headRef: process.env.GITHUB_HEAD_REF,
            appToken: process.env.APP_TOKEN,
            prompt: process.env.PROMPT || "",
            triggerPhrase: (_a = process.env.TRIGGER_PHRASE) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_TRIGGER_PHRASE,
            assigneeTrigger: (_b = process.env.ASSIGNEE_TRIGGER) !== null && _b !== void 0 ? _b : "",
            labelTrigger: (_c = process.env.LABEL_TRIGGER) !== null && _c !== void 0 ? _c : "",
            baseBranch: process.env.BASE_BRANCH,
            targetBranch: process.env.TARGET_BRANCH,
            botId: process.env.BOT_ID,
            botName: process.env.BOT_NAME,
            allowedMcpServers: process.env.ALLOWED_MCP_SERVERS,
        },
    };
    let parsedContext;
    switch (context.eventName) {
        case "issues": {
            const payload = context.payload;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload, entityNumber: payload.issue.number, isPR: false });
            break;
        }
        case "issue_comment": {
            const payload = context.payload;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload, entityNumber: payload.issue.number, isPR: Boolean(payload.issue.pull_request) });
            break;
        }
        case "pull_request":
        case "pull_request_target": {
            const payload = context.payload;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: "pull_request", payload, entityNumber: payload.pull_request.number, isPR: true });
            break;
        }
        case "pull_request_review": {
            const payload = context.payload;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload, entityNumber: payload.pull_request.number, isPR: true });
            break;
        }
        case "pull_request_review_comment": {
            const payload = context.payload;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload, entityNumber: payload.pull_request.number, isPR: true });
            break;
        }
        case "check_suite": {
            const payload = context.payload;
            const isPr = payload.check_suite.pull_requests.length > 0;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload: payload, entityNumber: isPr ? payload.check_suite.pull_requests[0].number : undefined, isPR: isPr });
            break;
        }
        case "workflow_dispatch": {
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload: context.payload });
            break;
        }
        case "repository_dispatch": {
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload: context.payload });
            break;
        }
        case "schedule": {
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload: context.payload });
            break;
        }
        case "workflow_run": {
            const payload = context.payload;
            const isPR = payload.workflow_run.pull_requests.length > 0;
            parsedContext = Object.assign(Object.assign({}, commonFields), { eventName: context.eventName, payload: context.payload, isPR, entityNumber: isPR ? payload.workflow_run.pull_requests[0].number : undefined });
            break;
        }
        default:
            throw new Error(`Unsupported event type: ${context.eventName}`);
    }
    core.setOutput('ACTOR_NAME', parsedContext.actor);
    core.setOutput('ACTOR_EMAIL', parsedContext.actorEmail);
    core.setOutput("PARSED_CONTEXT", JSON.stringify(parsedContext));
    return parsedContext;
}
function isCheckSuiteEvent(context) {
    return context.eventName === "check_suite";
}
function isIssuesEvent(context) {
    return context.eventName === "issues";
}
function isIssueCommentEvent(context) {
    return context.eventName === "issue_comment";
}
function isPullRequestEvent(context) {
    return context.eventName === "pull_request";
}
function isPullRequestReviewEvent(context) {
    return context.eventName === "pull_request_review";
}
function isPullRequestReviewCommentEvent(context) {
    return context.eventName === "pull_request_review_comment";
}
function isIssuesAssignedEvent(context) {
    return isIssuesEvent(context) && context.eventAction === "assigned";
}
function isEntityContext(context) {
    return ENTITY_EVENT_NAMES.includes(context.eventName);
}
function isAutomationContext(context) {
    return AUTOMATION_EVENT_NAMES.includes(context.eventName);
}
function getActorEmail() {
    var _a;
    const actor = github.context.actor;
    const userId = (_a = github.context.payload.sender) === null || _a === void 0 ? void 0 : _a.id;
    return `${userId}+${actor}@users.noreply.github.com`;
}
