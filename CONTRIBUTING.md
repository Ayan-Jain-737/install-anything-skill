# Contributing to install-anything-skill (ias)

Thank you for your interest in contributing! 🎉 `ias` is built to make any open source code or tool immediately useful for AI coding agents.

---

## ⏱️ Fast Response SLA
We value your time. **Maintainers review and reply to every issue and PR within 24 hours.**

---

## 🧭 Getting Started

### 1. Find an Issue
- Check out our curated [🌟 Good First Issues](.github/GOOD_FIRST_ISSUES.md) for beginner-friendly, well-scoped tasks.
- Join the conversation on [💬 GitHub Discussions](https://github.com/Ayan-Jain-737/install-anything-skill/discussions) to propose ideas or ask questions before starting major work.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or pnpm
- Git

### Setup
```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/install-anything-skill.git
cd install-anything-skill

# 2. Install dependencies
npm install

# 3. Test running the CLI locally
node bin/ias --help
node bin/ias find react

# 4. (Optional) Symlink globally for live local testing
npm link
ias --help
```

---

## 🧪 Running Tests

Always ensure the full test suite passes before opening a PR:

```bash
# Run all unit and integration tests
npm test
```

This runs:
1. `tests/test-scanner.js`: Repository language, framework, and install method detection.
2. `tests/test-skills.js`: Skill discovery, active-agent scoping, and global harness registration.
3. `tests/test-finder.js`: Real-time and offline skill search engine.
4. `tests/test-lifecycle.js`: End-to-end CLI lifecycle (`diagnose` -> `install` -> `list-installed` -> `uninstall`).

---

## 🌿 Pull Request Workflow

1. **Create a topic branch**:
   ```bash
   git checkout -b feat/support-bun-installer
   ```
2. **Make your changes**:
   - Write clean, readable code with comments where helpful.
   - Follow the existing CommonJS structure.
   - Add test cases in `tests/` covering your changes.
3. **Run the test suite**:
   ```bash
   npm test
   ```
4. **Commit using Conventional Commits**:
   - `feat: add bun package manager support`
   - `fix: resolve active agent symlink in non-standard homedir`
   - `docs: update quickstart instructions`
   - `test: add unit tests for custom IAS_HOME`
5. **Push and open a PR**:
   - Push your branch to GitHub and open a pull request against `main`.
   - Complete the PR template checklist.

---

## 📋 Coding Standards

- **Zero Unused Directory Clutter**: Maintain active-agent scoping discipline. Never create folders for unused agents unless explicitly requested.
- **Node.js Compatibility**: Support Node.js 18+ without experimental runtime flags.
- **Fail Gracefully**: If network is unavailable, fall back to cached registries. Never throw unhandled rejections to the terminal user.

---

## 💬 Community & Questions

- **Questions & Discussions**: Use [GitHub Discussions](https://github.com/Ayan-Jain-737/install-anything-skill/discussions).
- **Bug Reports**: Open an [Issue](https://github.com/Ayan-Jain-737/install-anything-skill/issues/new?template=bug_report.yml).
- **Feature Requests**: Open an [Issue](https://github.com/Ayan-Jain-737/install-anything-skill/issues/new?template=feature_request.yml).
