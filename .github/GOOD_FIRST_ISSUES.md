# 🌟 Good First Issues for New Contributors

Welcome! If you are looking to contribute to `install-anything-skill` (`ias`), these issues are small, clearly scoped, and great entry points into the codebase.

When opening any of these on GitHub, apply the labels: `good first issue`, `help wanted`.

---

### Issue 1: Add `--version` and `-v` flag to the CLI
- **Labels**: `good first issue`, `enhancement`
- **Scope**: Currently `ias --help` prints the version in the header, but standard flags `ias --version` or `ias -v` should immediately print the version number (e.g., `2.0.0`) and exit with code 0.
- **Files to touch**:
  - `bin/install-anything`: in `runCLI()`, check if `args.includes('--version') || args.includes('-v')` and print `cli.version`.
  - `tests/test-lifecycle.js`: add a test verifying `ias --version` outputs semver.
- **Definition of Done**: Running `node bin/ias --version` prints `2.0.0` and exits 0.

---

### Issue 2: Support custom state and cache directory via `IAS_HOME` env var
- **Labels**: `good first issue`, `enhancement`
- **Scope**: By default, `ias` stores repositories in `~/.install-anything/repos/` and cache in `~/.install-anything/cache/`. In containerized environments or CI, users may want to set `IAS_HOME=/tmp/custom-ias`.
- **Files to touch**:
  - `bin/install-anything`: in `constructor()`, check `process.env.IAS_HOME || process.env.INSTALL_ANYTHING_HOME` before defaulting to `~/.install-anything`.
  - `skills/install-anything-installer/scripts/scan-repo.js`: respect the custom cache directory if provided.
- **Definition of Done**: Setting `IAS_HOME=/tmp/test-ias` causes `ias` to use `/tmp/test-ias` for state storage.

---

### Issue 3: Add `NO_COLOR` support for plain terminal and log output
- **Labels**: `good first issue`, `dx`
- **Scope**: When piped to logs or files, users should be able to disable ANSI colors and emojis by setting the industry standard `NO_COLOR=1` environment variable or `--no-color` flag.
- **Files to touch**:
  - `skills/install-anything-installer/scripts/skill-finder.js`: format terminal output without ANSI escape codes when `process.env.NO_COLOR` is present.
  - `bin/install-anything`: strip color codes if `--no-color` is supplied.
- **Definition of Done**: `NO_COLOR=1 ias find react` outputs plain ASCII text without color escapes.

---

### Issue 4: Add Bun package manager detection in README-guide parser
- **Labels**: `good first issue`, `enhancement`
- **Scope**: Many modern TypeScript/JavaScript repositories suggest `bun add <pkg>` or `bun install`. The README guide parser should recognize `bun` commands alongside `npm`, `pnpm`, and `yarn`.
- **Files to touch**:
  - `skills/install-anything-installer/scripts/readme-guide.js`: add `bun` patterns to `INSTALL_PATTERNS`.
  - `skills/install-anything-installer/scripts/adapt-install.js`: add `bun` runner.
- **Definition of Done**: Running `ias diagnose` on a repo with `bun install` in its README detects `bun` as the primary install method.

---

### Issue 5: Add shell auto-completion script for Zsh and Bash
- **Labels**: `good first issue`, `cli`
- **Scope**: Provide a shell completion script so users typing `ias <TAB>` get suggestions for `find`, `install`, `diagnose`, `list-installed`, and `uninstall`.
- **Files to touch**:
  - `scripts/completions/ias.bash`
  - `scripts/completions/ias.zsh`
  - Document setup in `README.md`.
- **Definition of Done**: Sourcing the script in Zsh/Bash provides tab completion for all `ias` subcommands.
