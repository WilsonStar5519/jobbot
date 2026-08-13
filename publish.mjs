/**
 * Publish index.html to wilsonstar5519/jobbot via GitHub Contents API.
 * Requires GITHUB_TOKEN or GH_TOKEN with repo scope.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const owner = "wilsonstar5519";
const repo = "jobbot";
const filePath = "index.html";
const api = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

if (!token) {
  console.error("Missing GITHUB_TOKEN / GH_TOKEN");
  process.exit(2);
}

const content = fs.readFileSync(path.join(__dirname, "index.html"));
const b64 = content.toString("base64");

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "hkpa-interview-publisher",
};

const existing = await fetch(api, { headers });
let sha;
if (existing.status === 200) {
  const json = await existing.json();
  sha = json.sha;
} else if (existing.status !== 404) {
  console.error("GET failed", existing.status, await existing.text());
  process.exit(1);
}

const body = {
  message: "Improve AI feedback with full standard answers (single-file deploy)",
  content: b64,
  branch: "main",
};
if (sha) body.sha = sha;

const put = await fetch(api, {
  method: "PUT",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await put.text();
if (!put.ok) {
  console.error("PUT failed", put.status, text);
  process.exit(1);
}
console.log("Published OK:", put.status);
const result = JSON.parse(text);
console.log("commit:", result.commit?.sha);
console.log("url:", result.content?.html_url);
