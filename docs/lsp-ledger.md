# LSP / Tooling Audit Ledger

## 2026-05-16 06:24 — Drift fix applied

**Executor:** Implementer (CR 4), per approved plan `plan-full-tooling-drift-shiny-ocean.md`
**Repo:** npm-based (confirmed `package-lock.json`, no pnpm lock). User decisions: activation flag user-global, add Prettier, fix everything actionable.

### Resolved Since Last Audit

| Severity | Finding                                              | Resolution                                                                                                                                                                                                                                                                                                                               |
| -------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | `ENABLE_LSP_TOOL=1` not in `~/.claude/settings.json` | Set `.env.ENABLE_LSP_TOOL = "1"` via jq. Verified `jq -r` → `1`.                                                                                                                                                                                                                                                                         |
| High     | `ENABLE_LSP_TOOL=1` not in shell rc                  | Appended `export ENABLE_LSP_TOOL=1` to `~/.zshrc` (no prior line; no explicit disable present).                                                                                                                                                                                                                                          |
| High     | `.lsp.json` missing                                  | Created `/.lsp.json` with TS block (`npx typescript-language-server --stdio`, ts/tsx/js/jsx, stdio, 60000ms) and Rust block (`rust-analyzer`, .rs→rust, stdio).                                                                                                                                                                          |
| Medium   | `typescript-language-server` not project-local       | Added `typescript-language-server@^4.4.0` to devDependencies. `npm install` → `./node_modules/.bin/typescript-language-server --version` = 4.4.1.                                                                                                                                                                                        |
| Medium   | `tsc` not in `./node_modules/.bin`                   | Resolved by `npm install` (not a pnpm hoisting issue — repo is npm). `./node_modules/.bin/tsc --version` = 5.9.3.                                                                                                                                                                                                                        |
| Medium   | No Prettier                                          | Added `prettier@^3` + `eslint-config-prettier@^9`. Created `.prettierrc.json` (`semi:false`, `singleQuote:true`), `.prettierignore` (dist, src-tauri/target, reference). `eslintConfigPrettier` appended LAST in `extends`. Scripts `format`/`format:check` added. Ran `prettier --write .` (full-repo reformat — to be its own commit). |
| Medium   | No test framework                                    | Added `vitest@^2`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. `vite.config.ts` gained `test` block (jsdom, globals, setupFiles). Created `src/test/setup.ts`, `src/test/smoke.test.ts`. `npm test` → smoke test passes. Scripts `test`/`test:watch` added.                                                          |
| Medium   | No pre-commit gate                                   | Installed lefthook 2.1.6 via `brew`. Created `lefthook.yml` (pre-commit: eslint, tsc, prettier --check, cargo fmt --check, cargo clippy). `lefthook install` → `.git/hooks/pre-commit` executable.                                                                                                                                       |
| Low      | No Rust rustfmt/clippy config                        | Created `src-tauri/rustfmt.toml` (`edition="2021"`, `max_width=100`) and `src-tauri/clippy.toml` (`msrv="1.77.2"`, matching Cargo.toml `rust-version`).                                                                                                                                                                                  |

### Acknowledged — no action (informational)

- **Low — Biome/oxlint (TS):** Acknowledged — no action (informational). Evaluate only if lint performance becomes a concern.
- **Low — cargo-deny/cargo-machete (Rust):** Acknowledged — no action (informational). Consider for CI later.

### Known pre-existing issues surfaced (NOT caused by this work)

- `npm run lint` fails with 1 pre-existing error: `react-refresh/only-export-components` in `src/components/AgentIcon.tsx:58` (exports `hasAgentIcon` alongside a component). Verified present at HEAD before any change; Prettier reformat did not introduce it.
- `cargo clippy -- -D warnings`: ~10 pre-existing errors (e.g. `should_implement_trait`, `useless_vec` at `src/commands/agent_workspace.rs:162`). The lefthook `cargo-clippy` job was made **advisory/non-blocking** (`|| true`) per plan guidance rather than fixing unrelated Rust code.
- `cargo fmt --check`: pre-existing formatting diffs in Rust source (unformatted before rustfmt.toml added). Run `cargo fmt` to resolve in a future cleanup.

## 2026-05-16 06:14 — Audit run

**Detected languages:** TypeScript/React (Vite), Rust (Tauri)
**Auditor:** Monk (CR 3 drift scan, read-only)

### Drift Findings

