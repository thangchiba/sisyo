#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function log(msg) { console.log(msg); }
function ok(msg) { log(`${GREEN}+${RESET} ${msg}`); }
function info(msg) { log(`${DIM}  ${msg}${RESET}`); }

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Skip if file already exists
      if (fs.existsSync(destPath)) {
        info(`skip ${path.relative(process.cwd(), destPath)} (exists)`);
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      ok(path.relative(process.cwd(), destPath));
    }
  }
}

function main() {
  const targetDir = process.argv[2] || ".";
  const target = path.resolve(targetDir);
  const templatesDir = path.join(__dirname, "..", "templates");

  log("");
  log(`${BOLD}${CYAN}sisyo${RESET} ${DIM}Smart docs for Claude Code${RESET}`);
  log("");

  if (!fs.existsSync(templatesDir)) {
    console.error("Error: templates directory not found");
    process.exit(1);
  }

  // Copy all templates
  copyDir(templatesDir, target);

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Update dates in MAP.md and handoff
  const mapPath = path.join(target, "docs", "MAP.md");
  if (fs.existsSync(mapPath)) {
    let mapContent = fs.readFileSync(mapPath, "utf8");
    mapContent = mapContent.replace(/YYYY-MM-DD/g, today);
    fs.writeFileSync(mapPath, mapContent);
  }

  const handoffPath = path.join(target, "docs", "99_progress", "handoff.md");
  if (fs.existsSync(handoffPath)) {
    let content = fs.readFileSync(handoffPath, "utf8");
    content = content.replace(/YYYY-MM-DD/g, today);
    fs.writeFileSync(handoffPath, content);
  }

  const todoPath = path.join(target, "docs", "99_progress", "todo.md");
  if (fs.existsSync(todoPath)) {
    let content = fs.readFileSync(todoPath, "utf8");
    content = content.replace(/YYYY-MM-DD/g, today);
    fs.writeFileSync(todoPath, content);
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
  log(`${BOLD}Done!${RESET} Next steps:`);
  log("");
  log(`  1. Edit ${CYAN}CLAUDE.md${RESET} — replace [Project Name] with yours`);
  log(`  2. Open Claude Code and start building`);
  log(`  3. Docs auto-update as you work`);
  log("");
  log(`${DIM}Docs system: CLAUDE.md -> docs/MAP.md -> load only what's needed${RESET}`);
  log("");
}

main();
