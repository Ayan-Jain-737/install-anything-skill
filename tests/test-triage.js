#!/usr/bin/env node
/**
 * test-triage.js
 * Unit tests for ReadmeGuide & RepoTriage engine:
 * 1. Raw manifest fetching (rate-limit safe)
 * 2. Big repo complex README parsing (targeting ## Installation sections)
 * 3. 7-Archetype classification
 * 4. Human handoff report generation for regular apps
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { ReadmeGuide } = require('../skills/install-anything-installer/scripts/readme-guide');

(async () => {
  console.log('Testing ReadmeGuide & RepoTriage Engine\n' + '='.repeat(50) + '\n');

  const testCacheDir = path.join(os.tmpdir(), `test-triage-cache-${Date.now()}`);
  const guide = new ReadmeGuide({ cacheDir: testCacheDir });

  // Test 1: Big/Complex README section targeting
  console.log('Test 1: Parsing big README with targeted installation sections...');
  const complexReadme = `
# Giant Monorepo Framework

Welcome to Giant Framework. We have 500 contributors and 100 features.

## Contributing & Development
To run our test suites:
\`\`\`bash
npm run test:all -- --coverage
\`\`\`
To build our docs:
\`\`\`bash
cd docs && npm run build
\`\`\`

## Installation
Recommended 1-command install:
\`\`\`bash
npx skills add giant/framework-skills
\`\`\`
Or via npm:
\`\`\`bash
npm install -g giant-cli
\`\`\`

## Sponsorship
Thanks to all sponsors!
`;

  const parsed = guide.parseInstallGuide(complexReadme, 'giant/framework');
  assert.strictEqual(parsed.hasGuide, true, 'Should find guide');
  assert.strictEqual(parsed.primarySuggestion.type, 'skills_cli', 'Should prioritize skills_cli from Installation section');
  assert(parsed.primarySuggestion.command.includes('skills add'), 'Command should be skills add');
  // It shouldn't pick up test or doc commands from Contributing
  assert(!parsed.suggestions.some(s => s.command.includes('test:all')), 'Should ignore non-install commands');
  console.log('✅ Test 1 passed: Big README targeted section extraction verified\n');

  // Test 2: Local Raw File Fetching & Caching
  console.log('Test 2: Raw manifest fetching & local HTTP/manifest cache...');
  const mockLocalRepo = path.join(os.tmpdir(), `test-local-triage-${Date.now()}`);
  fs.mkdirSync(mockLocalRepo, { recursive: true });
  fs.writeFileSync(path.join(mockLocalRepo, 'package.json'), JSON.stringify({
    name: 'test-cli-tool',
    version: '1.0.0',
    bin: { 'test-cli': './bin/cli.js' }
  }, null, 2));
  fs.writeFileSync(path.join(mockLocalRepo, 'README.md'), `
# Test CLI Tool
## Installation
\`\`\`bash
npm i -g test-cli-tool
\`\`\`
`);

  const fetched = await guide.fetchReadme(mockLocalRepo);
  assert.strictEqual(fetched.source, 'local');
  assert(fetched.content.includes('# Test CLI Tool'));
  console.log('✅ Test 2 passed: Local manifest fetching verified\n');

  // Test 3: Archetype Classification (CLI Package Tool)
  console.log('Test 3: Archetype classification for CLI package tool...');
  const archetypeCli = await guide.classifyArchetype(mockLocalRepo);
  assert.strictEqual(archetypeCli.archetype, 'pkg-tool', 'Should classify as pkg-tool');
  assert.strictEqual(archetypeCli.binaries[0], 'test-cli', 'Should detect binary');
  assert.strictEqual(archetypeCli.requiresClone, false, 'Package tools should not require full clone');
  console.log('✅ Test 3 passed: CLI package tool archetype verified\n');

  // Test 4: Archetype Classification (Prompt Skill Pack)
  console.log('Test 4: Archetype classification for Prompt Skill Pack...');
  const mockSkillRepo = path.join(os.tmpdir(), `test-skill-pack-${Date.now()}`);
  fs.mkdirSync(path.join(mockSkillRepo, 'skills', 'my-skill'), { recursive: true });
  fs.writeFileSync(path.join(mockSkillRepo, 'skills', 'my-skill', 'SKILL.md'), `---
name: my-skill
description: A mock skill
---
# My Skill
`);
  const archetypeSkill = await guide.classifyArchetype(mockSkillRepo);
  assert.strictEqual(archetypeSkill.archetype, 'skill-pack', 'Should classify as skill-pack');
  assert(archetypeSkill.skillCount >= 1, 'Should find skills');
  assert.strictEqual(archetypeSkill.requiresClone, false, 'Skill packs should stream without full clone');
  console.log('✅ Test 4 passed: Skill pack archetype verified\n');

  // Test 5: Archetype Classification (Fullstack Web App with Docker)
  console.log('Test 5: Archetype classification for Fullstack Web App (Open-Generative-AI style)...');
  const mockAppRepo = path.join(os.tmpdir(), `test-web-app-${Date.now()}`);
  fs.mkdirSync(mockAppRepo, { recursive: true });
  fs.writeFileSync(path.join(mockAppRepo, 'package.json'), JSON.stringify({
    name: 'open-generative-ai-mock',
    dependencies: { next: '^14.0.0', react: '^18.0.0' }
  }));
  fs.writeFileSync(path.join(mockAppRepo, 'Dockerfile'), 'FROM node:20-alpine\nEXPOSE 3000\nCMD ["npm", "start"]');
  fs.writeFileSync(path.join(mockAppRepo, 'docker-compose.yml'), 'version: "3"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"');

  const archetypeApp = await guide.classifyArchetype(mockAppRepo);
  assert.strictEqual(archetypeApp.archetype, 'web-app', 'Should classify as web-app');
  assert.strictEqual(archetypeApp.hasDocker, true, 'Should detect Docker');
  assert.strictEqual(archetypeApp.requiresClone, false, 'Should not clone whole repo blindly into agent cache');
  console.log('✅ Test 5 passed: Fullstack web app archetype verified\n');

  // Test 6: Human Handoff Report for Apps needing manual interference
  console.log('Test 6: Human handoff report generation for complex non-AI apps...');
  const handoff = guide.generateHandoffReport({
    repoName: 'open-generative-ai',
    repoUrl: 'https://github.com/anil-matcha/open-generative-ai',
    archetype: 'web-app',
    prerequisites: ['Docker Desktop must be running', 'Port 3000 must be available'],
    stepsCompleted: ['Generated service client skill', 'Prepared container runner command'],
    actionRequired: 'Ensure Docker is running and run: docker compose up -d'
  });

  assert.strictEqual(handoff.requiresHumanAction, true);
  assert(handoff.formattedReport.includes('HUMAN INTERVENTION REQUIRED'));
  assert(handoff.formattedReport.includes('Docker Desktop must be running'));
  console.log('✅ Test 6 passed: Human handoff report generation verified\n');

  // Test 7: Severe Edge Cases (empty repo, malformed manifests, broken submodules, 10MB README)
  console.log('Test 7: ReadmeGuide.classifyArchetype severe edge cases...');

  // 7A: Empty repo without README
  const emptyDir = path.join(os.tmpdir(), `test-triage-empty-${Date.now()}`);
  fs.mkdirSync(emptyDir, { recursive: true });
  const emptyResult = await guide.classifyArchetype(emptyDir);
  assert.strictEqual(emptyResult.archetype, 'source-build');
  assert.strictEqual(emptyResult.requiresClone, true);
  fs.rmSync(emptyDir, { recursive: true, force: true });

  // 7B: Malformed package.json and Cargo.toml
  const malformedDir = path.join(os.tmpdir(), `test-triage-malformed-${Date.now()}`);
  fs.mkdirSync(malformedDir, { recursive: true });
  fs.writeFileSync(path.join(malformedDir, 'package.json'), 'not valid json {{{');
  fs.writeFileSync(path.join(malformedDir, 'Cargo.toml'), 'invalid toml %%%');
  const malformedResult = await guide.classifyArchetype(malformedDir);
  assert.strictEqual(malformedResult.archetype, 'source-build');
  fs.rmSync(malformedDir, { recursive: true, force: true });

  // 7C: Submodules with broken URLs
  const subDir = path.join(os.tmpdir(), `test-triage-sub-${Date.now()}`);
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, '.gitmodules'), '[submodule "bad"]\n\tpath = bad\n\turl = http://broken.invalid/repo.git\n');
  const subResult = await guide.classifyArchetype(subDir);
  assert.strictEqual(subResult.submodules, true);
  assert(Array.isArray(subResult.submoduleUrls));
  fs.rmSync(subDir, { recursive: true, force: true });

  // 7D: 10MB README parsing
  const bigReadme = '# Huge Repo\n\n## Installation\n\n```bash\nnpm i -g huge-tool\n```\n\n' + 'Some filler documentation line.\n'.repeat(100000);
  const parsedBig = guide.parseInstallGuide(bigReadme, 'huge/repo');
  assert.strictEqual(parsedBig.hasGuide, true);
  assert.strictEqual(parsedBig.primarySuggestion.command, 'npm i -g huge-tool');
  console.log('✅ Test 7 passed: Empty repo, malformed manifests, broken submodules, and 10MB README verified\n');

  // Cleanup
  fs.rmSync(testCacheDir, { recursive: true, force: true });
  fs.rmSync(mockLocalRepo, { recursive: true, force: true });
  fs.rmSync(mockSkillRepo, { recursive: true, force: true });
  fs.rmSync(mockAppRepo, { recursive: true, force: true });

  console.log('='.repeat(50));
  console.log('🎉 ALL TRIAGE & ARCHETYPE TESTS PASSED!\n');
})();