| Severity | Axis                       | Language   | Finding                                                                                                                                                                                                                                        | Recommended Action                                                                                                            |
| -------- | -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| High     | Activation flag            | Both       | `ENABLE_LSP_TOOL=1` not present in `~/.claude/settings.json`                                                                                                                                                                                   | Add `"env": { "ENABLE_LSP_TOOL": "1" }` to `~/.claude/settings.json`                                                          |
| High     | Activation flag            | Both       | `ENABLE_LSP_TOOL=1` not present in `~/.zshrc` or `~/.bashrc`                                                                                                                                                                                   | Export `ENABLE_LSP_TOOL=1` in shell rc for interactive sessions                                                               |
| High     | .lsp.json config           | Both       | `.lsp.json` does not exist at project root                                                                                                                                                                                                     | Create `.lsp.json` with TS and Rust language server blocks (see note below)                                                   |
| Medium   | LSP binary (local)         | TypeScript | `typescript-language-server` not in `./node_modules/.bin/`; only available via pnpm global (`/Users/joshuarichter/Library/pnpm/nodejs/24.14.1/bin/typescript-language-server`)                                                                 | Add `typescript-language-server` to devDependencies so it resolves project-locally, or confirm global path is stable for team |
| Medium   | Type checker (local)       | TypeScript | `tsc` not in `./node_modules/.bin/`; binary resolves only via pnpm global (`/Users/joshuarichter/Library/pnpm/nodejs/24.14.1/bin/tsc`). `typescript` IS in devDependencies but pnpm hoisting skips `.bin` linkage — verify with `pnpm install` | Run `pnpm install` and recheck `./node_modules/.bin/tsc`; if still absent, check pnpm hoisting config                         |
| Medium   | Lint/format                | TypeScript | No Prettier config present (`.prettierrc*`, `prettier.config.*`) and `prettier` absent from all dependencies                                                                                                                                   | Add Prettier (or document intentional omission — ESLint handles formatting only)                                              |
| Medium   | Test framework             | TypeScript | No test framework in devDependencies (`vitest` and `jest` both absent); no test infrastructure for the TS/React layer                                                                                                                          | Add `vitest` (natural pairing with Vite) and scaffold `src/**/*.test.ts` coverage                                             |
| Medium   | Pre-commit                 | Both       | No pre-commit or lefthook config present; `.git/hooks/pre-commit` not installed                                                                                                                                                                | Add `lefthook.yml` or `.pre-commit-config.yaml` and install hook (`lefthook install` or `pre-commit install`)                 |
| Low      | Lint/format                | Rust       | No `rustfmt.toml` or `clippy.toml` at project or `src-tauri/` root                                                                                                                                                                             | Add `rustfmt.toml` and `clippy.toml` with project-standard rules                                                              |
| Low      | New canonical tools (info) | TypeScript | **Biome** (v1.9+, 2025-2026) is gaining adoption as an all-in-one ESLint+Prettier replacement with faster runtime; **oxlint** is a high-performance Rust-based linter, increasingly used alongside or replacing ESLint for large TS projects   | Evaluate Biome or oxlint if lint performance becomes a concern; no action required now                                        |
| Low      | New canonical tools (info) | Rust       | **cargo-deny** (license/dep audit) and **cargo-machete** (unused dep detection) are 2025-era canonical additions to Rust CI toolchains                                                                                                         | Consider adding to CI pipeline; no action required now                                                                        |

**Notes on .lsp.json:** When creating, the TS block should set `command` to the resolved `typescript-language-server` path (confirm whether to use global or local after resolving Medium finding above). The Rust block should point to `~/.cargo/bin/rust-analyzer` (verified present via `rustup component list --installed`).

**What is clean (no drift):**

- `typescript-language-server` present and resolvable globally via pnpm — NOT missing
- `rust-analyzer` installed via rustup (`rust-analyzer-aarch64-apple-darwin`) AND at `/Users/joshuarichter/.cargo/bin/rust-analyzer` — fully present
- `clippy` and `rustfmt` both installed via rustup — present
- ESLint v9 flat config confirmed (`eslint.config.js`, imports `@eslint/js` and `typescript-eslint`) — no legacy `.eslintrc` present
- `tsconfig.app.json` has `"strict": true` plus `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` — strong type checking configured
- `cargo test` available (`cargo 1.94.1`)
- No legacy ESLint config files present

### Resolved Since Last Audit

_(No prior audit on record — first run.)_
