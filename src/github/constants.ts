export const JUNIE_APP_ID = 666;

export const JUNIE_APP_USERNAME = "junie[bot]";

export const WORKING_BRANCH_PREFIX = "junie/";

export const DEFAULT_TRIGGER_PHRASE = "@junie";

export const INIT_COMMENT_BODY = "Junie is working…"

export const PR_BODY_TEMPLATE = (junieBody: string, issueId?: number) => `
 ## 📌 Hey! This PR was made for you with Junie, the coding agent by JetBrains **Early Access Preview**
            
It's still learning, developing, and might make mistakes. Please make sure you review the changes before you accept them.
We'd love your feedback — join our Discord to share bugs, ideas: [here](https://jb.gg/junie/github).
            
${issueId ? `- 🔗 **Issue:** Fixes: #${issueId}` : ""}         
            
'### 📊 Junie Summary'
${junieBody}
`

export const PR_TITLE_TEMPLATE = (junieTitle: string) =>
    `[Junie]: ${junieTitle}`

export const COMMIT_MESSAGE_TEMPLATE = (junieTitle: string, junieBody: string, issueId?: number) =>
    `${issueId ? `[issue-${issueId}]\n\n` : ""}${junieTitle}${junieBody}`;