#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function log(msg) { console.log(msg); }
function ok(msg) { log(`${GREEN}+${RESET} ${msg}`); }
function up(msg) { log(`${YELLOW}~${RESET} ${msg}`); }
function warn(msg) { log(`${RED}!${RESET} ${msg}`); }
function info(msg) { log(`${DIM}  ${msg}${RESET}`); }

const PKG = require(path.join(__dirname, "..", "package.json"));

// ---------------------------------------------------------------------------
// Ownership model
//
//   MANAGED (sisyo-owned)  — everything under .claude/ that ships in templates/
//                            (rules/docs.md, skills/*). Replaced on --update, but ONLY
//                            when the local copy is byte-identical to what sisyo last
//                            installed (tracked by hash in the manifest). A locally
//                            edited managed file is never overwritten: the new version
//                            is written next to it as <file>.sisyo-new instead.
//
//   USER-OWNED             — SISYO.md, CLAUDE.md, docs/**. Created once if missing,
//                            never touched again, not even with --force.
//
// The manifest (.claude/sisyo.json) records the installed sisyo version and the hash
// of every managed file as sisyo wrote it.
// ---------------------------------------------------------------------------

const MANIFEST_REL = ".claude/sisyo.json";
const NEW_SUFFIX = ".sisyo-new";

function toPosix(p) { return p.split(path.sep).join("/"); }
function isManaged(rel) { return rel.startsWith(".claude/") && rel !== MANIFEST_REL; }
function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
function hashFile(p) { return sha256(fs.readFileSync(p)); }

function readManifest(target) {
  const p = path.join(target, MANIFEST_REL);
  if (!fs.existsSync(p)) return null;
  try {
    const m = JSON.parse(fs.readFileSync(p, "utf8"));
    return { version: m.version || "unknown", files: m.files || {} };
  } catch {
    return null;
  }
}

function writeManifest(target, files) {
  const p = path.join(target, MANIFEST_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const sorted = {};
  for (const k of Object.keys(files).sort()) sorted[k] = files[k];
  fs.writeFileSync(p, JSON.stringify({ version: PKG.version, files: sorted }, null, 2) + "\n");
}

function listTemplateFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTemplateFiles(full, base));
    else out.push({ rel: toPosix(path.relative(base, full)), src: full });
  }
  return out;
}

function ensureClaudeMdImport(target, dryRun) {
  const claudePath = path.join(target, "CLAUDE.md");
  const importLine = "@SISYO.md";
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, "utf8");
    if (!content.includes(importLine)) {
      if (!dryRun) fs.appendFileSync(claudePath, `\n${importLine}\n`);
      up("CLAUDE.md (added @SISYO.md import)");
    }
  } else {
    if (!dryRun) fs.writeFileSync(claudePath, `${importLine}\n`);
    ok("CLAUDE.md");
  }
}

function fillDates(target) {
  const today = new Date().toISOString().split("T")[0];
  const files = [
    "docs/MAP.md",
    "docs/99_progress/handoff.md",
    "docs/99_progress/todo.md",
    "docs/99_progress/features.md",
  ];
  for (const rel of files) {
    const p = path.join(target, rel);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, "utf8");
    if (content.includes("YYYY-MM-DD")) {
      fs.writeFileSync(p, content.replace(/YYYY-MM-DD/g, today));
    }
  }
}

