#!/usr/bin/env node
/**
 * readme-guide.js
 * Rate-limit-safe Repo Triage & Readme Guide Engine for install-anything-skill
 *
 * Implements:
 * 1. Raw CDN manifest fetching (raw.githubusercontent.com) - 0 API rate limit quota
 * 2. Local HTTP/manifest caching with TTL
 * 3. 7-Archetype classification before cloning
 * 4. Targeted section parsing (handles big complex READMEs without regex confusion)
 * 5. Interactive Human Handoff Report generator for complex non-AI apps
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

class ReadmeGuide {
  constructor(options = {}) {
    this.homedir = options.homedir || os.homedir();
    this.timeout = options.timeout || 15000;
    this.cacheDir = options.cacheDir || path.join(this.homedir, '.install-anything', 'cache', 'http');
    this.ttl = options.ttl || 3600 * 1000; // 1 hour default cache
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch {}
    }
  }

  getCacheKey(url) {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  getCached(url) {
    try {
      const key = this.getCacheKey(url);
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Date.now() - item.timestamp < this.ttl) {
          return item.data;
        }
      }
    } catch {}
    return null;
  }

  setCache(url, data) {
    try {
      const key = this.getCacheKey(url);
      const filePath = path.join(this.cacheDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify({
        url,
        timestamp: Date.now(),
        data
      }));
    } catch {}
  }

  isGitHubHost(hostname) {
    if (!hostname) return false;
    const h = hostname.toLowerCase();
    return h === 'github.com' || h === 'api.github.com' || h === 'raw.githubusercontent.com' || h === 'codeload.github.com' || h === 'objects.githubusercontent.com';
  }

  isPrivateOrBlockedHost(hostname) {
    if (!hostname) return true;
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') return true;
    if (h === '169.254.169.254' || h === 'metadata.google.internal' || h === 'instance-data') return true;
    const ipMatch = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const b0 = parseInt(ipMatch[1], 10);
      const b1 = parseInt(ipMatch[2], 10);
      if (b0 === 10) return true;
      if (b0 === 127) return true;
      if (b0 === 169 && b1 === 254) return true;
      if (b0 === 192 && b1 === 168) return true;
      if (b0 === 172 && (b1 >= 16 && b1 <= 31)) return true;
      if (b0 === 0) return true;
    }
    return false;
  }

  /**
   * Safe fetch with token passthrough and local caching
   */
  fetchUrl(url, maxRedirects = 3) {
    const cached = this.getCached(url);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    return new Promise((resolve) => {
      if (maxRedirects < 0) return resolve(null);

      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return resolve(null);
      }

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return resolve(null);
      }

      if (this.isPrivateOrBlockedHost(parsed.hostname)) {
        return resolve(null);
      }

      const client = parsed.protocol === 'https:' ? https : http;
      const headers = {
        'User-Agent': 'ias-installer/3.1 (+https://github.com/Ayan-Jain-737/install-anything-skill)'
      };

      // Token passthrough ONLY to legitimate GitHub hostnames
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (token && this.isGitHubHost(parsed.hostname)) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = client.get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return resolve(this.fetchUrl(redirectUrl, maxRedirects - 1));
        }
        if (res.statusCode !== 200) {
          return resolve(null);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.setCache(url, data);
          resolve(data);
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(this.timeout, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  parseRepoCoordinates(repoInput) {
    let clean = (repoInput || '').trim();
    if (!clean) return null;

    if (fs.existsSync(clean)) {
      return { isLocal: true, path: path.resolve(clean) };
    }

    let owner = null;
    let repo = null;

    const match = clean.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
    if (match) {
      owner = match[1];
      repo = match[2];
    } else if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(clean)) {
      const parts = clean.split('/');
      owner = parts[0];
      repo = parts[1];
    }

    if (owner && repo) {
      return { isLocal: false, owner, repo, identifier: `${owner}-${repo}`.toLowerCase() };
    }

    return null;
  }

  /**
   * Fetch any file from repository root using raw CDN (zero API rate limit)
   */
  async fetchRawFile(repoInput, filename) {
    const coords = this.parseRepoCoordinates(repoInput);
    if (!coords) return null;

    if (coords.isLocal) {
      const resolvedBase = path.resolve(coords.path);
      const p = path.resolve(coords.path, filename);
      if (!p.startsWith(resolvedBase)) {
        return null; // Prevent path traversal
      }
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf8');
      }
      return null;
    }

    const branches = ['HEAD', 'main', 'master'];
    for (const b of branches) {
      const url = `https://raw.githubusercontent.com/${encodeURIComponent(coords.owner)}/${encodeURIComponent(coords.repo)}/${b}/${encodeURIComponent(filename)}`;
      const data = await this.fetchUrl(url);
      if (data && !data.startsWith('404: Not Found')) {
        return data;
      }
    }

    return null;
  }

  /**
   * Fetch README (local or remote raw CDN)
   */
  async fetchReadme(repoInput) {
    const coords = this.parseRepoCoordinates(repoInput);
    if (!coords) return null;

    if (coords.isLocal) {
      const candidates = ['README.md', 'readme.md', 'README', 'Readme.md'];
      for (const c of candidates) {
        const p = path.join(coords.path, c);
        if (fs.existsSync(p)) {
          return { source: 'local', content: fs.readFileSync(p, 'utf8') };
        }
      }
      return null;
    }

    const branches = ['HEAD', 'main', 'master'];
    const filenames = ['README.md', 'readme.md', 'README'];

    for (const b of branches) {
      for (const fn of filenames) {
        const url = `https://raw.githubusercontent.com/${coords.owner}/${coords.repo}/${b}/${fn}`;
        const content = await this.fetchUrl(url);
        if (content && !content.startsWith('404: Not Found')) {
          return {
            source: url,
            owner: coords.owner,
            repo: coords.repo,
            content
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract targeted installation sections from README
   * Fixes L75: avoids getting confused by 50-page complex READMEs
   */
  extractTargetedSections(readmeText) {
    if (!readmeText) return '';

    // Guard against huge strings for regex scanning
    const boundedText = readmeText.length > 2 * 1024 * 1024 ? readmeText.slice(0, 2 * 1024 * 1024) : readmeText;

    // Match sections with headers like: ## Installation, ## Quick Start, ## Getting Started, ## Setup, ## How to install
    const sectionRegex = /(?:^|\n)#{1,3}\s*(?:install(?:ation)?|quick\s*start|getting\s*started|setup|how\s*to\s*use|usage)\b([\s\S]*?)(?=(?:\n#{1,3}\s+[^\n]+)|$)/gi;
    let combined = '';
    let match;
    while ((match = sectionRegex.exec(boundedText)) !== null) {
      combined += '\n' + match[1];
      if (combined.length > 50000) break;
    }

    return combined.trim();
  }

  /**
   * Parse install guide from README
   */
  parseInstallGuide(readmeText, repoInput = '') {
    if (!readmeText) {
      return { hasGuide: false, suggestions: [], rawSection: '' };
    }

    // First try targeted installation sections to avoid false positives in big READMEs
    const targetedText = this.extractTargetedSections(readmeText);
    let textToScan = targetedText.length > 50 ? targetedText : readmeText;
    if (textToScan.length > 1024 * 1024) {
      textToScan = textToScan.slice(0, 1024 * 1024);
    }

    const codeBlocks = [];
    const codeRegex = /```(?:bash|sh|shell|console|zsh|powershell)?\s*\n([\s\S]*?)\n```/gi;
    let match;
    while ((match = codeRegex.exec(textToScan)) !== null) {
      codeBlocks.push(match[1].trim());
      if (codeBlocks.length >= 100) break;
    }

    // Also check inline commands
    const inlineRegex = /`([^`\n]+)`/g;
    while ((match = inlineRegex.exec(textToScan)) !== null) {
      const cmd = match[1].trim();
      if (/^(?:npx|npm|pnpm|yarn|bun|pip|uv|pipx|cargo|brew|curl|docker)\s/i.test(cmd)) {
        codeBlocks.push(cmd);
        if (codeBlocks.length >= 150) break;
      }
    }

    const suggestions = [];
    const seen = new Set();

    for (const block of codeBlocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      for (const line of lines) {
        if (seen.has(line)) continue;

        // Pattern A: Agent skills CLI (e.g. npx skills add ...)
        if (/^(?:npx\s+)?skills\s+add\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'skills_cli',
            command: line,
            priority: 1,
            description: 'Install skills directly via Skills CLI'
          });
        }
        // Pattern B: npx universal/tool setup
        else if (/^npx\s+[a-zA-Z0-9_@.-]+\s+(?:setup|install)\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'npx_setup',
            command: line,
            priority: 2,
            description: 'Run author npx guided setup'
          });
        }
        // Pattern C: One-liner script installers (curl ... | bash)
        else if (/^curl\s+.*\|\s*(?:bash|sh)/i.test(line) || /^wget\s+.*\|\s*(?:bash|sh)/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'curl_sh',
            command: line,
            priority: 3,
            description: 'Run author one-command installer script'
          });
        }
        // Pattern D: Global package manager installs
        else if (/^(?:npm|pnpm|yarn|bun)\s+(?:install|add|i)\s+(?:-g|--global)\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'npm_global',
            command: line,
            priority: 4,
            description: 'Global package installation'
          });
        }
        // Pattern E: Isolated Python tool install (uv tool, pipx, pip)
        else if (/^(?:uv\s+tool\s+install|pipx\s+install|pip\s+install)\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'pip',
            command: line,
            priority: 5,
            description: 'Python tool installation'
          });
        }
        // Pattern F: Cargo install
        else if (/^cargo\s+install\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'cargo',
            command: line,
            priority: 5,
            description: 'Rust cargo installation'
          });
        }
        // Pattern G: Docker run / compose
        else if (/^docker(?:-compose|\s+compose)?\s+(?:run|up)\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'docker',
            command: line,
            priority: 6,
            description: 'Docker container startup'
          });
        }
        // Pattern H: Local script execution (e.g. ./install.sh)
        else if (/^(?:bash\s+)?\.?\/?install\.sh\b/i.test(line)) {
          seen.add(line);
          suggestions.push({
            type: 'local_script',
            command: line,
            priority: 7,
            description: 'Execute repo install script'
          });
        }
      }
    }

    suggestions.sort((a, b) => a.priority - b.priority);

    return {
      hasGuide: suggestions.length > 0,
      suggestions,
      primarySuggestion: suggestions[0] || null
    };
  }

  /**
   * 7-Archetype Classifier (Zero-Clone Triage)
   * Discovers what kind of repository this is BEFORE downloading.
   */
  async classifyArchetype(repoInput, options = {}) {
    const coords = this.parseRepoCoordinates(repoInput);
    const result = {
      archetype: 'source-build',
      requiresClone: true,
      hasSkills: false,
      hasReleases: false,
      hasDocker: false,
      binaries: [],
      framework: null,
      suggestedMethod: 'clone',
      submodules: false
    };

    if (!coords) return result;

    let pkgJson = null;
    let cargoToml = null;
    let pyproject = null;
    let dockerfile = null;
    let compose = null;
    let gitmodules = null;
    let skillMd = null;

    if (coords.isLocal) {
      // Local repository
      const exists = (file) => fs.existsSync(path.join(coords.path, file));
      const read = (file) => exists(file) ? fs.readFileSync(path.join(coords.path, file), 'utf8') : null;

      pkgJson = read('package.json');
      cargoToml = read('Cargo.toml');
      pyproject = read('pyproject.toml') || read('requirements.txt');
      dockerfile = read('Dockerfile');
      compose = read('docker-compose.yml') || read('compose.yml');
      gitmodules = read('.gitmodules');
      skillMd = read('SKILL.md');

      // Check skills directory
      let localSkillCount = 0;
      if (skillMd) localSkillCount++;
      const skillsDir = path.join(coords.path, 'skills');
      if (fs.existsSync(skillsDir)) {
        try {
          const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
          for (const e of entries) {
            if (e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md'))) {
              localSkillCount++;
            }
          }
        } catch {}
      }
      if (localSkillCount > 0) {
        result.hasSkills = true;
        result.skillCount = localSkillCount;
      }
    } else {
      // Remote raw probes without cloning
      [pkgJson, cargoToml, pyproject, dockerfile, compose, gitmodules, skillMd] = await Promise.all([
        this.fetchRawFile(repoInput, 'package.json'),
        this.fetchRawFile(repoInput, 'Cargo.toml'),
        this.fetchRawFile(repoInput, 'pyproject.toml'),
        this.fetchRawFile(repoInput, 'Dockerfile'),
        this.fetchRawFile(repoInput, 'docker-compose.yml'),
        this.fetchRawFile(repoInput, '.gitmodules'),
        this.fetchRawFile(repoInput, 'SKILL.md')
      ]);

      if (skillMd) {
        result.hasSkills = true;
        result.skillCount = 1;
      }
    }

    // Check if README explicitly mentions skills CLI or SKILL.md
    if (!result.hasSkills) {
      try {
        const readme = await this.fetchReadme(repoInput);
        if (readme && readme.content) {
          const guide = this.parseInstallGuide(readme.content, repoInput);
          if (guide && guide.primarySuggestion && guide.primarySuggestion.type === 'skills_cli') {
            result.hasSkills = true;
            result.skillCount = 1;
          } else if (/skills\s+add\b/i.test(readme.content) || /\bSKILL\.md\b/i.test(readme.content)) {
            result.hasSkills = true;
            result.skillCount = 1;
          }
        }
      } catch {}
    }

    if (dockerfile || compose) result.hasDocker = true;
    if (gitmodules && typeof gitmodules === 'string') {
      result.submodules = true;
      try {
        const urls = [];
        const matches = gitmodules.matchAll(/url\s*=\s*([^\r\n]+)/g);
        for (const m of matches) {
          urls.push(m[1].trim());
        }
        result.submoduleUrls = urls;
      } catch {}
    }

    // Archetype 1: Prompt Skill Pack
    if (result.hasSkills) {
      result.archetype = 'skill-pack';
      result.requiresClone = false;
      result.suggestedMethod = 'stream-extract';
      return result;
    }

    // Archetype 3: CLI Package Manager Tool
    if (pkgJson) {
      try {
        const pkg = typeof pkgJson === 'string' ? JSON.parse(pkgJson) : pkgJson;
        if (pkg && typeof pkg === 'object' && !Array.isArray(pkg) && pkg.bin) {
          result.archetype = 'pkg-tool';
          result.requiresClone = false;
          result.suggestedMethod = 'npm-install';
          result.binaries = typeof pkg.bin === 'string'
            ? [pkg.name || 'tool']
            : (typeof pkg.bin === 'object' && pkg.bin !== null ? Object.keys(pkg.bin) : []);
          return result;
        }
      } catch {}
    }

    if (cargoToml && typeof cargoToml === 'string' && (cargoToml.includes('[[bin]]') || cargoToml.includes('[package]'))) {
      try {
        const match = cargoToml.match(/name\s*=\s*["']([^"']+)["']/);
        if (match && match[1]) {
          result.binaries.push(match[1]);
        }
      } catch {}
    }

    if (pyproject && typeof pyproject === 'string' && pyproject.includes('[project.scripts]')) {
      result.archetype = 'pkg-tool';
      result.requiresClone = false;
      result.suggestedMethod = 'uv-tool';
      return result;
    }

    // Archetype 4: Fullstack Web App / Service (checked before release binaries)
    if (dockerfile || compose) {
      result.archetype = 'web-app';
      result.requiresClone = false;
      result.suggestedMethod = 'docker-or-api-skill';
      return result;
    }

    // Check for web app without Docker
    if (pkgJson) {
      try {
        const pkg = typeof pkgJson === 'string' ? JSON.parse(pkgJson) : pkgJson;
        if (pkg && typeof pkg === 'object' && !Array.isArray(pkg)) {
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          if (deps.next || deps.react || deps.vue || deps.express || deps.fastify) {
            result.archetype = 'web-app';
            result.requiresClone = false;
            result.suggestedMethod = 'service-skill';
            return result;
          }
        }
      } catch {}
    }

    // Archetype 2: CLI Binary with pre-compiled GitHub releases (Zero-Clone)
    if (coords.owner && coords.repo && coords.owner !== 'local') {
      const releaseProbe = await this.probeReleaseAvailability(coords.owner, coords.repo);
      if (releaseProbe && releaseProbe.hasReleases) {
        result.archetype = 'cli-binary';
        result.requiresClone = false;
        result.suggestedMethod = 'binary-release-download';
        if (result.binaries.length === 0) {
          result.binaries.push(coords.repo);
        }
        return result;
      }
    }

    return result;
  }

  /**
   * Quick rate-limit-free probe to check if GitHub releases exist
   */
  probeReleaseAvailability(owner, repo) {
    return new Promise((resolve) => {
      if (!owner || !repo || owner === 'local') return resolve(null);
      const safeOwner = encodeURIComponent(owner);
      const safeRepo = encodeURIComponent(repo);
      const req = https.get(`https://github.com/${safeOwner}/${safeRepo}/releases/latest`, {
        headers: { 'User-Agent': 'ias-installer/3.1' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && res.headers.location.includes('/releases/tag/')) {
          const tag = path.basename(res.headers.location);
          resolve({ hasReleases: true, tag });
        } else {
          resolve(null);
        }
      });
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Human Handoff Report Generator (Fixes L75)
   * Produces a clean, report-like guide when an app requires human interference.
   */
  generateHandoffReport(options = {}) {
    const appName = options.repoName || 'Application';
    const prereqs = options.prerequisites || [];
    const completed = options.stepsCompleted || [];
    const actionRequired = options.actionRequired || 'Manual configuration required.';

    const lines = [
      `========================================================================`,
      `⚠️  HUMAN INTERVENTION REQUIRED FOR: ${appName.toUpperCase()}`,
      `========================================================================`,
      ``,
      `The repository was analyzed and partially prepared for your AI agent.`,
      `However, completing execution requires user action on your host machine.`,
      ``,
      `📋 WHAT THE SYSTEM COMPLETED AUTOMATICALLY:`,
      ...completed.map(c => `   ✔ ${c}`),
      ``,
      `🛑 ACTION REQUIRED BY YOU:`,
      `   👉 ${actionRequired}`,
      ``,
      `📌 PREREQUISITES CHECKLIST:`,
      ...prereqs.map(p => `   [ ] ${p}`),
      ``,
      `🔄 HOW TO RESUME:`,
      `   Once completed, tell your AI agent: "I have completed the prerequisites, continue."`,
      `========================================================================`
    ];

    return {
      requiresHumanAction: true,
      appName,
      prerequisites: prereqs,
      stepsCompleted: completed,
      actionRequired,
      formattedReport: lines.join('\n')
    };
  }
}

module.exports = { ReadmeGuide };
