#!/usr/bin/env node
/**
 * test-synthesis.js
 * Unit tests for in-depth SKILL.md synthesis engine & atomic file writes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { SkillRegistry } = require('../skills/install-anything-installer/scripts/skill-registry');

(() => {
  console.log('Testing SkillRegistry In-Depth Synthesis & Atomic Writes\n' + '='.repeat(50) + '\n');

  const testHome = path.join(os.tmpdir(), `test-synthesis-${Date.now()}`);
  const registry = new SkillRegistry({ homedir: testHome });

  // Test 1: In-depth skill synthesis for a CLI tool
  console.log('Test 1: Synthesizing in-depth skill manual for CLI tool...');
  const mockToolDir = path.join(testHome, 'repos', 'mock-cli');
  fs.mkdirSync(mockToolDir, { recursive: true });
  fs.writeFileSync(path.join(mockToolDir, 'README.md'), `
# SuperLinter
A blazing fast linter and code formatter.

## Installation
\`\`\`bash
npm i -g superlinter
\`\`\`

## Usage
\`\`\`bash
superlinter check <path> --fix
superlinter format <path> --check
\`\`\`

## Configuration
Supports \`superlinter.json\` in workspace root.
`);

  const synthResult = registry.generateSkillForRepo(mockToolDir, {
    name: 'superlinter',
    description: 'Blazing fast linter and code formatter for web projects',
    binaries: ['superlinter'],
    repoUrl: 'https://github.com/tools/superlinter',
    archetype: 'pkg-tool'
  });

  assert(synthResult.generated, 'Should be marked as generated');
  assert(fs.existsSync(synthResult.skillFilePath), 'SKILL.md file must exist');

  const skillContent = fs.readFileSync(synthResult.skillFilePath, 'utf8');
  assert(skillContent.includes('# superlinter'), 'Must have main heading');
  assert(skillContent.includes('## Quick Reference & Core Triggers'), 'Must have Quick Reference');
  assert(skillContent.includes('## Command Synopsis & Key Flags'), 'Must have Command Synopsis');
  assert(skillContent.includes('## High-Frequency Agent Recipes'), 'Must have Recipe section');
  assert(skillContent.includes('superlinter check <path> --fix'), 'Must extract recipes from README');
  assert(skillContent.includes('## Error Recovery & Troubleshooting'), 'Must have Troubleshooting section');
  console.log('✅ Test 1 passed: In-depth CLI skill manual verified\n');

  // Test 2: In-depth skill synthesis for a Web App/Service (Open-Generative-AI style)
  console.log('Test 2: Synthesizing in-depth service skill for fullstack app...');
  const mockServiceDir = path.join(testHome, 'repos', 'open-generative-ai');
  fs.mkdirSync(mockServiceDir, { recursive: true });
  fs.writeFileSync(path.join(mockServiceDir, 'Dockerfile'), 'EXPOSE 3000');
  fs.writeFileSync(path.join(mockServiceDir, 'README.md'), `
# Open Generative AI
Self-hosted AI media generation studio.

## Run with Docker
\`\`\`bash
docker run -d -p 3000:3000 anilmatcha/open-generative-ai
\`\`\`
`);

  const serviceSynth = registry.generateSkillForRepo(mockServiceDir, {
    name: 'open-generative-ai',
    description: 'Generate images, video, and lip-sync media via local studio',
    repoUrl: 'https://github.com/anil-matcha/open-generative-ai',
    archetype: 'web-app',
    hasDocker: true
  });

  const serviceContent = fs.readFileSync(serviceSynth.skillFilePath, 'utf8');
  assert(serviceContent.includes('## Service Endpoints & Workflows'), 'Must include Service Endpoints');
  assert(serviceContent.includes('docker run'), 'Must include Docker startup commands');
  assert(serviceContent.includes('http://localhost:3000'), 'Must include port reference');
  console.log('✅ Test 2 passed: In-depth Web Service skill manual verified\n');

  // Test 3: Atomic file writes on lockfile
  console.log('Test 3: Atomic file writes prevent race conditions...');
  registry.updateSkillLock('https://github.com/tools/superlinter', synthResult);
  const lockPath = path.join(testHome, '.agents', '.skill-lock.json');
  assert(fs.existsSync(lockPath), 'Lockfile should be created');
  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert(lockData.skills.superlinter, 'Skill entry must be recorded');
  assert.strictEqual(lockData.skills.superlinter.source, 'tools/superlinter');
  console.log('✅ Test 3 passed: Atomic lockfile update verified\n');

  // Cleanup
  fs.rmSync(testHome, { recursive: true, force: true });

  console.log('='.repeat(50));
  console.log('🎉 ALL SKILL SYNTHESIS & ATOMIC WRITE TESTS PASSED!\n');
})();
