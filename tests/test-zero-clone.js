const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ScriptAdapter } = require('../skills/install-anything-installer/scripts/adapt-install.js');
const { SkillRegistry } = require('../skills/install-anything-installer/scripts/skill-registry.js');

console.log('Testing Zero-Clone Extraction & Local Scoping');
console.log('==================================================\n');

(async () => {
  const adapter = new ScriptAdapter();

  // Test 1: Fetch release assets without API limits (HTML & redirect scraping)
  console.log('Test 1: Fetching release assets for public repo without API limits...');
  const releaseInfo = await adapter.fetchReleaseAssets('BurntSushi', 'ripgrep');
  assert(releaseInfo, 'Should resolve release info');
  assert(releaseInfo.tag, 'Should have a release tag');
  assert(Array.isArray(releaseInfo.assets) && releaseInfo.assets.length > 0, 'Should have non-empty assets array');
  const hasDarwinOrLinux = releaseInfo.assets.some(a => a.name.includes('linux') || a.name.includes('darwin'));
  assert(hasDarwinOrLinux, 'Assets should include platform builds');
  console.log(`✅ Test 1 passed: Found ${releaseInfo.assets.length} assets for tag ${releaseInfo.tag}`);

  // Test 2: Matching and downloading a release binary to a local bin directory
  console.log('\nTest 2: Match release asset for current platform and test download structure...');
  const currentPlatform = os.platform() === 'darwin' ? 'darwin' : (os.platform() === 'win32' ? 'windows' : 'linux');
  const currentArch = os.arch();
  const matched = adapter.matchReleaseAsset(releaseInfo.assets, { os: currentPlatform, arch: currentArch });
  assert(matched, `Should match an asset for ${currentPlatform}-${currentArch}`);
  assert(matched.browser_download_url, 'Matched asset should have browser_download_url');
  console.log(`✅ Test 2 passed: Matched ${matched.name} (${matched.browser_download_url})`);

  // Test 3: Tarball extraction without git clone
  console.log('\nTest 3: Stream & unpack tarball for repository (zero-clone)...');
  const tmpDir = path.join(os.tmpdir(), `ias-tarball-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const res = await adapter.downloadTarball('https://github.com/vercel-labs/agent-skills', tmpDir);
    assert(res && res.success, 'Tarball download and extraction should succeed');
    const files = fs.readdirSync(tmpDir);
    assert(files.length > 0, 'Extracted directory should not be empty');
    console.log(`✅ Test 3 passed: Extracted ${files.length} items without git clone`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  // Test 4: Project-Local scoping (--scope local / -p)
  console.log('\nTest 4: Project-Local scoping for skills registration...');
  const localProjectRoot = path.join(os.tmpdir(), `ias-local-project-${Date.now()}`);
  fs.mkdirSync(localProjectRoot, { recursive: true });
  try {
    const registry = new SkillRegistry({ homedir: path.join(localProjectRoot, 'fake-home') });
    const fakeSkillDir = path.join(localProjectRoot, 'source-skill');
    fs.mkdirSync(fakeSkillDir, { recursive: true });
    fs.writeFileSync(path.join(fakeSkillDir, 'SKILL.md'), '---\nname: local-test-skill\ndescription: Test local skill\n---\n# Test');

    const regResult = registry.registerSkill({
      name: 'local-test-skill',
      skillDir: fakeSkillDir
    }, {
      scope: 'local',
      projectRoot: localProjectRoot,
      targetHarness: 'gemini'
    });

    assert(regResult.registeredHarnesses.length > 0, 'Should register to local harnesses');
    const localAgentsSkill = path.join(localProjectRoot, '.agents', 'skills', 'local-test-skill', 'SKILL.md');
    const localGeminiSkill = path.join(localProjectRoot, '.gemini', 'skills', 'local-test-skill', 'SKILL.md');

    assert(fs.existsSync(localAgentsSkill), 'Should exist in local .agents/skills');
    assert(fs.existsSync(localGeminiSkill), 'Should exist in local .gemini/skills');
    console.log('✅ Test 4 passed: Skills registered strictly in project-local workspace');
  } finally {
    try { fs.rmSync(localProjectRoot, { recursive: true, force: true }); } catch {}
  }

  // Test 5: Selective skill extraction with glob filtering
  console.log('\nTest 5: Selective skill glob filtering...');
  assert(adapter.matchesSkillFilter('react-patterns', 'react-*'), 'Should match react-*');
  assert(!adapter.matchesSkillFilter('vue-patterns', 'react-*'), 'Should not match vue-patterns for react-*');
  assert(adapter.matchesSkillFilter('tdd-workflow', 'react-*,tdd*'), 'Should match comma-separated patterns');
  console.log('✅ Test 5 passed: Glob filtering verified');

  console.log('\n==================================================');
  console.log('🎉 ALL ZERO-CLONE & LOCAL SCOPING TESTS PASSED!');
})();
