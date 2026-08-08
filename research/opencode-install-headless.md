# Research: How opencode installs and runs headless in CI

## Date

2026-08-08 (opencode `v1.18.15` was the latest release at research time; published 2026-08-07)

## Sources

- https://opencode.ai/docs (Intro — install section)
- https://opencode.ai/docs/cli (CLI reference)
- https://opencode.ai/docs/github (GitHub agent + prebuilt action)
- https://opencode.ai/docs/agents (built-in agents: build/plan, subagents)
- https://opencode.ai/install (raw install script, read in full)
- https://registry.npmjs.org/opencode-ai/latest (npm metadata, ver 1.18.15)
- https://registry.npmjs.org/opencode-linux-x64/latest (platform package metadata)
- https://github.com/anomalyco/opencode/releases (v1.18.15 release + asset list via API)
- https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/run.ts (source of `opencode run`)

Note: the canonical repo moved to `github.com/anomalyco/opencode`; the historical `sst/opencode` redirects there. The prebuilt GitHub Action is `anomalyco/opencode/github@latest` (not `sst/opencode/github`).

## a) Install methods and their commands

The project ships three distribution mechanisms; all yield a single self-contained `opencode` binary (Bun-compiled). Recommended install per official docs:

**1. Install script (recommended by docs):**
```
curl -fsSL https://opencode.ai/install | bash
```
- Installs to `~/.opencode/bin/opencode` and appends that dir to PATH in shell config.
- Flags: `--version <v>` (pin), `--binary <path>` (install from local binary), `--no-modify-path` (skip shell-rc edits).
- Also honors `VERSION` env var for pinning (`requested_version=${VERSION:-}`).
- GitHub Actions-aware: if `GITHUB_ACTIONS=true`, it writes the install dir to `$GITHUB_PATH`, so subsequent steps can run `opencode` directly.
- Downloads from `https://github.com/anomalyco/opencode/releases/latest/download/<file>` (latest) or `.../releases/download/vX.Y.Z/<file>` (pinned). Requires `curl` + `tar` (Linux) or `unzip` (macOS/Windows).

**2. npm package (npm registry name is `opencode-ai`, NOT `opencode`):**
```
npm install -g opencode-ai
bun install -g opencode-ai
pnpm install -g opencode-ai
yarn global add opencode-ai
```
- `opencode-ai@1.18.15` is the current version, published by GitHub Actions via OIDC (trusted publisher, MIT license).
- It is a thin shim: a `postinstall.mjs` runs at install time and pulls a platform-specific binary package. The `bin` field is `bin/opencode.exe`.
- Platform packages are declared as `optionalDependencies`: `opencode-linux-x64`, `opencode-linux-arm64`, `opencode-linux-x64-musl`, `opencode-linux-arm64-musl`, `opencode-linux-x64-baseline`, `opencode-linux-x64-baseline-musl`, `opencode-darwin-x64`, `opencode-darwin-arm64`, `opencode-darwin-x64-baseline`, `opencode-windows-x64`, `opencode-windows-arm64`, `opencode-windows-x64-baseline`. Each platform package ships the actual binary (e.g., `opencode-linux-x64@1.18.15`).
- Requires Node.js (any reasonably recent version; the CI build used Node 24, but it is not a hard requirement for consumers — the package only runs a postinstall fetch).

