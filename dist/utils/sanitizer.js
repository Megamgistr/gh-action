"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripHtmlComments = void 0;
exports.stripInvisibleCharacters = stripInvisibleCharacters;
exports.stripMarkdownImageAltText = stripMarkdownImageAltText;
exports.stripMarkdownLinkTitles = stripMarkdownLinkTitles;
exports.stripHiddenAttributes = stripHiddenAttributes;
exports.normalizeHtmlEntities = normalizeHtmlEntities;
exports.sanitizeContent = sanitizeContent;
exports.redactGitHubTokens = redactGitHubTokens;
function stripInvisibleCharacters(content) {
    content = content.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
    content = content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
    content = content.replace(/\u00AD/g, "");
    content = content.replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
    return content;
}
function stripMarkdownImageAltText(content) {
    return content.replace(/!\[[^\]]*\]\(/g, "![](");
}
function stripMarkdownLinkTitles(content) {
    content = content.replace(/(\[[^\]]*\]\([^)]+)\s+"[^"]*"/g, "$1");
    content = content.replace(/(\[[^\]]*\]\([^)]+)\s+'[^']*'/g, "$1");
    return content;
}
function stripHiddenAttributes(content) {
    content = content.replace(/\salt\s*=\s*["'][^"']*["']/gi, "");
    content = content.replace(/\salt\s*=\s*[^\s>]+/gi, "");
    content = content.replace(/\stitle\s*=\s*["'][^"']*["']/gi, "");
    content = content.replace(/\stitle\s*=\s*[^\s>]+/gi, "");
    content = content.replace(/\saria-label\s*=\s*["'][^"']*["']/gi, "");
    content = content.replace(/\saria-label\s*=\s*[^\s>]+/gi, "");
    content = content.replace(/\sdata-[a-zA-Z0-9-]+\s*=\s*["'][^"']*["']/gi, "");
    content = content.replace(/\sdata-[a-zA-Z0-9-]+\s*=\s*[^\s>]+/gi, "");
    content = content.replace(/\splaceholder\s*=\s*["'][^"']*["']/gi, "");
    content = content.replace(/\splaceholder\s*=\s*[^\s>]+/gi, "");
    return content;
}
function normalizeHtmlEntities(content) {
    content = content.replace(/&#(\d+);/g, (_, dec) => {
        const num = parseInt(dec, 10);
        if (num >= 32 && num <= 126) {
            return String.fromCharCode(num);
        }
        return "";
    });
    content = content.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const num = parseInt(hex, 16);
        if (num >= 32 && num <= 126) {
            return String.fromCharCode(num);
        }
        return "";
    });
    return content;
}
function sanitizeContent(content) {
    content = (0, exports.stripHtmlComments)(content);
    content = stripInvisibleCharacters(content);
    content = stripMarkdownImageAltText(content);
    content = stripMarkdownLinkTitles(content);
    content = stripHiddenAttributes(content);
    content = normalizeHtmlEntities(content);
    content = redactGitHubTokens(content);
    return content;
}
function redactGitHubTokens(content) {
    // GitHub Personal Access Tokens (classic): ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 chars)
    content = content.replace(/\bghp_[A-Za-z0-9]{36}\b/g, "[REDACTED_GITHUB_TOKEN]");
    // GitHub OAuth tokens: gho_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 chars)
    content = content.replace(/\bgho_[A-Za-z0-9]{36}\b/g, "[REDACTED_GITHUB_TOKEN]");
    // GitHub installation tokens: ghs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 chars)
    content = content.replace(/\bghs_[A-Za-z0-9]{36}\b/g, "[REDACTED_GITHUB_TOKEN]");
    // GitHub refresh tokens: ghr_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 chars)
    content = content.replace(/\bghr_[A-Za-z0-9]{36}\b/g, "[REDACTED_GITHUB_TOKEN]");
    // GitHub fine-grained personal access tokens: github_pat_XXXXXXXXXX (up to 255 chars)
    content = content.replace(/\bgithub_pat_[A-Za-z0-9_]{11,221}\b/g, "[REDACTED_GITHUB_TOKEN]");
    return content;
}
const stripHtmlComments = (content) => content.replace(/<!--[\s\S]*?-->/g, "");
exports.stripHtmlComments = stripHtmlComments;
