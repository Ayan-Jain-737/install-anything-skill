#!/usr/bin/env node
/**
 * test-e2e-matrix.js
 * Multi-Harness Integration & End-to-End Verifier for install-anything-skill (ias)
 *
 * Verifies:
 *  1. `ias inspect` with real repos (anil-matcha/open-generative-ai, BurntSushi/ripgrep, vercel-labs/agent-skills)
 *  2. `ias install` with `--scope local` in isolated directory without touching user's real ~/.agents or ~/.gemini
 *  3. `ias install` with `--skills "pattern*"` glob filter on mock multi-skill repo
 *  4. Environment variable simulation for different agent harnesses:
 *     - CLAUDE_HOME -> Claude Code
 *     - HERMES_CONFIG_DIR -> Hermes
 *     - ANTIGRAVITY_AGENT=true / GEMINI_HOME -> Antigravity / Gemini
 *  5. `ias uninstall` cleanly removes skills and unregisters from lockfile
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { spawnSync } = require('child_process');

const IAS_BIN = path.resolve(__dirname, '../bin/ias');

function runIas(args, options = {}) {
  const result = spawnSync(process.execPath, [IAS_BIN, ...args], {
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
    encoding: 'utf8',
    timeout: options.timeout || 60000
  });

  let json = null;
  if (result.stdout) {
    try {
      json = JSON.parse(result.stdout.trim());
    } catch {
      // Find JSON block if extra logging was printed
      const match = result.stdout.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try { json = JSON.parse(match[1]); } catch {}
      }
    }
  }

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json
  };
}

function cleanEnvBase() {
  const base = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (
      !k.startsWith('ANTIGRAVITY') &&
      !k.startsWith('GEMINI') &&
      !k.startsWith('AGY') &&
      !k.startsWith('CLAUDE') &&
      !k.startsWith('HERMES') &&
      !k.startsWith('OPENCODE') &&
      !k.startsWith('CODEX') &&
      !k.startsWith('CURSOR') &&
      !k.startsWith('ZED')
    ) {
      base[k] = v;
    }
  }
  return base;
}

(async () => {
  console.log('Testing Multi-Harness Integration & E2E Verification Matrix');
  console.log('='.repeat(65) + '\n');

  // =========================================================================
  // Section 1: Real Repository Inspection (ias inspect)
  // =========================================================================
  console.log('--- Section 1: Real Repository Inspection (ias inspect) ---');

  console.log('1.1: Inspecting anil-matcha/open-generative-ai (Fullstack web-app)...');
  const inspectWebApp = runIas(['inspect', 'anil-matcha/open-generative-ai', '--json']);
  assert.strictEqual(inspectWebApp.status, 0, `Exit code should be 0, got ${inspectWebApp.status}: ${inspectWebApp.stderr}`);
  assert(inspectWebApp.json, 'Should produce valid JSON');
  assert.strictEqual(inspectWebApp.json.archetype, 'web-app', 'Archetype should be web-app');
  assert.strictEqual(inspectWebApp.json.requiresClone, false, 'Should be zero-clone');
  assert.strictEqual(inspectWebApp.json.hasDocker, true, 'Should detect Docker support');
  console.log('✅ 1.1 passed: anil-matcha/open-generative-ai inspected correctly');

  console.log('1.2: Inspecting BurntSushi/ripgrep (CLI binary)...');
  const inspectBinary = runIas(['inspect', 'BurntSushi/ripgrep', '--json']);
  assert.strictEqual(inspectBinary.status, 0, `Exit code should be 0, got ${inspectBinary.status}: ${inspectBinary.stderr}`);
  assert(inspectBinary.json, 'Should produce valid JSON');
  assert.strictEqual(inspectBinary.json.archetype, 'cli-binary', 'Archetype should be cli-binary');
  assert.strictEqual(inspectBinary.json.requiresClone, false, 'Should be zero-clone');
  assert(Array.isArray(inspectBinary.json.binaries) && inspectBinary.json.binaries.includes('ripgrep'), 'Should list ripgrep binary');
  console.log('✅ 1.2 passed: BurntSushi/ripgrep inspected correctly');

  console.log('1.3: Inspecting vercel-labs/agent-skills (Prompt Skill Pack)...');
  const inspectSkillPack = runIas(['inspect', 'vercel-labs/agent-skills', '--json']);
  assert.strictEqual(inspectSkillPack.status, 0, `Exit code should be 0, got ${inspectSkillPack.status}: ${inspectSkillPack.stderr}`);
  assert(inspectSkillPack.json, 'Should produce valid JSON');
  assert.strictEqual(inspectSkillPack.json.archetype, 'skill-pack', 'Archetype should be skill-pack');
  assert.strictEqual(inspectSkillPack.json.hasSkills, true, 'Should detect hasSkills=true');
  assert.strictEqual(inspectSkillPack.json.requiresClone, false, 'Should be zero-clone');
  console.log('✅ 1.3 passed: vercel-labs/agent-skills inspected correctly\n');

  // =========================================================================
  // Section 2: Isolated Project-Local Install (--scope local)
  // =========================================================================
  console.log('--- Section 2: Project-Local Install (--scope local) & User Safety ---');

  const isolatedWorkspace = path.join(os.tmpdir(), `ias-e2e-local-${Date.now()}`);
  const mockLocalRepo = path.join(os.tmpdir(), `ias-e2e-repo-${Date.now()}`);
  fs.mkdirSync(isolatedWorkspace, { recursive: true });
  fs.mkdirSync(path.join(mockLocalRepo, 'skills', 'local-widget-tool'), { recursive: true });
  fs.writeFileSync(path.join(mockLocalRepo, 'README.md'), '# Local Widget Tool\nOperational documentation.');
  fs.writeFileSync(path.join(mockLocalRepo, 'skills', 'local-widget-tool', 'SKILL.md'), `---
name: local-widget-tool
description: A tool for local workspace automation
version: 1.0.0
---
# Local Widget Tool
Instructions for agent operations.`);

  // Record baseline state of real ~/.agents/skills and ~/.gemini/skills
  const realHome = os.homedir();
  const realAgentsSkillsDir = path.join(realHome, '.agents', 'skills');
  const realGeminiSkillsDir = path.join(realHome, '.gemini', 'skills');
  const realAgentsHadWidget = fs.existsSync(path.join(realAgentsSkillsDir, 'local-widget-tool'));
  const realGeminiHadWidget = fs.existsSync(path.join(realGeminiSkillsDir, 'local-widget-tool'));

  console.log('2.1: Running `ias install <mockRepo> --scope local` inside isolated directory...');
  // Force targetHarness=gemini to verify .gemini creation in local project
  const localInstallRes = runIas(['install', mockLocalRepo, '--scope', 'local', '--agent', 'gemini', '--json'], {
    cwd: isolatedWorkspace
  });

  assert.strictEqual(localInstallRes.status, 0, `Local install failed: ${localInstallRes.stderr}`);
  assert(localInstallRes.json, 'Install should output JSON');
  assert.strictEqual(localInstallRes.json.status, 'success', 'Install status should be success');

  // Verify local creation
  const localAgentsSkill = path.join(isolatedWorkspace, '.agents', 'skills', 'local-widget-tool', 'SKILL.md');
  const localGeminiSkill = path.join(isolatedWorkspace, '.gemini', 'skills', 'local-widget-tool', 'SKILL.md');
  const localLockfile = path.join(isolatedWorkspace, '.skill-lock.json');

  assert(fs.existsSync(localAgentsSkill), `Expected ./ .agents/skills/local-widget-tool/SKILL.md to exist in ${isolatedWorkspace}`);
  assert(fs.existsSync(localGeminiSkill), `Expected ./ .gemini/skills/local-widget-tool/SKILL.md to exist in ${isolatedWorkspace}`);
  assert(fs.existsSync(localLockfile), `Expected .skill-lock.json to exist in local workspace`);

  const lockContent = JSON.parse(fs.readFileSync(localLockfile, 'utf8'));
  assert(lockContent.skills['local-widget-tool'], 'Lockfile should record local-widget-tool');

  // Verify user safety: real ~/.agents and ~/.gemini must NOT have been modified
  const realAgentsNow = fs.existsSync(path.join(realAgentsSkillsDir, 'local-widget-tool'));
  const realGeminiNow = fs.existsSync(path.join(realGeminiSkillsDir, 'local-widget-tool'));
  assert.strictEqual(realAgentsNow, realAgentsHadWidget, 'User real ~/.agents/skills must NOT be modified by local install');
  assert.strictEqual(realGeminiNow, realGeminiHadWidget, 'User real ~/.gemini/skills must NOT be modified by local install');
  console.log('✅ 2.1 passed: Local workspace received skills and real ~/.agents & ~/.gemini remained untouched\n');

  // =========================================================================
  // Section 3: Skill Glob Filtering (--skills "pattern*")
  // =========================================================================
  console.log('--- Section 3: Selective Skill Extraction with Glob Filtering ---');

  const mockMultiRepo = path.join(os.tmpdir(), `ias-e2e-multi-${Date.now()}`);
  const multiWorkspace = path.join(os.tmpdir(), `ias-e2e-multi-work-${Date.now()}`);
  fs.mkdirSync(multiWorkspace, { recursive: true });

  const skillNames = ['react-patterns', 'react-hooks', 'vue-components', 'vue-router', 'django-orm'];
  for (const s of skillNames) {
    const sDir = path.join(mockMultiRepo, 'skills', s);
    fs.mkdirSync(sDir, { recursive: true });
    fs.writeFileSync(path.join(sDir, 'SKILL.md'), `---
name: ${s}
description: Skill for ${s}
---
# ${s}`);
  }
  fs.writeFileSync(path.join(mockMultiRepo, 'README.md'), '# Multi-Skill Repository\nCollection of agent skills.');

  console.log('3.1: Installing with `--skills "react-*"` glob filter...');
  const globInstallRes = runIas(['install', mockMultiRepo, '--skills', 'react-*', '--scope', 'local', '--agent', 'gemini', '--json'], {
    cwd: multiWorkspace
  });

  assert.strictEqual(globInstallRes.status, 0, `Glob install failed: ${globInstallRes.stderr}`);
  assert(globInstallRes.json, 'Install should output JSON');
  assert.strictEqual(globInstallRes.json.status, 'success');

  const registeredNames = globInstallRes.json.skills_registered.map(s => s.name);
  assert(registeredNames.includes('react-patterns'), 'Should include react-patterns');
  assert(registeredNames.includes('react-hooks'), 'Should include react-hooks');
  assert(!registeredNames.includes('vue-components'), 'Should NOT include vue-components');
  assert(!registeredNames.includes('vue-router'), 'Should NOT include vue-router');
  assert(!registeredNames.includes('django-orm'), 'Should NOT include django-orm');

  // Verify on disk in local workspace
  assert(fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'react-patterns')), 'react-patterns should exist in .agents');
  assert(fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'react-hooks')), 'react-hooks should exist in .agents');
  assert(!fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'vue-components')), 'vue-components must NOT exist in .agents');
  assert(!fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'vue-router')), 'vue-router must NOT exist in .agents');
  assert(!fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'django-orm')), 'django-orm must NOT exist in .agents');

  // Verify in lockfile
  const multiLock = JSON.parse(fs.readFileSync(path.join(multiWorkspace, '.skill-lock.json'), 'utf8'));
  assert(multiLock.skills['react-patterns'], 'Lockfile must have react-patterns');
  assert(multiLock.skills['react-hooks'], 'Lockfile must have react-hooks');
  assert(!multiLock.skills['vue-components'], 'Lockfile must NOT have vue-components');
  console.log('✅ 3.1 passed: Glob pattern "react-*" registered only matching skills\n');

  // =========================================================================
  // Section 4: Environment Variable Simulation Across Harnesses
  // =========================================================================
  console.log('--- Section 4: Multi-Harness Environment Variable Simulations ---');

  const mockHarnessRepo = path.join(os.tmpdir(), `ias-e2e-harness-repo-${Date.now()}`);
  fs.mkdirSync(path.join(mockHarnessRepo, 'skills', 'universal-tool'), { recursive: true });
  fs.writeFileSync(path.join(mockHarnessRepo, 'README.md'), '# Universal Tool');
  fs.writeFileSync(path.join(mockHarnessRepo, 'skills', 'universal-tool', 'SKILL.md'), `---
name: universal-tool
description: A tool designed for cross-harness use
---
# Universal Tool`);

  // 4.1 Claude Code simulation (CLAUDE_HOME)
  console.log('4.1: Simulating Claude Code (CLAUDE_HOME)...');
  const testClaudeHome = path.join(os.tmpdir(), `ias-e2e-claude-${Date.now()}`);
  const testIasHomeClaude = path.join(os.tmpdir(), `ias-e2e-iashome-claude-${Date.now()}`);

  const claudeEnv = cleanEnvBase();
  claudeEnv.CLAUDE_HOME = testClaudeHome;
  claudeEnv.INSTALL_ANYTHING_HOME = testIasHomeClaude;

  const claudeRes = runIas(['install', mockHarnessRepo, '--json'], { env: claudeEnv });
  assert.strictEqual(claudeRes.status, 0, `Claude install failed: ${claudeRes.stderr}`);
  assert(claudeRes.json && claudeRes.json.status === 'success');

  const claudeSkillsRegistered = claudeRes.json.skills_registered[0].registeredHarnesses;
  assert(claudeSkillsRegistered.includes('Claude Code'), 'Registration should include Claude Code');
  assert(fs.existsSync(path.join(testClaudeHome, 'skills', 'universal-tool', 'SKILL.md')), 'Skill must exist in CLAUDE_HOME/skills');
  assert(fs.existsSync(path.join(testIasHomeClaude, '.agents', 'skills', 'universal-tool', 'SKILL.md')), 'Skill must exist in global .agents/skills');
  assert(!fs.existsSync(path.join(testIasHomeClaude, '.gemini')), 'Should NOT create .gemini when targeting Claude');
  assert(!fs.existsSync(path.join(testIasHomeClaude, '.hermes')), 'Should NOT create .hermes when targeting Claude');
  console.log('✅ 4.1 passed: CLAUDE_HOME accurately detected Claude Code harness');

  // 4.2 Hermes simulation (HERMES_CONFIG_DIR)
  console.log('4.2: Simulating Hermes (HERMES_CONFIG_DIR)...');
  const testHermesDir = path.join(os.tmpdir(), `ias-e2e-hermes-${Date.now()}`);
  const testIasHomeHermes = path.join(os.tmpdir(), `ias-e2e-iashome-hermes-${Date.now()}`);

  const hermesEnv = cleanEnvBase();
  hermesEnv.HERMES_CONFIG_DIR = testHermesDir;
  hermesEnv.INSTALL_ANYTHING_HOME = testIasHomeHermes;

  const hermesRes = runIas(['install', mockHarnessRepo, '--json'], { env: hermesEnv });
  assert.strictEqual(hermesRes.status, 0, `Hermes install failed: ${hermesRes.stderr}`);
  assert(hermesRes.json && hermesRes.json.status === 'success');

  const hermesSkillsRegistered = hermesRes.json.skills_registered[0].registeredHarnesses;
  assert(hermesSkillsRegistered.includes('Hermes'), 'Registration should include Hermes');
  assert(fs.existsSync(path.join(testHermesDir, 'skills', 'universal-tool', 'SKILL.md')), 'Skill must exist in HERMES_CONFIG_DIR/skills');
  assert(fs.existsSync(path.join(testIasHomeHermes, '.agents', 'skills', 'universal-tool', 'SKILL.md')), 'Skill must exist in global .agents/skills');
  assert(!fs.existsSync(path.join(testIasHomeHermes, '.claude')), 'Should NOT create .claude when targeting Hermes');
  assert(!fs.existsSync(path.join(testIasHomeHermes, '.gemini')), 'Should NOT create .gemini when targeting Hermes');
  console.log('✅ 4.2 passed: HERMES_CONFIG_DIR accurately detected Hermes harness');

  // 4.3 Antigravity / Gemini simulation (ANTIGRAVITY_AGENT=true and GEMINI_HOME)
  console.log('4.3: Simulating Antigravity / Gemini (ANTIGRAVITY_AGENT=true / GEMINI_HOME)...');
  const testGeminiHome = path.join(os.tmpdir(), `ias-e2e-gemini-${Date.now()}`);
  const testIasHomeGemini = path.join(os.tmpdir(), `ias-e2e-iashome-gemini-${Date.now()}`);

  const geminiEnv = cleanEnvBase();
  geminiEnv.GEMINI_HOME = testGeminiHome;
  geminiEnv.ANTIGRAVITY_AGENT = 'true';
  geminiEnv.INSTALL_ANYTHING_HOME = testIasHomeGemini;

  const geminiRes = runIas(['install', mockHarnessRepo, '--json'], { env: geminiEnv });
  assert.strictEqual(geminiRes.status, 0, `Gemini install failed: ${geminiRes.stderr}`);
  assert(geminiRes.json && geminiRes.json.status === 'success');

  const geminiSkillsRegistered = geminiRes.json.skills_registered[0].registeredHarnesses;
  assert(geminiSkillsRegistered.includes('Antigravity / Gemini'), 'Registration should include Antigravity / Gemini');
  assert(fs.existsSync(path.join(testGeminiHome, 'skills', 'universal-tool', 'SKILL.md')), 'Skill must exist in GEMINI_HOME/skills');
  assert(fs.existsSync(path.join(testIasHomeGemini, '.agents', 'skills', 'universal-tool', 'SKILL.md')), 'Skill must exist in global .agents/skills');
  assert(!fs.existsSync(path.join(testIasHomeGemini, '.claude')), 'Should NOT create .claude when targeting Gemini');
  assert(!fs.existsSync(path.join(testIasHomeGemini, '.hermes')), 'Should NOT create .hermes when targeting Gemini');
  console.log('✅ 4.3 passed: ANTIGRAVITY_AGENT / GEMINI_HOME accurately detected Antigravity/Gemini harness\n');

  // =========================================================================
  // Section 5: Uninstallation Cleanliness (ias uninstall)
  // =========================================================================
  console.log('--- Section 5: Uninstallation Cleanliness & Lockfile Sync ---');

  console.log('5.1: Uninstalling a local skill by skill name (`ias uninstall local-widget-tool --scope local`)...');
  const uninstLocalSkill = runIas(['uninstall', 'local-widget-tool', '--scope', 'local', '--force', '--json'], {
    cwd: isolatedWorkspace
  });
  assert.strictEqual(uninstLocalSkill.status, 0, `Uninstall failed: ${uninstLocalSkill.stderr}`);
  assert(uninstLocalSkill.json && uninstLocalSkill.json.status === 'success');

  // Verify removed from local harnesses
  assert(!fs.existsSync(localAgentsSkill), 'Skill should be removed from local .agents');
  assert(!fs.existsSync(localGeminiSkill), 'Skill should be removed from local .gemini');

  // Verify removed from lockfile
  const updatedLock = JSON.parse(fs.readFileSync(localLockfile, 'utf8'));
  assert(!updatedLock.skills['local-widget-tool'], 'Skill must be purged from local .skill-lock.json');
  console.log('✅ 5.1 passed: Skill files and lockfile entry cleanly removed for local skill');

  console.log('5.2: Uninstalling remaining multi-skill repo by repository identifier...');
  const repoIdentifier = globInstallRes.json.identifier;
  const uninstRepoRes = runIas(['uninstall', repoIdentifier, '--force', '--json'], {
    cwd: multiWorkspace
  });
  assert.strictEqual(uninstRepoRes.status, 0, `Repo uninstall failed: ${uninstRepoRes.stderr}`);
  assert(uninstRepoRes.json && uninstRepoRes.json.status === 'success');

  // Verify all registered skills in multi-repo are removed
  assert(!fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'react-patterns')), 'react-patterns should be deleted');
  assert(!fs.existsSync(path.join(multiWorkspace, '.agents', 'skills', 'react-hooks')), 'react-hooks should be deleted');
  const updatedMultiLock = JSON.parse(fs.readFileSync(path.join(multiWorkspace, '.skill-lock.json'), 'utf8'));
  assert.strictEqual(Object.keys(updatedMultiLock.skills).length, 0, 'All skills must be purged from multi lockfile');
  console.log('✅ 5.2 passed: All skills in repository identifier cleanly uninstalled\n');

  console.log('5.3: Uninstalling global simulated Claude harness skill...');
  const uninstClaude = runIas(['uninstall', 'universal-tool', '--force', '--json'], { env: claudeEnv });
  assert.strictEqual(uninstClaude.status, 0, `Claude uninstall failed: ${uninstClaude.stderr}`);
  assert(!fs.existsSync(path.join(testClaudeHome, 'skills', 'universal-tool')), 'Skill must be deleted from CLAUDE_HOME/skills');
  assert(!fs.existsSync(path.join(testIasHomeClaude, '.agents', 'skills', 'universal-tool')), 'Skill must be deleted from global .agents/skills');
  console.log('✅ 5.3 passed: Global Claude harness skill cleanly uninstalled');

  // =========================================================================
  // Cleanup All Temporary Test Directories
  // =========================================================================
  const cleanupDirs = [
    isolatedWorkspace,
    mockLocalRepo,
    multiWorkspace,
    mockMultiRepo,
    mockHarnessRepo,
    testClaudeHome,
    testIasHomeClaude,
    testHermesDir,
    testIasHomeHermes,
    testGeminiHome,
    testIasHomeGemini
  ];
  for (const d of cleanupDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
  }

  console.log('\n' + '='.repeat(65));
  console.log('🎉 ALL MULTI-HARNESS INTEGRATION & E2E MATRIX TESTS PASSED!');
  console.log('='.repeat(65));
})();
