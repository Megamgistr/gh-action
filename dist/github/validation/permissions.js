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
exports.checkWritePermissions = checkWritePermissions;
const core = __importStar(require("@actions/core"));
function checkWritePermissions(octokit, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const { actor } = context;
        const repo = context.payload.repository;
        try {
            core.info(`Checking permissions for actor: ${actor}`);
            if (actor.endsWith("[bot]")) {
                core.info(`Actor is a GitHub App: ${actor}`);
                return true;
            }
            const response = yield octokit.repos.getCollaboratorPermissionLevel({
                owner: repo.owner.login,
                repo: repo.name,
                username: actor,
            });
            const permissionLevel = response.data.permission;
            core.info(`Permission level retrieved: ${permissionLevel}`);
            if (permissionLevel === "admin" || permissionLevel === "write") {
                core.info(`Actor has write access: ${permissionLevel}`);
                return true;
            }
            else {
                core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
                return false;
            }
        }
        catch (error) {
            core.error(`Failed to check permissions: ${error}`);
            throw new Error(`Failed to check permissions for ${actor}: ${error}`);
        }
    });
}
