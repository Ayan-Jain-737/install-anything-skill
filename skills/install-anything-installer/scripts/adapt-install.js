#!/usr/bin/env node
/**
 * install-anything-installer: Adapt Script
 * Adapts install commands/scripts for the target OS and harness
 * Handles ALL package managers and install methods automatically
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

class ScriptAdapter {
  constructor(options = {}) {
    this.harness = options.harness || 'auto';
    this.targetOS = options.targetOS || this.detectOS();
    this.dryRun = options.dryRun || false;
  }

  detectOS() {
    const platform = os.platform();
    switch (platform) {
      case 'darwin': return 'macos';
      case 'linux': return 'linux';
      case 'win32': return 'windows';
      default: return 'unix';
    }
  }

  detectHarness() {
    if (this.harness && this.harness !== 'auto') return this.harness;

    // Check explicit env vars
    if (process.env.INSTALL_ANYTHING_CALLER_HARNESS) return process.env.INSTALL_ANYTHING_CALLER_HARNESS;
    if (process.env.INSTALL_ANYTHING_TARGET_HARNESS) return process.env.INSTALL_ANYTHING_TARGET_HARNESS;
    if (process.env.INSTALL_ANYTHING_HARNESS) return process.env.INSTALL_ANYTHING_HARNESS;
    if (process.env.ENLIGHTEN_CALLER_HARNESS) return process.env.ENLIGHTEN_CALLER_HARNESS;
    if (process.env.ENLIGHTEN_TARGET_HARNESS) return process.env.ENLIGHTEN_TARGET_HARNESS;
    if (process.env.ENLIGHTEN_HARNESS) return process.env.ENLIGHTEN_HARNESS;

    // Check Antigravity / Gemini runtime
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

    // Check environment
    if (process.env.HERMES_CONFIG_DIR || process.env.HERMES_AGENT) return 'hermes';
    if (process.env.CLAUDE_HOME || process.env.CLAUDE_CODE_ENTRYPOINT || process.env.CLAUDE_AGENT) return 'claude';
    if (process.env.OPENCODE_CONFIG_DIR || process.env.OPENCODE_HOME) return 'opencode';
    if (process.env.CODEX_HOME || process.env.CODEX_AGENT) return 'codex';
    if (process.env.CURSOR_HOME || process.env.CURSOR_AGENT) return 'cursor';
    if (process.env.ZED_HOME || process.env.ZED_AGENT) return 'zed';

    // Check for presence
    try {
      execSync('command -v hermes', { stdio: 'pipe' });
      return 'hermes';
    } catch {}

    try {
      execSync('claude --version', { stdio: 'pipe' });
      return 'claude';
    } catch {}

    try {
      execSync('opencode --version', { stdio: 'pipe' });
      return 'opencode';
    } catch {}

    try {
      execSync('codex --version', { stdio: 'pipe' });
      return 'codex';
    } catch {}

    return 'unknown';
  }

  /**
   * Get the install commands for a specific install method
   */
  getInstallCommands(installMethod) {
    const managers = {
      npm: {
        install: 'npm install',
        installGlobal: 'npm install -g',
        add: 'npm install',
        dev: 'npm install --save-dev',
        global: 'npm install -g',
        ci: 'npm ci'
      },
      yarn: {
        install: 'yarn install',
        add: 'yarn add',
        dev: 'yarn add --dev',
        global: 'yarn global add',
        ci: 'yarn install --frozen-lockfile'
      },
      pnpm: {
        install: 'pnpm install',
        add: 'pnpm add',
        dev: 'pnpm add -D',
        global: 'pnpm add -g',
        ci: 'pnpm install --frozen-lockfile'
      },
      bun: {
        install: 'bun install',
        add: 'bun add',
        dev: 'bun add -d',
        global: 'bun add -g',
        ci: 'bun install --frozen-lockfile'
      },
      pip: {
        install: 'pip install -r requirements.txt',
        installPackage: 'pip install',
        dev: 'pip install -r requirements-dev.txt',
        installEditable: 'pip install -e .',
        installPackageDev: 'pip install --dev'
      },
      poetry: {
        install: 'poetry install',
        add: 'poetry add',
        dev: 'poetry add --group dev',
        installNoDev: 'poetry install --only=main'
      },
      pipenv: {
        install: 'pipenv install',
        dev: 'pipenv install --dev',
        sync: 'pipenv sync'
      },
      uv: {
        install: 'uv pip install -r requirements.txt',
        add: 'uv pip install',
        sync: 'uv sync',
        installProject: 'uv pip install -e .'
      },
      cargo: {
        install: 'cargo build --release',
        installPackage: 'cargo install',
        installLocal: 'cargo install --path .',
        test: 'cargo test',
        check: 'cargo check'
      },
      go: {
        install: 'go build',
        installPackage: 'go install',
        get: 'go get',
        mod: 'go mod tidy',
        build: 'go build -o bin/app .'
      },
      gradle: {
        install: './gradlew build',
        installBoot: './gradlew bootJar',
        test: './gradlew test',
        build: './gradlew build -x test'
      },
      maven: {
        install: 'mvn clean install -DskipTests',
        package: 'mvn package -DskipTests',
        verify: 'mvn verify',
        compile: 'mvn compile'
      },
      composer: {
        install: 'composer install --no-dev --optimize-autoloader',
        installDev: 'composer install',
        require: 'composer require',
        requireDev: 'composer require --dev',
        dumpAutoload: 'composer dump-autoload -o'
      },
      bundler: {
        install: 'bundle install --without development test',
        installAll: 'bundle install',
        update: 'bundle update'
      },
      dotnet: {
        restore: 'dotnet restore',
        build: 'dotnet build --configuration Release',
        publish: 'dotnet publish -c Release',
        test: 'dotnet test'
      },
      cmake: {
        configure: 'cmake -B build -DCMAKE_BUILD_TYPE=Release',
        build: 'cmake --build build --config Release',
        install: 'cmake --install build'
      },
      make: {
        build: 'make',
        install: 'make install',
        clean: 'make clean'
      }
    };

    // Default to npm if unknown
    return managers[installMethod] || managers.npm;
  }

  getInstallCommand(installMethod, pkgName = null, options = {}) {
    const commands = this.getInstallCommands(installMethod);
    const { isDev = false, isGlobal = false, isLocal = false, pkgNameOpt = options.pkg } = options;

    const pkgNameFinal = pkgName || pkgNameOpt;

    if (['npm', 'yarn', 'pnpm', 'bun'].includes(installMethod)) {
      if (pkgNameFinal) {
        if (isDev) return commands.dev ? `${commands.dev} ${pkgNameFinal}` : `${commands.add} ${pkgNameFinal} --dev`;
        if (isGlobal) return commands.global ? `${commands.global} ${pkgNameFinal}` : `${commands.add} -g ${pkgNameFinal}`;
        return commands.add ? `${commands.add} ${pkgNameFinal}` : `${commands.install} ${pkgNameFinal}`;
      }
      if (isDev) return commands.dev || commands.install;
      if (isGlobal) return commands.global || commands.install;
      return commands.ci || commands.install;
    }

    if (['pip', 'uv'].includes(installMethod)) {
      if (pkgNameFinal) {
        if (isDev) return commands.installDev || `${commands.installPackage} ${pkgNameFinal} --dev`;
        return `${commands.installPackage} ${pkgNameFinal}`;
      }
      return commands.ci || commands.install;
    }

    if (installMethod === 'poetry') {
      if (pkgNameFinal) {
        if (isDev) return `${commands.add} ${pkgNameFinal} --group dev`;
        return `${commands.add} ${pkgNameFinal}`;
      }
      return commands.install;
    }

    if (installMethod === 'pipenv') {
      if (pkgNameFinal) {
        if (isDev) return `${commands.dev} ${pkgNameFinal}`;
        return `${commands.install} ${pkgNameFinal}`;
      }
      return commands.sync || commands.install;
    }

    if (installMethod === 'cargo') {
      if (pkgNameFinal) {
        if (isLocal) return `${commands.installLocal} ${pkgNameFinal}`;
        return `${commands.installPackage} ${pkgNameFinal}`;
      }
      if (isDev) return commands.test || commands.build;
      return commands.build || commands.install;
    }

    if (installMethod === 'go') {
      if (pkgNameFinal) return `${commands.get} ${pkgNameFinal}`;
      return commands.build;
    }

    if (installMethod === 'gradle' || installMethod === 'maven') {
      if (isDev) return commands.test || commands.verify;
      return commands.build || commands.install;
    }

    if (installMethod === 'composer') {
      if (pkgNameFinal) {
        if (isDev) return `${commands.requireDev} ${pkgNameFinal}`;
        return `${commands.require} ${pkgNameFinal}`;
      }
      return commands.install;
    }

    if (installMethod === 'bundler') {
      return isDev ? commands.installAll : commands.install;
    }

    if (installMethod === 'dotnet') {
      if (pkgNameFinal) return `${commands.build} ${pkgNameFinal}`;
      return isDev ? commands.test : commands.build;
    }

    if (installMethod === 'cmake') {
      return commands.build;
    }

    if (installMethod === 'make') {
      return commands.build;
    }

    // Default fallback
    return commands.install || 'make';
  }

  detectOS() {
    const platform = os.platform();
    switch (platform) {
      case 'darwin': return 'macos';
      case 'linux': return 'linux';
      case 'win32': return 'windows';
      default: return 'unix';
    }
  }

  detectHarness() {
    if (this.harness && this.harness !== 'auto') return this.harness;

    // Check explicit env vars
    if (process.env.INSTALL_ANYTHING_CALLER_HARNESS) return process.env.INSTALL_ANYTHING_CALLER_HARNESS;
    if (process.env.INSTALL_ANYTHING_TARGET_HARNESS) return process.env.INSTALL_ANYTHING_TARGET_HARNESS;
    if (process.env.INSTALL_ANYTHING_HARNESS) return process.env.INSTALL_ANYTHING_HARNESS;
    if (process.env.ENLIGHTEN_CALLER_HARNESS) return process.env.ENLIGHTEN_CALLER_HARNESS;
    if (process.env.ENLIGHTEN_TARGET_HARNESS) return process.env.ENLIGHTEN_TARGET_HARNESS;
    if (process.env.ENLIGHTEN_HARNESS) return process.env.ENLIGHTEN_HARNESS;

    // Check Antigravity / Gemini runtime
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

    // Check environment
    if (process.env.HERMES_CONFIG_DIR || process.env.HERMES_AGENT) return 'hermes';
    if (process.env.CLAUDE_HOME || process.env.CLAUDE_CODE_ENTRYPOINT || process.env.CLAUDE_AGENT) return 'claude';
    if (process.env.OPENCODE_CONFIG_DIR || process.env.OPENCODE_HOME) return 'opencode';
    if (process.env.CODEX_HOME || process.env.CODEX_AGENT) return 'codex';
    if (process.env.CURSOR_HOME || process.env.CURSOR_AGENT) return 'cursor';
    if (process.env.ZED_HOME || process.env.ZED_AGENT) return 'zed';

    // Check for presence
    try {
      execSync('command -v hermes', { stdio: 'pipe' });
      return 'hermes';
    } catch {}

    try {
      execSync('claude --version', { stdio: 'pipe' });
      return 'claude';
    } catch {}

    try {
      execSync('opencode --version', { stdio: 'pipe' });
      return 'opencode';
    } catch {}

    try {
      execSync('codex --version', { stdio: 'pipe' });
      return 'codex';
    } catch {}

    return 'unknown';
  }

  adaptInstallCommand(diagnostics, harness) {
    // installMethod can be at diagnostics.installMethod or diagnostics.detected.installMethod
    const installMethod = diagnostics.installMethod || (diagnostics.detected && diagnostics.detected.installMethod) || 'npm';
    const harnessType = harness || this.detectHarness();
    
    const adapted = {
      original: diagnostics.installCommand || 'auto',
      adapted: '',
      harness_specific: false,
      os_adaptations: [],
      installMethod: installMethod,
      commands: []
    };

    // Get the install commands based on method and harness
    const installCommands = this.getInstallCommands(installMethod);
    const installCmd = this.getInstallCommand(installMethod);

    // Build the command sequence
    const commands = [];

    // Pre-install steps
    if (['npm', 'yarn', 'pnpm', 'bun'].includes(installMethod)) {
      commands.push(installCommands.ci || installCommands.install);
    } else if (['pip', 'uv'].includes(installMethod)) {
      commands.push(installCommands.ci || installCommands.install);
    } else if (installMethod === 'poetry') {
      commands.push(installCommands.install);
    } else if (installMethod === 'cargo') {
      commands.push(installCommands.build || installCommands.install);
    } else if (installMethod === 'go') {
      commands.push(installCommands.build || installCommands.install);
    } else if (['gradle', 'maven'].includes(installMethod)) {
      commands.push(installCommands.install);
    } else if (installMethod === 'dotnet') {
      commands.push(installCommands.restore || installCommands.build);
    }

    // Add harness-specific steps
    const managers = {
      gemini: {
        skillInstall: 'install-anything install',
        skillRemove: 'install-anything uninstall',
        skillUpdate: 'install-anything install --force'
      },
      hermes: {
        skillInstall: 'npx ecc plugin add',
        skillRemove: 'npx ecc plugin remove',
        skillUpdate: 'npx ecc update'
      },
      claude: {
        skillInstall: '/plugin marketplace add',
        skillRemove: '/plugin remove',
        skillUpdate: 'claude plugin update'
      },
      opencode: {
        skillInstall: 'opencode --install',
        skillRemove: 'opencode --uninstall',
        skillUpdate: 'opencode --update'
      },
      codex: {
        skillInstall: 'codex plugin add',
        skillRemove: 'codex plugin remove',
        skillUpdate: 'codex plugin update'
      }
    };

    const manager = managers[harnessType] || managers.hermes;

    adapted.adapted = commands.join(' && ');
    adapted.commands = commands;
    adapted.installMethod = installMethod;
    adapted.harness = harnessType;
    adapted.harnessManager = manager;
    adapted.harness_specific = true;

    // Add OS-specific adaptations
    if (this.targetOS === 'windows' && !adapted.adapted.startsWith('pwsh') && !adapted.adapted.startsWith('npm')) {
      adapted.os_adaptations.push('Convert to PowerShell or use npm/yarn');
    }

    return adapted;
  }

  adaptShellScript(command) {
    if (this.targetOS === 'windows') {
      return command.replace('./install.sh', '.\\install.ps1');
    }
    return command;
  }

  generateUninstallScript(identifier) {
    const harness = this.detectHarness();
    const uninstallSteps = [];

    switch (harness) {
      case 'hermes':
        uninstallSteps.push(`npx ecc plugin remove ${identifier}`);
        uninstallSteps.push(`rm -rf ~/.hermes/plugins/${identifier}`);
        uninstallSteps.push(`sed -i '/${identifier}/d' ~/.hermes/profiles/*/profile.json 2>/dev/null || true`);
        break;
      case 'claude':
        uninstallSteps.push(`/plugin remove ${identifier}`);
        uninstallSteps.push(`rm -rf ~/.claude/plugins/${identifier}`);
        break;
      case 'opencode':
        uninstallSteps.push(`opencode --uninstall ${identifier}`);
        uninstallSteps.push(`rm -rf ~/.config/opencode/plugins/${identifier}`);
        break;
      case 'codex':
        uninstallSteps.push(`codex plugin remove ${identifier}`);
        uninstallSteps.push(`rm -rf ~/.codex/plugins/${identifier}`);
        break;
      default:
        uninstallSteps.push(`# Manual uninstall for ${harness}: remove plugin and config`);
    }

    return {
      identifier: identifier,
      harness: harness,
      steps: uninstallSteps,
      cleanup_files: [
        `~/.hermes/cache/${identifier}`,
        `~/.hermes/logs/${identifier}.log`,
        `~/.claude/plugins/${identifier}`,
        `~/.config/opencode/plugins/${identifier}`,
        `~/.codex/plugins/${identifier}`
      ]
    };
  }

  /**
   * Deterministic OS and Arch regex matcher (eget heuristics)
   */
  matchReleaseAsset(assetList, targetEnv = {}) {
    if (!Array.isArray(assetList) || assetList.length === 0) return null;

    let targetOS = targetEnv.os || this.targetOS || 'linux';
    if (targetOS === 'macos') targetOS = 'darwin';
    let targetArch = targetEnv.arch || os.arch();
    if (targetArch === 'x86_64') targetArch = 'x64';

    const OS_PATTERNS = {
      darwin: /(darwin|mac.?os|osx|apple)/i,
      linux: /(linux|unknown-linux)/i,
      windows: /(win|windows)/i
    };

    const ARCH_PATTERNS = {
      x64: /(x64|amd64|x86[-_]?64)/i,
      arm64: /(arm64|aarch64|armv8)/i,
      x86: /(x32|x86[-_]?32|i?386)/i
    };

    const osRegex = OS_PATTERNS[targetOS] || OS_PATTERNS.linux;
    const archRegex = ARCH_PATTERNS[targetArch] || ARCH_PATTERNS.x64;

    const excludedExts = /\.(deb|rpm|msi|sha256|sha512|asc|sig|txt|md|html)$/i;

    const candidates = assetList.filter(a => {
      const name = a.name || a.browser_download_url || '';
      if (!name || excludedExts.test(name)) return false;
      return osRegex.test(name) && archRegex.test(name);
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Priority scoring:
    // 1. Prefer archives (.tar.gz, .tgz, .zip, .tar.xz)
    // 2. On Linux, prefer musl over gnu
    // 3. Shorter filename often means cleaner target
    candidates.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';

      let scoreA = 0;
      let scoreB = 0;

      if (/\.(tar\.gz|tgz)$/i.test(nameA)) scoreA += 10;
      if (/\.(tar\.gz|tgz)$/i.test(nameB)) scoreB += 10;
      if (/\.zip$/i.test(nameA)) scoreA += 8;
      if (/\.zip$/i.test(nameB)) scoreB += 8;

      if (targetOS === 'linux') {
        if (/musl/i.test(nameA)) scoreA += 5;
        if (/musl/i.test(nameB)) scoreB += 5;
      }

      if (scoreA !== scoreB) return scoreB - scoreA;
      return nameA.length - nameB.length;
    });

    return candidates[0];
  }

  /**
   * Matches skill names against a glob pattern (e.g. "react-*", "tdd*")
   */
  matchesSkillFilter(skillName, filterPattern) {
    if (!filterPattern || filterPattern === '*' || filterPattern === 'all') return true;
    if (!skillName) return false;

    const cleanFilter = filterPattern.trim();
    if (cleanFilter.includes(',')) {
      const patterns = cleanFilter.split(',').map(p => p.trim());
      return patterns.some(p => this.matchesSkillFilter(skillName, p));
    }

    const regexStr = '^' + cleanFilter.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr, 'i');
    return regex.test(skillName);
  }

  /**
   * Helper to download a remote URL directly to a file following HTTP 3xx redirects
   */
  downloadToFile(url, destPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
      const client = url.startsWith('https:') ? https : http;
      const headers = {
        'User-Agent': 'ias-installer/3.1 (+https://github.com/Ayan-Jain-737/install-anything-skill)'
      };
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (token && (url.includes('api.github.com') || url.includes('github.com'))) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = client.get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return resolve(this.downloadToFile(redirectUrl, destPath, maxRedirects - 1));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        }
        const out = fs.createWriteStream(destPath);
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve(destPath)));
        out.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Fetches latest release tag and downloadable asset list without hitting GitHub API rate limits.
   * Probes /releases/latest redirect + expanded_assets/<tag> HTML, falling back to GitHub API.
   */
  async fetchReleaseAssets(owner, repo) {
    // 1. If GitHub token is present, try direct API first
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) {
      try {
        const apiRes = await new Promise((resolve) => {
          https.get(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
            headers: {
              'User-Agent': 'ias-installer/3.1',
              'Authorization': `Bearer ${token}`
            }
          }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  const json = JSON.parse(data);
                  resolve({
                    tag: json.tag_name,
                    assets: (json.assets || []).map(a => ({
                      name: a.name,
                      browser_download_url: a.browser_download_url
                    }))
                  });
                } catch { resolve(null); }
              } else { resolve(null); }
            });
          }).on('error', () => resolve(null));
        });
        if (apiRes && apiRes.assets && apiRes.assets.length > 0) return apiRes;
      } catch {}
    }

    // 2. Unauthenticated zero-rate-limit probe: follow /releases/latest redirect to extract tag
    const tag = await new Promise((resolve) => {
      https.get(`https://github.com/${owner}/${repo}/releases/latest`, {
        headers: { 'User-Agent': 'ias-installer/3.1' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const m = res.headers.location.match(/\/releases\/tag\/(.+)$/);
          resolve(m ? decodeURIComponent(m[1]) : null);
        } else {
          resolve(null);
        }
      }).on('error', () => resolve(null));
    });

    if (tag) {
      // 3. Probe expanded_assets/<tag> HTML
      const assets = await new Promise((resolve) => {
        https.get(`https://github.com/${owner}/${repo}/releases/expanded_assets/${encodeURIComponent(tag)}`, {
          headers: { 'User-Agent': 'ias-installer/3.1' }
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            const regex = new RegExp(`href="(/${owner}/${repo}/releases/download/[^"]+)"`, 'g');
            const list = [];
            const seen = new Set();
            let m;
            while ((m = regex.exec(data)) !== null) {
              const fullUrl = `https://github.com${m[1]}`;
              const name = path.basename(m[1]);
              if (!name.endsWith('.sha256') && !name.endsWith('.md5') && !seen.has(name)) {
                seen.add(name);
                list.push({ name, browser_download_url: fullUrl });
              }
            }
            resolve(list);
          });
        }).on('error', () => resolve([]));
      });

      if (assets.length > 0) {
        return { tag, assets };
      }
    }

    // 4. Fallback: try unauthenticated API as last resort
    try {
      const apiRes = await new Promise((resolve) => {
        https.get(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
          headers: { 'User-Agent': 'ias-installer/3.1' }
        }, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const json = JSON.parse(data);
                resolve({
                  tag: json.tag_name,
                  assets: (json.assets || []).map(a => ({
                    name: a.name,
                    browser_download_url: a.browser_download_url
                  }))
                });
              } catch { resolve(null); }
            } else { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });
      if (apiRes) return apiRes;
    } catch {}

    return null;
  }

  /**
   * Downloads a release binary for the current platform and installs to ~/.local/bin/
   */
  async downloadReleaseBinary(repoUrl, options = {}) {
    const clean = repoUrl.trim();
    const match = clean.match(/github\.com[/:]([^/]+)\/([^/.]+)/i) || clean.match(/^([^/]+)\/([^/.]+)$/);
    if (!match) return { status: 'error', message: 'Invalid repository identifier' };

    const owner = match[1];
    const repo = match[2];
    const binDir = options.binDir || path.join(os.homedir(), '.local', 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const releaseInfo = await this.fetchReleaseAssets(owner, repo);
    if (!releaseInfo || !releaseInfo.assets || releaseInfo.assets.length === 0) {
      return { status: 'not_found', message: `No releases or assets found for ${owner}/${repo}` };
    }

    const targetOS = options.os || (os.platform() === 'darwin' ? 'darwin' : (os.platform() === 'win32' ? 'windows' : 'linux'));
    const targetArch = options.arch || os.arch();
    const matched = this.matchReleaseAsset(releaseInfo.assets, { os: targetOS, arch: targetArch });

    if (!matched) {
      return { status: 'unsupported', message: `No matching release asset for ${targetOS}-${targetArch}` };
    }

    const tmpDir = path.join(os.tmpdir(), `ias-download-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const assetFile = path.join(tmpDir, matched.name);
      await this.downloadToFile(matched.browser_download_url, assetFile);

      const extractDir = path.join(tmpDir, 'extracted');
      fs.mkdirSync(extractDir, { recursive: true });

      if (/\.(tar\.gz|tgz|tar\.xz)$/i.test(matched.name)) {
        execSync(`tar -xf "${assetFile}" -C "${extractDir}"`, { stdio: 'pipe' });
      } else if (/\.zip$/i.test(matched.name)) {
        execSync(`unzip -q -o "${assetFile}" -d "${extractDir}"`, { stdio: 'pipe' });
      } else {
        // Raw executable
        const targetBin = path.join(binDir, repo);
        fs.copyFileSync(assetFile, targetBin);
        fs.chmodSync(targetBin, 0o755);
        return {
          status: 'success',
          binaryPath: targetBin,
          binaryName: repo,
          version: releaseInfo.tag,
          assetName: matched.name
        };
      }

      // Search extracted directory for executable matching repo name or any executable
      const findExecutable = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = findExecutable(fullPath);
            if (found) return found;
          } else if (entry.isFile()) {
            if (entry.name === repo || entry.name === repo.toLowerCase() || entry.name.startsWith(repo)) {
              return fullPath;
            }
          }
        }
        // Fallback: first non-document file
        for (const entry of entries) {
          if (entry.isFile() && !/\.(txt|md|sha256|json|pdf|png)$/i.test(entry.name)) {
            return path.join(dir, entry.name);
          }
        }
        return null;
      };

      const foundBin = findExecutable(extractDir);
      if (!foundBin) {
        return { status: 'error', message: 'Could not find executable in archive' };
      }

      const binaryName = path.basename(foundBin);
      const targetBin = path.join(binDir, binaryName);
      fs.copyFileSync(foundBin, targetBin);
      fs.chmodSync(targetBin, 0o755);

      return {
        status: 'success',
        binaryPath: targetBin,
        binaryName,
        version: releaseInfo.tag,
        assetName: matched.name
      };
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  /**
   * Stream and unpack repository archive tarball without git clone (L160: minimize clones)
   */
  async downloadTarball(repoUrl, destDir, options = {}) {
    const clean = repoUrl.trim();
    const match = clean.match(/github\.com[/:]([^/]+)\/([^/.]+)/i) || clean.match(/^([^/]+)\/([^/.]+)$/);
    if (!match) return { success: false, error: 'Invalid repo URL' };

    const owner = match[1];
    const repo = match[2];
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const tmpTar = path.join(os.tmpdir(), `ias-tar-${Date.now()}.tar.gz`);
    const tarballUrls = [
      `https://github.com/${owner}/${repo}/archive/HEAD.tar.gz`,
      `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/main`,
      `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/master`
    ];

    let downloaded = false;
    for (const url of tarballUrls) {
      try {
        await this.downloadToFile(url, tmpTar);
        downloaded = true;
        break;
      } catch {}
    }

    if (!downloaded) {
      return { success: false, error: 'Could not download tarball from GitHub' };
    }

    try {
      execSync(`tar -xzf "${tmpTar}" --strip-components=1 -C "${destDir}"`, { stdio: 'pipe' });
      return { success: true, destDir };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      try { fs.unlinkSync(tmpTar); } catch {}
    }
  }

  adapt(diagnostics) {
    return {
      status: 'adapted',
      original_repo: diagnostics.repository,
      detected: diagnostics.detected,
      profile: diagnostics.profile,
      adapted_install: this.adaptInstallCommand(diagnostics, diagnostics.harness),
      os: this.targetOS,
      harness: this.detectHarness(),
      dry_run: this.dryRun
    };
  }
}

// CLI
if (require.main === module) {
  const action = process.argv[2];
  const identifier = process.argv[3];

  if (!action || !identifier) {
    console.error(JSON.stringify({
      error: 'Usage: adapt-install.js <adapt|uninstall> <identifier>'
    }));
    process.exit(1);
  }

  const adapter = new ScriptAdapter();

  if (action === 'adapt') {
    const mockDiagnostics = {
      repository: identifier,
      detected: { language: 'typescript', framework: 'next', installMethod: 'npm' },
      profile: { recommended: 'web-developer' }
    };
    const result = adapter.adapt(mockDiagnostics);
    console.log(JSON.stringify(result, null, 2));
  } else if (action === 'uninstall') {
    const result = adapter.generateUninstallScript(identifier);
    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = { ScriptAdapter };