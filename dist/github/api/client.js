"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOctokit = createOctokit;
const rest_1 = require("@octokit/rest");
const graphql_1 = require("@octokit/graphql");
const config_1 = require("./config");
function createOctokit(token) {
    return {
        rest: new rest_1.Octokit({
            auth: token,
            baseUrl: config_1.GITHUB_API_URL,
        }),
        graphql: graphql_1.graphql.defaults({
            baseUrl: config_1.GITHUB_API_URL,
            headers: {
                authorization: `token ${token}`,
            },
        }),
    };
}
