#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function log(msg) { console.log(msg); }
function ok(msg) { log(`${GREEN}+${RESET} ${msg}`); }
function up(msg) { log(`${YELLOW}~${RESET} ${msg}`); }
function info(msg) { log(`${DIM}  ${msg}${RESET}`); }

// System files that get replaced on --update
const SYSTEM_FILES = [
  "SISYO.md",
  ".claude/rules/docs.md",
  ".claude/skills/vibe-docs/SKILL.md",
];

function isSystemFile(relativePath) {
  return SYSTEM_FILES.some(f => relativePath === f || relativePath.endsWith(f));
}

function ensureClaudeMdImport(target) {
  const claudePath = path.join(target, "CLAUDE.md");
  const importLine = "@SISYO.md";
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, "utf8");
    if (!content.includes(importLine)) {
      fs.appendFileSync(claudePath, `\n${importLine}\n`);
      up("CLAUDE.md (added @SISYO.md import)");
    }
  } else {
    fs.writeFileSync(claudePath, `${importLine}\n`);
    ok("CLAUDE.md");
  }
}

function copyDir(src, dest, { updateMode = false } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, { updateMode });
    } else {
      const rel = path.relative(process.cwd(), destPath);
      if (fs.existsSync(destPath)) {
        if (updateMode && isSystemFile(rel)) {
          fs.copyFileSync(srcPath, destPath);
          up(`${rel} (updated)`);
        } else {
          info(`skip ${rel} (exists)`);
        }
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      ok(rel);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const updateMode = args.includes("--update");
  const targetDir = args.find(a => !a.startsWith("-")) || ".";
  const target = path.resolve(targetDir);
  const templatesDir = path.join(__dirname, "..", "templates");

  log("");
  if (updateMode) {
    log(`${BOLD}${CYAN}sisyo${RESET} ${DIM}Updating system files...${RESET}`);
  } else {
    log(`${BOLD}${CYAN}sisyo${RESET} ${DIM}Smart docs for Claude Code${RESET}`);
  }
  log("");

  if (!fs.existsSync(templatesDir)) {
    console.error("Error: templates directory not found");
    process.exit(1);
  }

  // Copy all templates
  copyDir(templatesDir, target, { updateMode });

  // Ensure CLAUDE.md imports SISYO.md
  ensureClaudeMdImport(target);

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Update dates in MAP.md and handoff (only on fresh install, not --update)
  if (!updateMode) {
    const mapPath = path.join(target, "docs", "MAP.md");
    if (fs.existsSync(mapPath)) {
      let mapContent = fs.readFileSync(mapPath, "utf8");
      if (mapContent.includes("YYYY-MM-DD")) {
        mapContent = mapContent.replace(/YYYY-MM-DD/g, today);
        fs.writeFileSync(mapPath, mapContent);
      }
    }

    const handoffPath = path.join(target, "docs", "99_progress", "handoff.md");
    if (fs.existsSync(handoffPath)) {
      let content = fs.readFileSync(handoffPath, "utf8");
      if (content.includes("YYYY-MM-DD")) {
        content = content.replace(/YYYY-MM-DD/g, today);
        fs.writeFileSync(handoffPath, content);
      }
    }

    const todoPath = path.join(target, "docs", "99_progress", "todo.md");
    if (fs.existsSync(todoPath)) {
      let content = fs.readFileSync(todoPath, "utf8");
      if (content.includes("YYYY-MM-DD")) {
        content = content.replace(/YYYY-MM-DD/g, today);
        fs.writeFileSync(todoPath, content);
      }
    }

    const featuresPath = path.join(target, "docs", "99_progress", "features.md");
    if (fs.existsSync(featuresPath)) {
      let content = fs.readFileSync(featuresPath, "utf8");
      if (content.includes("YYYY-MM-DD")) {
        content = content.replace(/YYYY-MM-DD/g, today);
        fs.writeFileSync(featuresPath, content);
      }
    }
  }

  // Add to .gitignore if exists
  const gitignorePath = path.join(target, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignore.includes("CLAUDE.local.md")) {
      fs.appendFileSync(gitignorePath,
        "\n# Claude Code local\nCLAUDE.local.md\n.claude/settings.local.json\n"
      );
      ok(".gitignore updated");
    }
  }

  log("");
  if (updateMode) {
    log(`${BOLD}Done!${RESET} System files updated. Your docs are untouched.`);
  } else {
    log(`${BOLD}Done!${RESET} Next steps:`);
    log("");
    log(`  1. Edit ${CYAN}SISYO.md${RESET} — replace [Project Name] with yours`);
    log(`  2. Open Claude Code and start building`);
    log(`  3. Docs auto-update as you work`);
  }
  log("");
  log(`${DIM}Docs system: SISYO.md -> docs/MAP.md -> _summary.md -> detail files${RESET}`);
  log("");
}

main();