**3. Raw GitHub release binaries:**
- Every release attaches `opencode-<os>-<arch>.<zip|tar.gz>` CLI binaries plus desktop packages (`.deb`, `.rpm`, `.AppImage`, `.dmg`, `.exe`) and electron-builder update metadata (`latest.yml`, `latest.json`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`).
- Direct URL pattern: `https://github.com/anomalyco/opencode/releases/download/v1.18.15/opencode-linux-x64.tar.gz`.

**4. Other (less relevant to CI):** Homebrew `brew install anomalyco/tap/opencode`, Arch `pacman -S opencode` / AUR `opencode-bin`, `mise use -g github:anomalyco/opencode`, Docker `ghcr.io/anomalyco/opencode`.

## b) Architectures / platforms

- Supported OS: `linux`, `darwin`, `windows`.
- Supported archs: `x64` and `arm64` (npm metadata: `"cpu": ["arm64","x64"]`; install script normalizes `aarch64→arm64`, `x86_64→x64`).
- Two CPU tiers for x64: an AVX2 build and a `-baseline` build (for CPUs without AVX2). The install script detects this by grepping `/proc/cpuinfo` for `avx2` and appends `-baseline`.
- Linux libc variants: glibc default and `-musl` (detected via `/etc/alpine-release` or `ldd --version | grep musl`).
- Full Linux CLI asset matrix for v1.18.15: `opencode-linux-x64.tar.gz`, `opencode-linux-x64-musl.tar.gz`, `opencode-linux-x64-baseline.tar.gz`, `opencode-linux-x64-baseline-musl.tar.gz`, `opencode-linux-arm64.tar.gz`, `opencode-linux-arm64-musl.tar.gz`.
- GitHub Actions `ubuntu-latest` (x64, glibc, AVX2) maps to `opencode-linux-x64.tar.gz`; `ubuntu-24.04-arm` / arm runners map to `opencode-linux-arm64.tar.gz`.
- Install script explicitly rejects unsupported combos (e.g., `windows-arm64` is NOT in the allowed case list even though a windows-arm64 npm package exists — `windows-arm64` would fail; Windows x64 is the supported Windows target for the script).

## c) Non-interactive usage: subcommands and key flags

The CLI starts the TUI by default; the headless path is the `run` subcommand:

```
opencode run [message..]
```

Key flags for `opencode run` (verified against source, v1.18.15):
- `--model, -m <provider/model>` — select model (e.g., `anthropic/claude-sonnet-4-20250514`).
- `--agent <name>` — use a specific (primary) agent; falls back to the default agent if not found. Built-in primary agents are `build` (default, full tools) and `plan` (read/analysis only; edits and bash set to `ask`). Subagents (`general`, `explore`, `scout`, and custom ones) cannot be used here.
- `--format default|json` — `default` = human-formatted stdout; `json` = NDJSON stream of raw session events (one JSON object per line: `tool_use`, `step_start`, `step_finish`, `text`, `reasoning`, `error`, each with `type`, `timestamp`, `sessionID`). **There is no `jsonl` or `text` format value anymore** — only `default` and `json` are accepted (`choices: ["default","json"]`).
- `--variant <effort>` — provider reasoning-effort (e.g., `high`, `max`, `minimal`).
- `--thinking` — print `Thinking:` blocks for reasoning models.
- `--auto` — auto-approve permission prompts instead of auto-rejecting (auto-reject is the default non-interactive behavior).
- `--continue, -c` / `--session, -s` / `--fork` — resume/fork a session.
- `--file, -f <path>` — attach files (e.g., a diff file) to the message.
- `--command <cmd>` — run a slash command instead of a raw prompt.
- `--dir <path>` — working directory (chdir before run).
- `--attach <url>`, `--port`, `--password`, `--username` — attach to a persistent `opencode serve` instance (avoids per-run MCP cold boot).
- `--title` — session title.
- `--share` — create a share link for the session.

Global flags: `--help`, `--version`, `--print-logs`, `--log-level`, `--pure` (no external plugins).

Behavioral notes verified in `run.ts`:
- Non-interactive `run` creates the session with permission rules that **deny `question`, `plan_enter`, and `plan_exit`** — i.e., plan mode is not entered during headless `run`; use the `plan` agent (`--agent plan`) if you want plan-only behavior.
- Any `permission.asked` event that is not auto-approved is **auto-rejected** (replies `reject`), so a prompt that requires a permission decision just skips that action.
- In `default` format with a non-TTY stdout, plain text parts are written to stdout line-by-line; the process exits 0 on success and `process.exitCode = 1` on errors (a `session.error` or failed prompt sets a non-zero exit).
- Reading the prompt from stdin is supported when stdin is not a TTY (the `run` message may come from a pipe).

Also relevant: `opencode serve` runs a headless HTTP server (with `OPENCODE_SERVER_PASSWORD` basic auth) that `opencode run --attach` can reuse; `opencode models` lists available `provider/model` strings; `opencode agent list` lists agents; `opencode github run --event <mock> --token <pat>` is the GitHub-agent equivalent used inside the official action.

## d) Output formats

- `opencode run --format default`: human-readable stream; text parts echoed to stdout (non-TTY), reasoning hidden unless `--thinking`, tool calls rendered as headers.
- `opencode run --format json`: NDJSON event stream (one JSON object per line with `type`/`timestamp`/`sessionID`), suitable for machine parsing in CI. Event types observed in source: `tool_use`, `step_start`, `step_finish`, `text`, `reasoning`, `error`.
- `opencode session list --format table|json` and `opencode db --format json|tsv` exist but are not the review path.
- The official GitHub Action handles event-stream parsing internally and posts PR comments; a BYOK wrapper action would either use `--format json` and parse events, or `--format default` and capture stdout.

## e) Version pinning

- Install script: `curl -fsSL https://opencode.ai/install | bash -s -- --version 1.18.15` (or `VERSION=1.18.15`). The script validates the release tag exists (HTTP 404 check) and will skip if the same version is already installed.
- npm: pin the exact package version, e.g. `npm install -g opencode-ai@1.18.15` or `opencode-ai@1.18.15` in `package.json`. Platform packages are versioned in lockstep (all `1.18.15`).
- GitHub releases: pin the tag in the download URL: `https://github.com/anomalyco/opencode/releases/download/v1.18.15/opencode-linux-x64.tar.gz`, or pin a git tag for the source.
- Self-upgrade: `opencode upgrade [vX.Y.Z]` (optionally `--method curl|npm|pnpm|bun|brew`).
- Auto-update: opencode checks for updates automatically; `OPENCODE_DISABLE_AUTOUPDATE=true` disables the check (recommended for deterministic CI). Related env vars: `OPENCODE_DISABLE_MODELS_FETCH=true` (don't fetch model lists from models.dev at runtime).
- Action pinning precedent: the official action is used as `anomalyco/opencode/github@latest`; a BYOK action should recommend an exact version (e.g., `@v1.18.15`) and/or an opencode-version input.

## f) Open questions / uncertainties

- **npm postinstall fetch reliability in CI:** the `opencode-ai` npm shim downloads a binary at `postinstall`. In a fresh GitHub Actions runner with restricted network or npm config (`ignore-scripts`), this can silently no-op; the binary-less shim then fails at runtime. Unverified: whether postinstall falls back gracefully when the download fails. If determinism matters, the install-script or direct-release-download route may be more robust.
- **Auth in headless mode:** providers can be keyed via env vars (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) which opencode reads at startup, or via `opencode auth login` writing `~/.local/share/opencode/auth.json`. Env-var keying is the natural BYOK path; not all providers' env-var names are confirmed for this version.
- **Config injection:** `OPENCODE_CONFIG_CONTENT` (inline JSON config) and `OPENCODE_PERMISSION` (inline JSON permissions) exist and could let an action ship a reviewer agent/prompt without writing files; exact schema/version compat is unverified.
- **Exit-code semantics:** a run that completes but produces an error event, or a session.error, sets exit code 1; the precise set of error conditions is only partially confirmed from source. A CI action should treat non-zero exit and/or `error` events as review failures.
- **`--agent plan` in headless:** the plan agent is a primary agent, so `opencode run --agent plan "…"` should work headlessly; not executed to confirm output shape.
- **Windows CI:** npm package supports `windows-x64` (and `windows-arm64` binary exists) but the install script rejects `windows-arm64`; GitHub Actions `windows-latest` is x64 and fine via npm or release zip. Not relevant if the action is Linux-only.
- **Binary size / runtime:** linux-x64 binary package is ~184 MB unpacked (`unpackedSize` 183,703,818 on `opencode-linux-x64`); worth caching across runs (e.g., actions/cache) to avoid per-run download.
