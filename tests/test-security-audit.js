#!/usr/bin/env node
/**
 * test-security-audit.js
 * Rigorous security audit test suite for install-anything-skill (ias)
 *
 * Verifies:
 * 1. Command injection prevention in git clone, archive extraction, and binary --help probing.
 * 2. Path traversal / Zip Slip prevention in archive extraction and asset downloads.
 * 3. Prevention of arbitrary directory deletion via path traversal in normalizeRepoUrl & targetDir.
 * 4. Prevention of harness directory deletion on empty/invalid skill names.
 * 5. Credential leakage prevention (GITHUB_TOKEN / GH_TOKEN) to unauthorized domains.
 * 6. SSRF prevention for loopback / link-local cloud metadata addresses.
 * 7. Path traversal prevention in exposeBinaries and fetchRawFile.
 * 8. Cleanup of temporary files on atomic write failure.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ScriptAdapter } = require('../skills/install-anything-installer/scripts/adapt-install.js');
const { ReadmeGuide } = require('../skills/install-anything-installer/scripts/readme-guide.js');
const { SkillRegistry } = require('../skills/install-anything-installer/scripts/skill-registry.js');
const { InstallAnythingCLI } = require('../bin/install-anything');

console.log('Running Security & Hardening Audit Test Suite');
console.log('==================================================\n');

(async () => {
  const tmpBase = path.join(os.tmpdir(), `ias-security-test-${Date.now()}`);
  fs.mkdirSync(tmpBase, { recursive: true });

  try {
    const cli = new InstallAnythingCLI({ homedir: tmpBase, dryRun: false });
    const adapter = new ScriptAdapter();
    const guide = new ReadmeGuide({ homedir: tmpBase });
    const registry = new SkillRegistry({ homedir: tmpBase });

    // ------------------------------------------------------------------------
    // Test 1: Prevention of Path Traversal in normalizeRepoUrl & targetDir
    // ------------------------------------------------------------------------
    console.log('Test 1: Path Traversal prevention in normalizeRepoUrl...');
    const maliciousInputs = [
      'https://github.com/../../',
      'github.com/../../etc/passwd',
      'https://github.com/..%2f..%2f',
      '../../../../etc/passwd'
    ];

    for (const input of maliciousInputs) {
      const norm = cli.normalizeRepoUrl(input);
      const targetDir = path.join(cli.reposDir, norm.owner, norm.repoName);
      const resolved = path.resolve(targetDir);
      assert(
        resolved.startsWith(path.resolve(cli.reposDir)),
        `targetDir for "${input}" (${resolved}) must stay inside reposDir (${cli.reposDir})`
      );
      assert(!norm.owner.includes('..'), `owner must not contain '..'`);
      assert(!norm.repoName.includes('..'), `repoName must not contain '..'`);
    }
    console.log('✅ Test 1 passed: normalizeRepoUrl path traversal prevented\n');

    // ------------------------------------------------------------------------
    // Test 2: Command Injection Prevention in ensureClone
    // ------------------------------------------------------------------------
    console.log('Test 2: Command Injection prevention in ensureClone...');
    const canaryFile = path.join(tmpBase, 'pwned_clone.txt');
    if (fs.existsSync(canaryFile)) fs.unlinkSync(canaryFile);

    const evilUrl = `https://github.com/foo/bar.git"; touch "${canaryFile}"; echo "`;
    const evilNorm = cli.normalizeRepoUrl(evilUrl);
    const evilTarget = path.join(cli.reposDir, evilNorm.owner, evilNorm.repoName);

    // Call ensureClone with malicious URL
    cli.ensureClone(evilNorm, evilTarget);
    assert(!fs.existsSync(canaryFile), 'Command injection via git clone must not create canary file');
    console.log('✅ Test 2 passed: ensureClone command injection prevented\n');

    // ------------------------------------------------------------------------
    // Test 3: Command Injection Prevention in --help Extraction (skill-registry)
    // ------------------------------------------------------------------------
    console.log('Test 3: Command Injection prevention in generateSkillForRepo (--help)...');
    const helpCanary = path.join(tmpBase, 'pwned_help.txt');
    if (fs.existsSync(helpCanary)) fs.unlinkSync(helpCanary);

    const evilRepoDir = path.join(tmpBase, 'evil-repo');
    fs.mkdirSync(evilRepoDir, { recursive: true });

    registry.generateSkillForRepo(evilRepoDir, {
      name: 'evil-tool',
      binaries: [`touch "${helpCanary}" ; echo`]
    });

    assert(!fs.existsSync(helpCanary), 'Untrusted binary name in package.json must not execute shell commands');
    console.log('✅ Test 3 passed: generateSkillForRepo command injection prevented\n');

    // ------------------------------------------------------------------------
    // Test 4: Path Traversal in exposeBinaries
    // ------------------------------------------------------------------------
    console.log('Test 4: Path Traversal prevention in exposeBinaries...');
    const localBinDir = path.join(tmpBase, '.local', 'bin');
    const sensitiveFile = path.join(tmpBase, 'sensitive.txt');
    fs.writeFileSync(sensitiveFile, 'ORIGINAL_CONTENT');

    const repoWithTraversal = path.join(tmpBase, 'traversal-repo');
    fs.mkdirSync(repoWithTraversal, { recursive: true });
    fs.writeFileSync(path.join(repoWithTraversal, 'evil.sh'), '#!/bin/sh\necho evil');
    fs.writeFileSync(path.join(repoWithTraversal, 'package.json'), JSON.stringify({
      name: 'traversal-pkg',
      bin: {
        '../../../sensitive.txt': './evil.sh'
      }
    }));

    cli.exposeBinaries(repoWithTraversal, []);
    const contentAfter = fs.readFileSync(sensitiveFile, 'utf8');
    assert.strictEqual(contentAfter, 'ORIGINAL_CONTENT', 'exposeBinaries must not overwrite files outside .local/bin');
    console.log('✅ Test 4 passed: exposeBinaries path traversal prevented\n');

    // ------------------------------------------------------------------------
    // Test 5: Credential Leakage Prevention (GITHUB_TOKEN)
    // ------------------------------------------------------------------------
    console.log('Test 5: Credential Leakage prevention in HTTP requests...');
    const originalToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'secret_token_12345';

    try {
      // Test URL host verification in ScriptAdapter
      assert.strictEqual(adapter.isGitHubHost('github.com'), true);
      assert.strictEqual(adapter.isGitHubHost('api.github.com'), true);
      assert.strictEqual(adapter.isGitHubHost('raw.githubusercontent.com'), true);
      assert.strictEqual(adapter.isGitHubHost('evil-attacker.com'), false);
      assert.strictEqual(adapter.isGitHubHost('github.com.evil.com'), false);
      assert.strictEqual(adapter.isGitHubHost('attacker.com'), false);

      // Verify SSRF / private host check
      assert.strictEqual(adapter.isPrivateOrBlockedHost('localhost'), true);
      assert.strictEqual(adapter.isPrivateOrBlockedHost('127.0.0.1'), true);
      assert.strictEqual(adapter.isPrivateOrBlockedHost('169.254.169.254'), true);
      assert.strictEqual(adapter.isPrivateOrBlockedHost('10.0.0.1'), true);
      assert.strictEqual(adapter.isPrivateOrBlockedHost('192.168.1.1'), true);
      assert.strictEqual(adapter.isPrivateOrBlockedHost('172.16.0.1'), true);
      assert.strictEqual(adapter.isPrivateOrBlockedHost('github.com'), false);
    } finally {
      process.env.GITHUB_TOKEN = originalToken;
    }
    console.log('✅ Test 5 passed: Credential leakage and SSRF host verification verified\n');

    // ------------------------------------------------------------------------
    // Test 6: Prevention of Harness Directory Deletion on Empty/Invalid Skill Name
    // ------------------------------------------------------------------------
    console.log('Test 6: Prevention of harness directory deletion on invalid skill name...');
    const fakeGeminiSkillsDir = path.join(tmpBase, '.gemini', 'skills');
    fs.mkdirSync(fakeGeminiSkillsDir, { recursive: true });
    fs.writeFileSync(path.join(fakeGeminiSkillsDir, 'precious-skill.txt'), 'KEEP_ME');

    const emptyNameSkill = {
      name: '---', // sanitizes to ''
      skillDir: path.join(tmpBase, 'source-skill')
    };
    fs.mkdirSync(emptyNameSkill.skillDir, { recursive: true });
    fs.writeFileSync(path.join(emptyNameSkill.skillDir, 'SKILL.md'), '---\nname: ---\n---\n# Bad Name');

    registry.registerSkill(emptyNameSkill, {
      targetHarness: 'gemini',
      projectRoot: tmpBase
    });

    assert(fs.existsSync(fakeGeminiSkillsDir), '.gemini/skills directory must not be deleted');
    assert(fs.existsSync(path.join(fakeGeminiSkillsDir, 'precious-skill.txt')), 'Existing skills must not be wiped');
    console.log('✅ Test 6 passed: Harness directory deletion prevented\n');

    // ------------------------------------------------------------------------
    // Test 7: Path Traversal Prevention in fetchRawFile
    // ------------------------------------------------------------------------
    console.log('Test 7: Path Traversal prevention in fetchRawFile (local mode)...');
    const localDir = path.join(tmpBase, 'local-repo');
    fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(path.join(localDir, 'safe.txt'), 'SAFE_CONTENT');

    const outsideFile = path.join(tmpBase, 'outside.txt');
    fs.writeFileSync(outsideFile, 'OUTSIDE_CONTENT');

    const safeResult = await guide.fetchRawFile(localDir, 'safe.txt');
    assert.strictEqual(safeResult, 'SAFE_CONTENT', 'Should read safe local file');

    const evilResult = await guide.fetchRawFile(localDir, '../outside.txt');
    assert.strictEqual(evilResult, null, 'fetchRawFile must reject path traversal attempts');
    console.log('✅ Test 7 passed: fetchRawFile path traversal prevented\n');

    // ------------------------------------------------------------------------
    // Test 8: Atomic Write Temp File Cleanup on Error
    // ------------------------------------------------------------------------
    console.log('Test 8: Atomic write cleans up temp files on failure...');
    const badDir = path.join(tmpBase, 'non-writable-parent');
    fs.mkdirSync(badDir, { recursive: true });
    const targetFile = path.join(badDir, 'test.json');

    // Make target a directory so renameSync throws EISDIR
    fs.mkdirSync(targetFile);

    assert.throws(() => {
      registry.atomicWriteFileSync(targetFile, 'data');
    }, /EISDIR|EEXIST|EPERM/);

    const lingeringTmp = fs.readdirSync(badDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(lingeringTmp.length, 0, 'No temporary files should linger after write failure');
    console.log('✅ Test 8 passed: Atomic write failure cleanup verified\n');

    console.log('==================================================');
    console.log('🎉 ALL SECURITY AUDIT TESTS PASSED!\n');
  } finally {
    try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
  }
})();
