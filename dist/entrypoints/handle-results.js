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
exports.ActionType = void 0;
exports.handleResults = handleResults;
const junie_inputs_1 = require("../github/junie/junie-inputs");
const constants_1 = require("../github/constants");
const context_1 = require("../github/context");
const child_process_1 = require("child_process");
const core = __importStar(require("@actions/core"));
var ActionType;
(function (ActionType) {
    ActionType["WRITE_COMMENT"] = "WRITE_COMMENT";
    ActionType["CREATE_PR"] = "CREATE_PR";
    ActionType["COMMIT_CHANGES"] = "COMMIT_CHANGES";
    ActionType["NOTHING"] = "NOTHING";
})(ActionType || (exports.ActionType = ActionType = {}));
function handleResults() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const junieJsonOutput = JSON.parse(process.env.JSON_JUNIE_OUTPUT);
            const context = JSON.parse(process.env.PARSED_CONTEXT);
            console.log("Junie json output:", junieJsonOutput);
            const junieErrors = junieJsonOutput.errors;
            if (junieErrors && junieErrors.length > 0) {
                throw new Error(`Junie run failed with errors: ${junieErrors.join('\n')}`);
            }
            const actionToDo = yield getActionToDo();
            const title = junieJsonOutput.taskName;
            const body = junieJsonOutput.result;
            let issueId;
            if ((0, context_1.isEntityContext)(context)) {
                issueId = context.entityNumber;
            }
            const commitMessage = (0, constants_1.COMMIT_MESSAGE_TEMPLATE)(title, issueId);
            // Export outputs based on action type
            switch (actionToDo) {
                case ActionType.CREATE_PR:
                    (0, junie_inputs_1.exportResultsOutputs)(title, body, commitMessage, (0, constants_1.PR_TITLE_TEMPLATE)(title), (0, constants_1.PR_BODY_TEMPLATE)(body, issueId));
                    break;
                case ActionType.COMMIT_CHANGES:
                    (0, junie_inputs_1.exportResultsOutputs)(title, body, commitMessage);
                    break;
                case ActionType.WRITE_COMMENT:
                case ActionType.NOTHING:
                    (0, junie_inputs_1.exportResultsOutputs)(title, body);
                    break;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            core.setFailed(`Handle results step failed with error: ${errorMessage}`);
            core.setOutput("EXCEPTION", errorMessage);
            process.exit(1);
        }
    });
}
function getActionToDo() {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if there are changed files
        const hasChangedFiles = yield checkForChangedFiles();
        const initCommentId = process.env.INIT_COMMENT_ID;
        const currentBranch = process.env.CURRENT_BRANCH;
        const workingBranch = process.env.WORKING_BRANCH;
        console.log(`Has changed files: ${hasChangedFiles}`);
        console.log(`Init comment ID: ${initCommentId}`);
        console.log(`Current branch: ${currentBranch}`);
        console.log(`Working branch: ${workingBranch}`);
        let action;
        if (!hasChangedFiles && initCommentId) {
            console.log('No changes found but has comment ID - will write comment');
            action = ActionType.WRITE_COMMENT;
        }
        else if (hasChangedFiles && currentBranch !== workingBranch) {
            console.log('Changes found and branches differ - will create PR');
            action = ActionType.CREATE_PR;
        }
        else if (hasChangedFiles && currentBranch === workingBranch) {
            console.log('Changes found and branches are same - will commit directly');
            action = ActionType.COMMIT_CHANGES;
        }
        else {
            console.log('No specific action matched - do nothing');
            action = ActionType.NOTHING;
        }
        console.log("Action to do:", action);
        core.setOutput('ACTION_TO_DO', action);
        return action;
    });
}
function checkForChangedFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check for staged and unstaged changes
            const gitStatus = (0, child_process_1.execSync)('git status --porcelain', { encoding: 'utf-8' });
            // If git status returns any output, there are changes
            return gitStatus.trim().length > 0;
        }
        catch (error) {
            console.error('Error checking for changed files:', error);
            // If we can't check, assume there are no changes to be safe
            return false;
        }
    });
}
// @ts-ignore
if (import.meta.main) {
    handleResults();
}
