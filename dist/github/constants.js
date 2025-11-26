"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUCCESS_FEEDBACK_COMMENT_WITH_RESULT = exports.COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE = exports.MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE = exports.PR_CREATED_FEEDBACK_COMMENT_TEMPLATE = exports.ERROR_FEEDBACK_COMMENT_TEMPLATE = exports.SUCCESS_FEEDBACK_COMMENT = exports.COMMIT_MESSAGE_TEMPLATE = exports.PR_TITLE_TEMPLATE = exports.PR_BODY_TEMPLATE = exports.INIT_COMMENT_BODY = exports.DEFAULT_TRIGGER_PHRASE = exports.WORKING_BRANCH_PREFIX = void 0;
exports.WORKING_BRANCH_PREFIX = "junie/";
exports.DEFAULT_TRIGGER_PHRASE = "@junie";
exports.INIT_COMMENT_BODY = "Hey, it’s Junie by JetBrains! I started working...";
const PR_BODY_TEMPLATE = (junieBody, issueId) => `
 ## 📌 Hey! This PR was made for you with Junie, the coding agent by JetBrains **Early Access Preview**
            
It's still learning, developing, and might make mistakes. Please make sure you review the changes before you accept them.
We'd love your feedback — join our Discord to share bugs, ideas: [here](https://jb.gg/junie/github).
            
${issueId ? `- 🔗 **Issue:** Fixes: #${issueId}` : ""}         
            
### 📊 Junie Summary:
${junieBody}
`;
exports.PR_BODY_TEMPLATE = PR_BODY_TEMPLATE;
const PR_TITLE_TEMPLATE = (junieTitle) => `[Junie]: ${junieTitle}`;
exports.PR_TITLE_TEMPLATE = PR_TITLE_TEMPLATE;
const COMMIT_MESSAGE_TEMPLATE = (junieTitle, issueId) => `${issueId ? `[issue-${issueId}]\n\n` : ""}${junieTitle}`;
exports.COMMIT_MESSAGE_TEMPLATE = COMMIT_MESSAGE_TEMPLATE;
exports.SUCCESS_FEEDBACK_COMMENT = "Junie is successful finished!";
const ERROR_FEEDBACK_COMMENT_TEMPLATE = (details, jobLink) => `Junie is failed!

Details: ${details}

${jobLink}
`;
exports.ERROR_FEEDBACK_COMMENT_TEMPLATE = ERROR_FEEDBACK_COMMENT_TEMPLATE;
const PR_CREATED_FEEDBACK_COMMENT_TEMPLATE = (prLink) => `${exports.SUCCESS_FEEDBACK_COMMENT}\n PR link: ${prLink}`;
exports.PR_CREATED_FEEDBACK_COMMENT_TEMPLATE = PR_CREATED_FEEDBACK_COMMENT_TEMPLATE;
const MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE = (createPRLink) => `${exports.SUCCESS_FEEDBACK_COMMENT}\n\nYou can create a PR manually: [Create Pull Request](${createPRLink})`;
exports.MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE = MANUALLY_PR_CREATE_FEEDBACK_COMMENT_TEMPLATE;
const COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE = (commitSHA, junieTitle, junieBody) => `${exports.SUCCESS_FEEDBACK_COMMENT}\n\n ${junieTitle}\n${junieBody} Commit sha: ${commitSHA}`;
exports.COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE = COMMIT_PUSHED_FEEDBACK_COMMENT_TEMPLATE;
const SUCCESS_FEEDBACK_COMMENT_WITH_RESULT = (junieTitle, junieBody) => `${exports.SUCCESS_FEEDBACK_COMMENT}\n\nResult: ${junieTitle} \n ${junieBody}`;
exports.SUCCESS_FEEDBACK_COMMENT_WITH_RESULT = SUCCESS_FEEDBACK_COMMENT_WITH_RESULT;
