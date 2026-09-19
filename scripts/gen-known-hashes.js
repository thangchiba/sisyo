#!/usr/bin/env node
// Builds bin/known-hashes.json: for every managed template file, the hashes of ALL versions
// sisyo has ever shipped (from git history). `sisyo --update` uses it to recognise an
// untouched file from an install that predates the manifest (< v1.6) and update it cleanly,
// instead of flagging it as "modified locally".
//
// Run before each release:  npm run hashes   (also runs on prepublishOnly)

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const PREFIX = "templates/";
const MANAGED = "templates/.claude/";

function git(args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: root, encoding, maxBuffer: 256 * 1024 * 1024 });
}

// Must match sha256() in bin/sisyo.js (line endings normalized).
function hash(buf) {
  const text = buf.toString("utf8").replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(text).digest("hex");
}

const commits = git(["log", "--format=%H", "--", MANAGED]).split("\n").filter(Boolean);
const seenBlobs = new Map();          // blob sha -> content hash
const known = {};                     // rel -> Set(hash)

for (const commit of commits) {
  const tree = git(["ls-tree", "-r", commit, "--", MANAGED]).split("\n").filter(Boolean);
  for (const line of tree) {
    const m = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
    if (!m) continue;
    const [, blob, file] = m;
    if (!seenBlobs.has(blob)) seenBlobs.set(blob, hash(git(["cat-file", "blob", blob], "buffer")));
    const rel = file.slice(PREFIX.length);
    (known[rel] = known[rel] || new Set()).add(seenBlobs.get(blob));
  }
}

const out = {};
for (const rel of Object.keys(known).sort()) out[rel] = [...known[rel]].sort();
const dest = path.join(root, "bin", "known-hashes.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
console.log(`known-hashes.json: ${Object.keys(out).length} files, ${seenBlobs.size} versions, ${commits.length} commits`);
