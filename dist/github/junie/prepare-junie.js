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
exports.prepare = prepare;
const core = __importStar(require("@actions/core"));
const context_1 = require("../context");
const actor_1 = require("../validation/actor");
const feedback_1 = require("../operations/comments/feedback");
const branch_1 = require("../operations/branch");
const junie_inputs_1 = require("./junie-inputs");
const trigger_1 = require("../validation/trigger");
const auth_1 = require("../operations/auth");
const prepare_mcp_config_1 = require("../../mcp/prepare-mcp-config");
function prepare(_a) {
    return __awaiter(this, arguments, void 0, function* ({ context, octokit, githubToken, }) {
        if (!shouldHandle(context)) {
            console.log("No need to run junie");
            core.setOutput('SHOULD_SKIP', 'true');
            return;
        }
        core.setOutput('SHOULD_SKIP', 'false');
        yield (0, auth_1.gitAuth)(githubToken, context);
        if ((0, context_1.isEntityContext)(context)) {
            yield (0, actor_1.checkHumanActor)(octokit.rest, context);
        }
        yield (0, feedback_1.writeInitialFeedbackComment)(octokit.rest, context);
        const branchInfo = yield (0, branch_1.setupBranch)(octokit, context);
        const mcpConfig = yield (0, prepare_mcp_config_1.prepareMcpConfig)({
            junieWorkingDir: context.inputs.junieWorkingDir,
            allowedMcpServers: context.inputs.allowedMcpServers ? context.inputs.allowedMcpServers.split(',') : [],
            githubToken: githubToken,
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            currentBranch: branchInfo.currentBranch,
        });
        yield (0, junie_inputs_1.prepareJunieInputs)(context, mcpConfig);
    });
}
function shouldHandle(context) {
    if (context.inputs.prompt) {
        return true;
    }
    return (0, context_1.isEntityContext)(context) && (0, trigger_1.checkContainsTrigger)(context);
}
