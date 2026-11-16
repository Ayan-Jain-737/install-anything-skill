#!/usr/bin/env node
/**
 * test-releases.js
 * Unit tests for Release Binary Asset Matcher & Tarball Skill Extractor
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { ScriptAdapter } = require('../skills/install-anything-installer/scripts/adapt-install');

(() => {
  console.log('Testing ScriptAdapter Release Matcher & Zero-Clone Installers\n' + '='.repeat(50) + '\n');

  const adapter = new ScriptAdapter();

  // Test 1: Release Asset Matching for Linux x64
  console.log('Test 1: Matching release assets for Linux x64 (eget-style heuristics)...');
  const mockAssetsRipgrep = [
    { name: 'ripgrep-14.1.0-aarch64-apple-darwin.tar.gz', browser_download_url: 'https://github.com/.../ripgrep-arm-darwin.tar.gz' },
    { name: 'ripgrep-14.1.0-x86_64-apple-darwin.tar.gz', browser_download_url: 'https://github.com/.../ripgrep-x64-darwin.tar.gz' },
    { name: 'ripgrep-14.1.0-x86_64-pc-windows-msvc.zip', browser_download_url: 'https://github.com/.../ripgrep-x64-win.zip' },
    { name: 'ripgrep-14.1.0-x86_64-unknown-linux-musl.tar.gz', browser_download_url: 'https://github.com/.../ripgrep-x64-linux-musl.tar.gz' },
    { name: 'ripgrep_14.1.0_amd64.deb', browser_download_url: 'https://github.com/.../ripgrep.deb' },
    { name: 'ripgrep-14.1.0-x86_64-unknown-linux-gnu.tar.gz', browser_download_url: 'https://github.com/.../ripgrep-x64-linux-gnu.tar.gz' }
  ];

  const matchedLinux = adapter.matchReleaseAsset(mockAssetsRipgrep, { os: 'linux', arch: 'x64' });
  assert(matchedLinux, 'Should find matching asset for Linux x64');
  // Musl preferred for portable execution
  assert(matchedLinux.name.includes('linux-musl') || matchedLinux.name.includes('linux-gnu'), 'Should match linux tar.gz');
  assert(!matchedLinux.name.endsWith('.deb'), 'Should reject .deb packages');
  console.log(`✅ Test 1 passed: Matched "${matchedLinux.name}" for Linux x64\n`);

  // Test 2: Release Asset Matching for macOS arm64 (Apple Silicon)
  console.log('Test 2: Matching release assets for macOS arm64 (Apple Silicon)...');
  const matchedMac = adapter.matchReleaseAsset(mockAssetsRipgrep, { os: 'darwin', arch: 'arm64' });
  assert(matchedMac, 'Should find matching asset for macOS arm64');
  assert(matchedMac.name.includes('aarch64-apple-darwin'), 'Should match Apple Silicon asset');
  console.log(`✅ Test 2 passed: Matched "${matchedMac.name}" for macOS arm64\n`);

  // Test 3: Release Asset Matching for Ruff (Python linter in Rust)
  console.log('Test 3: Matching Ruff assets with various naming schemes...');
  const mockAssetsRuff = [
    { name: 'ruff-aarch64-apple-darwin.tar.gz' },
    { name: 'ruff-x86_64-apple-darwin.tar.gz' },
    { name: 'ruff-x86_64-unknown-linux-gnu.tar.gz' },
    { name: 'ruff-x86_64-pc-windows-msvc.zip' },
    { name: 'ruff-0.4.0.sha256' }
  ];
  const matchedRuff = adapter.matchReleaseAsset(mockAssetsRuff, { os: 'linux', arch: 'x64' });
  assert(matchedRuff, 'Should match ruff linux asset');
  assert.strictEqual(matchedRuff.name, 'ruff-x86_64-unknown-linux-gnu.tar.gz');
  console.log(`✅ Test 3 passed: Matched "${matchedRuff.name}"\n`);

  // Test 4: Selective Skill Glob Filter Matcher
  console.log('Test 4: Skill glob filter matching...');
  assert.strictEqual(adapter.matchesSkillFilter('react-best-practices', 'react-*'), true);
  assert.strictEqual(adapter.matchesSkillFilter('next-cache', 'react-*'), false);
  assert.strictEqual(adapter.matchesSkillFilter('tdd-workflow', 'tdd*'), true);
  assert.strictEqual(adapter.matchesSkillFilter('anything', null), true);
  console.log('✅ Test 4 passed: Skill filter matching verified\n');

  console.log('='.repeat(50));
  console.log('🎉 ALL RELEASE & ZERO-CLONE MATCHER TESTS PASSED!\n');
})();