function ensureGitignore(target, dryRun) {
  const gitignorePath = path.join(target, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return;
  const gitignore = fs.readFileSync(gitignorePath, "utf8");
  const lines = [];
  if (!gitignore.includes("CLAUDE.local.md")) lines.push("CLAUDE.local.md", ".claude/settings.local.json");
  if (!gitignore.includes(NEW_SUFFIX)) lines.push(`*${NEW_SUFFIX}`);
  if (lines.length === 0) return;
  if (!dryRun) fs.appendFileSync(gitignorePath, "\n# Claude Code local\n" + lines.join("\n") + "\n");
  ok(".gitignore updated");
}

function main() {
  const args = process.argv.slice(2);
  const updateMode = args.includes("--update");
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const targetDir = args.find(a => !a.startsWith("-")) || ".";
  const target = path.resolve(targetDir);
  const templatesDir = path.join(__dirname, "..", "templates");

  log("");
  if (updateMode) {
    log(`${BOLD}${CYAN}sisyo${RESET} ${DIM}v${PKG.version} — updating managed files${force ? " (force)" : ""}${dryRun ? " (dry-run)" : ""}${RESET}`);
  } else {
    log(`${BOLD}${CYAN}sisyo${RESET} ${DIM}v${PKG.version} — Smart docs for Claude Code${dryRun ? " (dry-run)" : ""}${RESET}`);
  }
  log("");

  if (!fs.existsSync(templatesDir)) {
    console.error("Error: templates directory not found");
    process.exit(1);
  }

  const manifest = readManifest(target);
  const prevFiles = manifest ? manifest.files : {};
  const nextFiles = {};
  const conflicts = [];
  let updated = 0, added = 0, unchanged = 0;

  if (updateMode && manifest) info(`installed: v${manifest.version} → v${PKG.version}`);
  if (updateMode && !manifest) {
    info("no manifest found (installed before v1.6). Files that differ from the new");
    info("templates are treated as locally modified — review *.sisyo-new or use --force.");
  }

  const templates = listTemplateFiles(templatesDir);

  for (const { rel, src } of templates) {
    const dest = path.join(target, rel);
    const managed = isManaged(rel);
    const srcBuf = fs.readFileSync(src);
    const srcHash = sha256(srcBuf);

    if (!fs.existsSync(dest)) {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, srcBuf);
      }
      if (managed) nextFiles[rel] = srcHash;
      ok(rel);
      added++;
      continue;
    }

    if (!managed) {
      info(`skip ${rel} (yours)`);
      continue;
    }

    const curHash = hashFile(dest);
    const newPath = dest + NEW_SUFFIX;

    if (curHash === srcHash) {
      nextFiles[rel] = srcHash;
      unchanged++;
      if (fs.existsSync(newPath) && !dryRun) fs.unlinkSync(newPath);   // resolved by hand
      continue;
    }

    if (!updateMode) {
      info(`skip ${rel} (exists — run with --update)`);
      nextFiles[rel] = prevFiles[rel] || curHash;
      continue;
    }

    const pristine = prevFiles[rel] !== undefined && prevFiles[rel] === curHash;
    if (pristine || force) {
      if (!dryRun) {
        fs.writeFileSync(dest, srcBuf);
        if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      }
      nextFiles[rel] = srcHash;
      up(`${rel} (updated${force && !pristine ? ", overwrote local edits" : ""})`);
      updated++;
      continue;
    }

    // Locally modified → keep theirs, drop the new version next to it.
    if (!dryRun) fs.writeFileSync(newPath, srcBuf);
    nextFiles[rel] = prevFiles[rel] || curHash;
    warn(`${rel} modified locally — kept yours, new version at ${rel}${NEW_SUFFIX}`);
    conflicts.push(rel);
  }

  // Managed files sisyo no longer ships: remove only if still pristine.
  if (updateMode) {
    const shipped = new Set(templates.map(t => t.rel));
    for (const rel of Object.keys(prevFiles)) {
      if (shipped.has(rel)) continue;
      const dest = path.join(target, rel);
      if (!fs.existsSync(dest)) continue;
      if (hashFile(dest) === prevFiles[rel]) {
        if (!dryRun) {
          fs.unlinkSync(dest);
          try { fs.rmdirSync(path.dirname(dest)); } catch { /* not empty — keep */ }
        }
        up(`${rel} (removed — no longer shipped)`);
      } else {
        warn(`${rel} no longer shipped by sisyo but modified locally — left in place`);
        nextFiles[rel] = prevFiles[rel];
      }
    }
  }

  ensureClaudeMdImport(target, dryRun);
  if (!updateMode && !dryRun) fillDates(target);
  ensureGitignore(target, dryRun);
  if (!dryRun) writeManifest(target, nextFiles);

  log("");
  if (dryRun) {
    log(`${BOLD}Dry run.${RESET} +${added} added, ~${updated} updated, ${unchanged} unchanged, ${conflicts.length} conflicts. Nothing written.`);
  } else if (updateMode) {
    log(`${BOLD}Done!${RESET} +${added} added, ~${updated} updated, ${unchanged} unchanged. Your SISYO.md, CLAUDE.md and docs/ are untouched.`);
  } else {
    log(`${BOLD}Done!${RESET} Next steps:`);
    log("");
    log(`  1. Edit ${CYAN}SISYO.md${RESET} — replace [Project Name] with yours`);
    log(`  2. Open Claude Code and start building`);
    log(`  3. Docs auto-update as you work`);
  }
  if (conflicts.length > 0) {
    log("");
    log(`${RED}${conflicts.length} file(s) were modified locally and NOT overwritten:${RESET}`);
    for (const rel of conflicts) log(`  ${rel}  →  ${rel}${NEW_SUFFIX}`);
    log("");
    log(`  Review:  git diff --no-index <file> <file>${NEW_SUFFIX}`);
    log(`  Accept:  move the ${NEW_SUFFIX} file over the original, or rerun with ${CYAN}--force${RESET}`);
    log(`  Keep:    delete the ${NEW_SUFFIX} file (sisyo will offer it again next update)`);
  }
  log("");
  log(`${DIM}Docs system: SISYO.md -> docs/MAP.md -> _summary.md -> detail files${RESET}`);
  log("");
}

main();
