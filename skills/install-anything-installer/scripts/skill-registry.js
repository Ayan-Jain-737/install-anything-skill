#!/usr/bin/env node
/**
 * skill-registry.js
 * Manages discovery, global registration, and lifecycle of skills across agent harnesses.
 * Supports: Antigravity / Gemini, Open Agents, Claude Code, Hermes, OpenCode, Codex, Cursor, Zed.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SkillRegistry {
  constructor(options = {}) {
    this.homedir = options.homedir || os.homedir();
    this.dryRun = options.dryRun || false;
  }

  /**
   * Normalize an agent/harness identifier to canonical id.
   */
  normalizeHarnessId(id) {
    if (!id || typeof id !== 'string') return null;
    const clean = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    switch (clean) {
      case 'gemini':
      case 'agy':
      case 'antigravity':
      case 'antigravity-cli':
        return 'gemini';
      case 'claude':
      case 'claude-code':
      case 'claudecode':
        return 'claude';
      case 'agents':
      case 'open-agents':
      case 'global':
        return 'agents';
      case 'hermes':
      case 'hermes-agent':
        return 'hermes';
      case 'opencode':
        return 'opencode';
      case 'codex':
        return 'codex';
      case 'cursor':
        return 'cursor';
      case 'zed':
        return 'zed';
      default:
        return clean;
    }
  }

  /**
   * Detect which agent harness called or invoked the skill.
   */
  detectCallerHarness(options = {}) {
    // 1. Explicit options
    const explicit = options.targetHarness || options.harness || options.agent;
    if (explicit) return this.normalizeHarnessId(explicit);

    // 2. Explicit environment variables
    const envExplicit = process.env.INSTALL_ANYTHING_CALLER_HARNESS ||
                        process.env.INSTALL_ANYTHING_TARGET_HARNESS ||
                        process.env.INSTALL_ANYTHING_HARNESS ||
                        process.env.INSTALL_ANYTHING_AGENT ||
                        process.env.ENLIGHTEN_CALLER_HARNESS ||
                        process.env.ENLIGHTEN_TARGET_HARNESS ||
                        process.env.ENLIGHTEN_HARNESS ||
                        process.env.ENLIGHTEN_AGENT;
    if (envExplicit) return this.normalizeHarnessId(envExplicit);

    // 3. Active Agent runtime detection
    // Antigravity / Gemini (AGY)
    if (process.env.ANTIGRAVITY_AGENT ||
        process.env.ANTIGRAVITY_APP_DATA_DIR ||
        process.env.ANTIGRAVITY_CONVERSATION_ID ||
        process.env.ANTIGRAVITY_AGENTAPI_EXE ||
        process.env.ANTIGRAVITY_LS_ADDRESS ||
        process.env.GEMINI_CLI ||
        process.env.GEMINI_HOME ||
        process.env.AGY_VERSION) {
      return 'gemini';
    }

    // Claude Code
    if (process.env.CLAUDE_CODE_ENTRYPOINT ||
        process.env.CLAUDE_AGENT ||
        process.env.CLAUDE_SESSION_ID ||
        process.env.CLAUDE_HOME) {
      return 'claude';
    }

    // Hermes
    if (process.env.HERMES_CONFIG_DIR || process.env.HERMES_AGENT || process.env.HERMES_HOME) {
      return 'hermes';
    }

    // OpenCode
    if (process.env.OPENCODE_CONFIG_DIR || process.env.OPENCODE_HOME || process.env.OPENCODE_AGENT) {
      return 'opencode';
    }

    // Codex
    if (process.env.CODEX_HOME || process.env.CODEX_AGENT || process.env.CODEX_SESSION_ID) {
      return 'codex';
    }

    // Cursor
    if (process.env.CURSOR_AGENT || process.env.CURSOR_HOME) {
      return 'cursor';
    }

    // Zed
    if (process.env.ZED_AGENT || process.env.ZED_HOME) {
      return 'zed';
    }

    // 4. Invocation path inspection (argv, callerScript, __dirname)
    const candidates = [...process.argv, options.callerScript || '', __dirname].filter(Boolean);
    for (const item of candidates) {
      if (item.includes('/.gemini/') || item.includes('\\.gemini\\')) return 'gemini';
      if (item.includes('/.claude/') || item.includes('\\.claude\\')) return 'claude';
      if (item.includes('/.hermes/') || item.includes('\\.hermes\\')) return 'hermes';
      if (item.includes('/.codex/') || item.includes('\\.codex\\')) return 'codex';
      if (item.includes('/.zed/') || item.includes('\\.zed\\')) return 'zed';
      if (item.includes('/.cursor/') || item.includes('\\.cursor\\')) return 'cursor';
      if (item.includes('/opencode/') || item.includes('\\opencode\\')) return 'opencode';
    }

    // 5. Working directory inspection
    try {
      const cwd = process.cwd();
      if (cwd.includes('/.gemini') || cwd.includes('\\.gemini')) return 'gemini';
      if (cwd.includes('/.claude') || cwd.includes('\\.claude')) return 'claude';
    } catch {}

    return null;
  }

  /**
   * Returns metadata for all supported agent harnesses on the current system.
   */
  getHarnesses(options = {}) {
    const isLocal = options.scope === 'local' || options.local;
    const base = isLocal ? (options.projectRoot || options.cwd || process.cwd()) : this.homedir;

    const list = [
      {
        id: 'gemini',
        name: 'Antigravity / Gemini',
        skillsDir: path.join(base, '.gemini', 'skills'),
        configDir: path.join(base, '.gemini'),
        detected: fs.existsSync(path.join(base, '.gemini'))
      },
      {
        id: 'agents',
        name: 'Open Agents',
        skillsDir: path.join(base, '.agents', 'skills'),
        configDir: path.join(base, '.agents'),
        detected: fs.existsSync(path.join(base, '.agents'))
      },
      {
        id: 'claude',
        name: 'Claude Code',
        skillsDir: (!isLocal && process.env.CLAUDE_HOME)
          ? path.join(process.env.CLAUDE_HOME, 'skills')
          : path.join(base, '.claude', 'skills'),
        commandsDir: (!isLocal && process.env.CLAUDE_HOME)
          ? path.join(process.env.CLAUDE_HOME, 'commands')
          : path.join(base, '.claude', 'commands'),
        configDir: (!isLocal && process.env.CLAUDE_HOME) || path.join(base, '.claude'),
        detected: fs.existsSync((!isLocal && process.env.CLAUDE_HOME) || path.join(base, '.claude'))
      },
      {
        id: 'hermes',
        name: 'Hermes',
        skillsDir: (!isLocal && process.env.HERMES_CONFIG_DIR)
          ? path.join(process.env.HERMES_CONFIG_DIR, 'skills')
          : path.join(base, '.hermes', 'skills'),
        commandsDir: (!isLocal && process.env.HERMES_CONFIG_DIR)
          ? path.join(process.env.HERMES_CONFIG_DIR, 'commands')
          : path.join(base, '.hermes', 'commands'),
        configDir: (!isLocal && process.env.HERMES_CONFIG_DIR) || path.join(base, '.hermes'),
        detected: fs.existsSync((!isLocal && process.env.HERMES_CONFIG_DIR) || path.join(base, '.hermes'))
      },
      {
        id: 'opencode',
        name: 'OpenCode',
        skillsDir: (!isLocal && process.env.OPENCODE_CONFIG_DIR)
          ? path.join(process.env.OPENCODE_CONFIG_DIR, 'skills')
          : path.join(base, '.config', 'opencode', 'skills'),
        altSkillsDir: path.join(base, '.opencode', 'skills'),
        configDir: (!isLocal && process.env.OPENCODE_CONFIG_DIR) || path.join(base, '.config', 'opencode'),
        detected: fs.existsSync((!isLocal && process.env.OPENCODE_CONFIG_DIR) || path.join(base, '.config', 'opencode')) ||
                  fs.existsSync(path.join(base, '.opencode'))
      },
      {
        id: 'codex',
        name: 'Codex',
        skillsDir: (!isLocal && process.env.CODEX_HOME)
          ? path.join(process.env.CODEX_HOME, 'skills')
          : path.join(base, '.codex', 'skills'),
        configDir: (!isLocal && process.env.CODEX_HOME) || path.join(base, '.codex'),
        detected: fs.existsSync((!isLocal && process.env.CODEX_HOME) || path.join(base, '.codex'))
      },
      {
        id: 'cursor',
        name: 'Cursor',
        skillsDir: path.join(base, '.cursor', 'skills'),
        configDir: path.join(base, '.cursor'),
        detected: fs.existsSync(path.join(base, '.cursor'))
      },
      {
        id: 'zed',
        name: 'Zed',
        skillsDir: path.join(base, '.zed', 'skills'),
        configDir: path.join(base, '.zed'),
        detected: fs.existsSync(path.join(base, '.zed'))
      }
    ];

    return list;
  }

  /**
   * Parse frontmatter from SKILL.md.
   */
  parseSkillMd(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const metadata = {};
      if (match) {
        const lines = match[1].split('\n');
        let currentKey = null;
        for (const line of lines) {
          const keyVal = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
          if (keyVal) {
            currentKey = keyVal[1].trim();
            metadata[currentKey] = keyVal[2].trim().replace(/^['"]|['"]$/g, '');
          } else if (currentKey && line.match(/^\s+/)) {
            // Continuation of multiline string or array
            metadata[currentKey] += ' ' + line.trim();
          }
        }
      }
      return {
        name: metadata.name || null,
        description: metadata.description || null,
        version: metadata.version || '1.0.0',
        content
      };
    } catch {
      return null;
    }
  }

  /**
   * Discover all skills inside a repository directory.
   * Finds:
   *  1. Root SKILL.md
   *  2. skills/<skill-name>/SKILL.md (shallow or nested)
   *  3. .agents/skills/<skill-name>/SKILL.md
   *  4. .claude/skills/<skill-name>/SKILL.md
   *  5. .gemini/skills/<skill-name>/SKILL.md
   */
  discoverSkills(repoDir, repoNameHint = '') {
    const skills = [];
    const seen = new Set();

    const addSkill = (skillDir, skillFilePath, sourceCategory) => {
      const resolvedDir = path.resolve(skillDir);
      if (seen.has(resolvedDir)) return;
      seen.add(resolvedDir);

      const parsed = this.parseSkillMd(skillFilePath) || {};
      let name = parsed.name;
      if (!name) {
        // Derive name from directory
        name = path.basename(skillDir);
        if (name === '.' || name === path.basename(repoDir)) {
          name = repoNameHint || path.basename(repoDir);
        }
      }
      // Sanitize name: lowercase alphanumeric and dashes
      name = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '');

      skills.push({
        name,
        description: parsed.description || `Skill from ${path.basename(repoDir)}`,
        version: parsed.version || '1.0.0',
        skillDir: resolvedDir,
        skillFilePath: path.resolve(skillFilePath),
        relativePath: path.relative(repoDir, resolvedDir) || '.',
        sourceCategory
      });
    };

    // 1. Check root SKILL.md
    const rootSkillMd = path.join(repoDir, 'SKILL.md');
    if (fs.existsSync(rootSkillMd)) {
      addSkill(repoDir, rootSkillMd, 'root');
    }

    // Helper for recursive search up to maxDepth
    const searchSkillsDir = (baseDir, category, maxDepth = 3, currentDepth = 1) => {
      if (!fs.existsSync(baseDir)) return;
      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('.') && entry.name !== '.agents' && entry.name !== '.gemini' && entry.name !== '.claude') {
            continue;
          }
          if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === '.git') {
            continue;
          }

          const fullSub = path.join(baseDir, entry.name);
          const subSkillMd = path.join(fullSub, 'SKILL.md');
          if (fs.existsSync(subSkillMd)) {
            addSkill(fullSub, subSkillMd, category);
          } else if (currentDepth < maxDepth) {
            searchSkillsDir(fullSub, category, maxDepth, currentDepth + 1);
          }
        }
      } catch {}
    };

    // 2. Check skills/ directory
    searchSkillsDir(path.join(repoDir, 'skills'), 'skills-dir');

    // 3. Check .agents/skills
    searchSkillsDir(path.join(repoDir, '.agents', 'skills'), 'agents-skills');

    // 4. Check .claude/skills
    searchSkillsDir(path.join(repoDir, '.claude', 'skills'), 'claude-skills');

    // 5. Check .gemini/skills
    searchSkillsDir(path.join(repoDir, '.gemini', 'skills'), 'gemini-skills');

    return skills;
  }

  /**
   * Helper to safely link or copy a directory.
   */
  linkOrCopy(src, dest) {
    if (this.dryRun) return;

    if (fs.existsSync(dest) || fs.lstatSync(dest, { throwIfNoEntry: false })) {
      fs.rmSync(dest, { recursive: true, force: true });
    }

    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }

    try {
      // Create relative or absolute symlink
      fs.symlinkSync(src, dest, 'junction');
    } catch {
      // Fallback to recursive copy
      this.copyRecursive(src, dest);
    }
  }

  copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Register a discovered skill into the active agent harness and global storage.
   * By default, installs ONLY for the caller agent (e.g. AGY -> .gemini) and global (~/.agents),
   * without creating or modifying folders for unused agents like codex or zed.
   */
  registerSkill(skillInfo, options = {}) {
    const isLocal = options.scope === 'local' || options.local;
    const base = isLocal ? (options.projectRoot || options.cwd || process.cwd()) : this.homedir;
    const harnesses = this.getHarnesses({ scope: isLocal ? 'local' : 'global', projectRoot: base });
    const registeredHarnesses = [];

    // Determine target caller harness
    const callerHarness = options.targetHarness || options.harness || options.agent || this.detectCallerHarness(options);
    const normalizedTarget = callerHarness ? this.normalizeHarnessId(callerHarness) : null;
    const isAllHarnesses = Boolean(options.allHarnesses || options.allAgents);

    // 1. Canonical location in .agents/skills (local or global) is always updated
    const agentsDir = path.join(base, '.agents', 'skills');
    const canonicalDir = path.join(agentsDir, skillInfo.name);

    if (!this.dryRun) {
      if (!fs.existsSync(agentsDir)) {
        fs.mkdirSync(agentsDir, { recursive: true });
      }
      this.linkOrCopy(skillInfo.skillDir, canonicalDir);
    }
    registeredHarnesses.push({
      harness: 'Open Agents',
      skillsDir: agentsDir,
      path: canonicalDir
    });

    // 2. Register for the caller agent or explicit/detected harnesses only
    for (const harness of harnesses) {
      if (harness.id === 'agents') {
        // Handled as global canonical above
        continue;
      }

      let shouldInstall = false;
      if (isAllHarnesses) {
        shouldInstall = true;
      } else if (normalizedTarget) {
        // Specific caller agent detected: only install for this agent!
        shouldInstall = (harness.id === normalizedTarget);
      } else {
        // No caller agent detected from runtime/flags:
        // Only install into harnesses that ALREADY exist on the machine.
        // Never create new directories for unused agents like codex or zed!
        shouldInstall = harness.detected;
      }

      if (shouldInstall && harness.skillsDir) {
        const dest = path.join(harness.skillsDir, skillInfo.name);
        if (!this.dryRun) {
          if (!fs.existsSync(harness.skillsDir)) {
            fs.mkdirSync(harness.skillsDir, { recursive: true });
          }
          this.linkOrCopy(skillInfo.skillDir, dest);
        }
        registeredHarnesses.push({
          harness: harness.name,
          skillsDir: harness.skillsDir,
          path: dest
        });
      }
    }

    // Update .skill-lock.json if relevant
    if (options.repoUrl && !this.dryRun) {
      this.updateSkillLock(options.repoUrl, skillInfo, { isLocal, base });
    }

    return {
      skillName: skillInfo.name,
      registeredHarnesses
    };
  }

  /**
   * Atomic file writer to avoid reader/writer race conditions (L263)
   */
  atomicWriteFileSync(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Update ~/.agents/.skill-lock.json with newly registered skill.
   */
  updateSkillLock(repoUrl, skillInfo, lockOptions = {}) {
    const lockPath = lockOptions.isLocal
      ? path.join(lockOptions.base, '.skill-lock.json')
      : path.join(this.homedir, '.agents', '.skill-lock.json');
    let lockData = { version: 3, skills: {} };
    try {
      if (fs.existsSync(lockPath)) {
        lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (!lockData.skills) lockData.skills = {};
      }
    } catch {}

    const now = new Date().toISOString();
    lockData.skills[skillInfo.name] = {
      source: repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, ''),
      sourceType: 'github',
      sourceUrl: repoUrl,
      skillPath: path.join(skillInfo.relativePath, 'SKILL.md'),
      installedAt: lockData.skills[skillInfo.name]?.installedAt || now,
      updatedAt: now
    };

    try {
      this.atomicWriteFileSync(lockPath, JSON.stringify(lockData, null, 2));
    } catch {}
  }

  /**
   * Synthesize an in-depth agent skill manual for any installed repository (L184)
   */
  generateSkillForRepo(repoDir, repoInfo = {}) {
    const name = (repoInfo.name || path.basename(repoDir)).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const description = repoInfo.description ||
      `Provides actionable tools, commands, and workflows for ${repoInfo.name || path.basename(repoDir)}`;

    const skillDir = path.join(repoDir, '.install-anything-skill');
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const binaries = repoInfo.binaries || [];
    const isService = repoInfo.archetype === 'web-app' || repoInfo.hasDocker;

    // Read README if present to extract real recipes
    let readmeText = '';
    const readmeCandidates = ['README.md', 'readme.md', 'README'];
    for (const c of readmeCandidates) {
      const p = path.join(repoDir, c);
      if (fs.existsSync(p)) {
        try { readmeText = fs.readFileSync(p, 'utf8'); break; } catch {}
      }
    }

    // Extract code blocks from README
    const recipes = [];
    if (readmeText) {
      const codeRegex = /```(?:bash|sh|shell|console)?\s*\n([\s\S]*?)\n```/gi;
      let match;
      while ((match = codeRegex.exec(readmeText)) !== null) {
        const lines = match[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        if (lines.length > 0 && lines.some(l => l.includes(name) || (binaries[0] && l.includes(binaries[0])) || l.startsWith('docker '))) {
          recipes.push(lines.slice(0, 3).join('\n'));
        }
      }
    }

    // Safe attempt to extract --help output if binary exists
    let cliHelpOutput = '';
    if (binaries.length > 0) {
      try {
        const bin = binaries[0];
        const out = require('child_process').execSync(`${bin} --help 2>&1 || true`, {
          timeout: 2000,
          stdio: 'pipe'
        }).toString('utf8');
        if (out && out.length > 30 && !out.includes('command not found')) {
          cliHelpOutput = out.split('\n').slice(0, 25).join('\n');
        }
      } catch {}
    }

    const defaultRecipes = binaries.length > 0
      ? [
          `# Run standard verification\n${binaries[0]} --version`,
          `# Basic execution\n${binaries[0]} <path-or-argument>`
        ]
      : [
          `# Explore repository assets\nls -la ${repoDir}`
        ];

    const finalRecipes = recipes.length > 0 ? recipes.slice(0, 4) : defaultRecipes;

    const skillContent = `---
name: ${name}
description: >-
  ${description}. Use this skill when invoking, configuring, or running ${name}.
version: ${repoInfo.version || '1.0.0'}
---

# ${name}

${description}

## Quick Reference & Core Triggers
- **Repository Location**: \`${repoDir}\`
${repoInfo.repoUrl ? `- **Source Repository**: ${repoInfo.repoUrl}` : ''}
- **Primary Executable(s)**: ${binaries.length > 0 ? binaries.map(b => `\`${b}\``).join(', ') : '`Installed as local project`'}
- **Verification Command**: \`${binaries[0] ? `${binaries[0]} --version` : 'ls -la ' + repoDir}\`

## Command Synopsis & Key Flags
${cliHelpOutput ? `\`\`\`text\n${cliHelpOutput}\n\`\`\`` : `
- \`--help\`: Display built-in command documentation and available flags
- \`--version\`: Check installed tool version
- \`--json\`: Machine-readable structured output (if supported)
`}

