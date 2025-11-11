"use strict";
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
exports.parseJunieResults = parseJunieResults;
const promises_1 = require("fs/promises");
const path_1 = require("path");
function parseJunieResults() {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = process.env.WORKING_DIR;
        const filePath = (0, path_1.join)(workingDir, '.matterhorn', 'out', 'success.md');
        try {
            yield (0, promises_1.access)(filePath);
        }
        catch (error) {
            console.error(`File not found: ${filePath}`);
            throw new Error('Junie results not found');
        }
        const content = yield (0, promises_1.readFile)(filePath, 'utf-8');
        const lines = content.split('\n');
        let title = '';
        const bodyLines = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('###')) {
                title = trimmedLine.replace(/^###\s*/, '');
            }
            bodyLines.push(trimmedLine);
        }
        const body = bodyLines.join('\n');
        if (title.length === 0) {
            title = "Junie finished task";
        }
        return {
            title,
            body
        };
    });
}