## High-Frequency Agent Recipes

${finalRecipes.map((r, i) => `### Recipe ${i + 1}:\n\`\`\`bash\n${r}\n\`\`\``).join('\n\n')}

${isService ? `## Service Endpoints & Workflows
- **Default Port**: \`http://localhost:3000\`
- **Container Startup**: \`docker run -d -p 3000:3000 ${name}\`
- **Health Check**: \`curl -s http://localhost:3000/ || true\`
` : ''}

## Error Recovery & Troubleshooting
1. **Command Not Found**: Ensure \`~/.local/bin\` is in your \`PATH\` environment variable (\`export PATH="$HOME/.local/bin:$PATH"\`).
2. **Missing Configuration**: Check for project-level config files (e.g. \`.${name}.json\`, \`.env\`) in the working directory.
3. **Permission Denied**: Verify executable permissions (\`chmod +x ~/.local/bin/${binaries[0] || name}\`).
`;

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    this.atomicWriteFileSync(skillMdPath, skillContent);

    return {
      name,
      description,
      version: repoInfo.version || '1.0.0',
      skillDir,
      skillFilePath: skillMdPath,
      relativePath: '.install-anything-skill',
      generated: true
    };
  }

  /**
   * Register command definitions (commands/*.md) to Claude Code and Hermes if applicable.
   */
  registerCommands(commandsDir, options = {}) {
    if (!fs.existsSync(commandsDir)) return [];
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
    const harnesses = this.getHarnesses();
    const installed = [];

    const callerHarness = options.targetHarness || options.harness || options.agent || this.detectCallerHarness(options);
    const normalizedTarget = callerHarness ? this.normalizeHarnessId(callerHarness) : null;
    const isAllHarnesses = Boolean(options.allHarnesses || options.allAgents);

    for (const harness of harnesses) {
      if (!harness.commandsDir) continue;

      let shouldInstall = false;
      if (isAllHarnesses) {
        shouldInstall = true;
      } else if (normalizedTarget) {
        shouldInstall = (harness.id === normalizedTarget);
      } else {
        shouldInstall = harness.detected;
      }

      if (shouldInstall) {
        if (!this.dryRun && !fs.existsSync(harness.commandsDir)) {
          fs.mkdirSync(harness.commandsDir, { recursive: true });
        }
        for (const file of files) {
          const src = path.join(commandsDir, file);
          const dest = path.join(harness.commandsDir, file);
          if (!this.dryRun) {
            fs.copyFileSync(src, dest);
          }
          installed.push({ harness: harness.name, file, dest });
        }
      }
    }
    return installed;
  }

  /**
   * Remove a skill by name from all harnesses.
   */
  unregisterSkill(skillName) {
    const harnesses = this.getHarnesses();
    const removedFrom = [];

    for (const harness of harnesses) {
      if (harness.skillsDir) {
        const target = path.join(harness.skillsDir, skillName);
        if (fs.existsSync(target) || fs.lstatSync(target, { throwIfNoEntry: false })) {
          if (!this.dryRun) {
            fs.rmSync(target, { recursive: true, force: true });
          }
          removedFrom.push(harness.name);
        }
      }
    }

    // Also remove from ~/.agents/.skill-lock.json
    const lockPath = path.join(this.homedir, '.agents', '.skill-lock.json');
    if (!this.dryRun && fs.existsSync(lockPath)) {
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (lock.skills && lock.skills[skillName]) {
          delete lock.skills[skillName];
          fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
        }
      } catch {}
    }

    return removedFrom;
  }

  /**
   * Synchronize skills from global storage (~/.agents/skills) to the active harness or detected harnesses.
   */
  syncAllGlobalSkills(options = {}) {
    const harnesses = this.getHarnesses();
    const primarySkillsDir = path.join(this.homedir, '.agents', 'skills');
    const synced = [];

    if (!fs.existsSync(primarySkillsDir)) return synced;

    const callerHarness = options.targetHarness || options.harness || options.agent || this.detectCallerHarness(options);
    const normalizedTarget = callerHarness ? this.normalizeHarnessId(callerHarness) : null;
    const isAllHarnesses = Boolean(options.allHarnesses || options.allAgents);

    try {
      const skillEntries = fs.readdirSync(primarySkillsDir, { withFileTypes: true });
      for (const entry of skillEntries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        const skillName = entry.name;
        const srcPath = path.join(primarySkillsDir, skillName);

        for (const harness of harnesses) {
          if (!harness.skillsDir || harness.id === 'agents') continue;

          let shouldSync = false;
          if (isAllHarnesses) {
            shouldSync = true;
          } else if (normalizedTarget) {
            shouldSync = (harness.id === normalizedTarget);
          } else {
            shouldSync = harness.detected;
          }

          if (shouldSync) {
            const destPath = path.join(harness.skillsDir, skillName);
            if (!fs.existsSync(destPath) && !fs.lstatSync(destPath, { throwIfNoEntry: false })) {
              if (!this.dryRun) {
                if (!fs.existsSync(harness.skillsDir)) {
                  fs.mkdirSync(harness.skillsDir, { recursive: true });
                }
                this.linkOrCopy(srcPath, destPath);
              }
              synced.push({ skill: skillName, harness: harness.name });
            }
          }
        }
      }
    } catch {}

    return synced;
  }
}

module.exports = { SkillRegistry };
