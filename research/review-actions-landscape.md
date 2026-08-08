# Research: Existing AI-review GitHub Action landscape

**Date:** 2026-08-08

**Research question (ticket "Existing AI-review action landscape"):** What opencode-based (and comparable AI) review GitHub Actions already exist — official or community — and how do they package, where reviews land, how provider auth is handled, and what they pin to? Where is the white space for a BYOK opencode-wrapper action, and which design traps should be avoided?

**Method:** GitHub search API (`api.github.com/search/repositories`) plus README/`action.yml` inspection via raw.githubusercontent.com, and the opencode docs site.

## Sources

- OpenCode official GitHub docs: https://opencode.ai/docs/github/
- OpenCode official action `action.yml`: https://github.com/anomalyco/opencode/blob/dev/github/action.yml
- GitHub repo search results (opencode review action, 2026-08-08)
- Individual READMEs/`action.yml` of every action listed below (URLs in table)

## Notable opencode-based review actions

| Action | Stars* | Packaging | Review channel | Auth model | Pins to |
|---|---|---|---|---|---|
| **`anomalyco/opencode/github`** (official, in opencode monorepo) | — (monorepo ~195k) | composite (`github/action.yml`, runs `opencode github run`) | PR/issue comments; replies to inline review comments; can open branches/PRs | BYOK env keys (`ANTHROPIC_API_KEY`, etc.) **or** OpenCode App OIDC token exchange **or** `GITHUB_TOKEN` | **`@latest`** — opencode version resolved at runtime from releases API (unpinned); `model` input required (`provider/model`) |
| **`dceoy/opencode-action`** | 11 | composite wrapper around the official action | comments via `/oc`, `/opencode` triggers | BYOK env (`OPENCODE_API_KEY`, `OPENROUTER_API_KEY`, provider keys) + OIDC→App token (GITHUB_TOKEN fallback) | **pins itself by SHA** (`v0.6.2`); model required; opencode version not directly pinned |
| **`Barmore-Genc/opencode-pr-reviewer`** | 2 | composite (installs opencode CLI, runs `opencode run --model`) | **single comment**, edited in place as run progresses | BYOK: `model` + matching provider `*_API_KEY` env var | opencode **`opencode-version` input, default = latest** (pinning recommended in docs) |
| **`ccsert/opencode-review-gitea`** | 65 | **Docker image** (`ghcr.io/ccsert/opencode-review`, bun-based) | **Gitea/Forgejo only**: line-level comments + formal approve/request_changes | BYOK: `GITEA_TOKEN` + `DEEPSEEK_API_KEY` (default model) or Anthropic/OpenAI keys | model config (`MODEL: provider/id`, default `deepseek/deepseek-chat`); opencode install pinned by image build |
| **`Traves-Theberge/openlens`** | 6 | TypeScript CLI/lib + GitHub Action | **inline PR comments on exact lines**, resolved on fix; CI/CD + pre-commit hooks | BYOK (any opencode provider: Anthropic, OpenAI, Bedrock, Groq…) | opencode binary (installed by script); parallel agents w/ confidence scoring |
| **`jaloszek/gh-openreview`** | 0 | composite (bash, `github.action_path`) | single focused review comment; on-demand `@openreview` **gated to trusted authors** | BYOK: `opencode-api-key` (Zen) or provider env (Bedrock via OIDC); bundled free model default (data-retention caveat) | model/`cheap-model` inputs; default = bundled free model |
| **`andreasasprou/ai-review-action`** | 1 | JS action using the OpenCode SDK | inline PR comments, P0/P1/P2 severity, "live dashboard" | BYOK: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | file-classification (skip/relaxed/standard) built in; no explicit version pin documented |
| **`nilesh32236/opencode-ai-reviewer`** | 1 | TypeScript; GitHub Action **and** GitHub App (Probot) | PR review + auto-fix + codebase audit (files issues) | default model `opencode/deepseek-v4-flash-free`; BYOK for OpenAI/Anthropic/Gemini | default model = opencode free tier |
| **`pgup-ai/jbot-review-action`** | 0 | **Docker** (`docker://ghcr.io/pgup-ai/jbot-review:latest`, entrypoint node) | diff-anchored, adversarially verified findings | BYOK: **OpenCode gateway key, Poolside API key, or a coding-CLI account/subscription** (Codex, Cursor, Devin, Cline, Grok, Command Code…) | `model: provider/…`; "$0 per seat" positioning |
| **`Valaurum/opencode-pr-review-action`** | 0 | **Docker** (Node 24 + opencode, GHCR-published) | single PR comment | BYOK: `github-token` + `model` | model input (e.g. `opencode/minimax-m2.5-free`) |
| `sun-praise/opencode-actions` | 1 | reusable "install + run opencode" steps | generic agent runner | BYOK | — |
| `iswong/opencode-review-action`, `ianlintner/opencode_review_workflow`, `fintech-dl-hse/action-opencode-review`, `dianlight/opencode-actions` | 0 | placeholder/experimental | — | — | — |

\* Approx. stargazers, 2026-08-08 (GitHub search API).

## Broader competitive field (non-opencode AI reviewers)

| Product | Stars* | Notes |
|---|---|---|
| **Qodo / CodiumAI PR-Agent** — `The-PR-Agent/pr-agent` | ~12,414 | The original OSS PR reviewer (now a community-maintained legacy project of Qodo). Python, shipped as the `qodoai/pr-agent` Docker image; used as GitHub app or in-workflow action. Defaults to **hosted Qodo relay**, but **BYOK supported** via config (`config.yaml`, LiteLLM-backed). Reviews = PR comments (summary + inline), optional formal review/approve. |
| **`anthropics/claude-code-security-review`** | ~5,810 | Security-focused review action using Claude Code. **Composite**, BYOK (`claude-api-key`), posts PR comments, diff-aware. Explicitly warns it is **not hardened against prompt injection** and recommends "require approval for all external contributors". Pins `@main` (unpinned). |
| **Claude Code / OpenAI Codex GitHub Actions** (official) | n/a | Run the coding agents in CI; reviews land as comments; BYOK via env keys; can push commits/PRs. |
| **GitHub Copilot Code Review** | n/a | GitHub's official review feature; **closed service** (Copilot seat required), not an open-source action. Marketplace `copilot-code-review` is a third-party action (AllyW) using Azure AI keys — easy to confuse with the official product. |
| **CodeRabbit** | — | Closed-source GitHub **app**, hosted relay, per-review billing. |
| **Greptile** | — | Closed SaaS + actions; hosted (and BYOK on some plans). |
| `watermelontools/watermelon` | 145 | OSS "copilot for code review"; JS action, BYOK OpenAI. |
| `sturdy-dev/codeball-action` | 324 | Composite JS action; BYOK; scoring + fast-track logic. |
| `truongnh1992/gemini-ai-code-reviewer` | 253 | Composite action; Gemini API key BYOK. |
| Bito, CodeScene, deepwiki, etc. | — | Closed SaaS/agents; hosted. |

## Most relevant short profiles

**Official `anomalyco/opencode/github`** — this is the incumbent opencode action. It is a composite action inside the opencode monorepo that installs opencode at runtime via `curl -fsSL https://opencode.ai/install | bash` and runs `opencode github run`. Auth is maximally flexible: consumer's own provider env keys (BYOK), an OpenCode App OIDC token exchange (default), or plain `GITHUB_TOKEN`. Reviews land as issue/PR comments and replies to inline review comments; with `prompt` it can implement changes and open PRs. **The critical weakness: it resolves the latest opencode release at runtime and is consumed as `@latest` — fully unpinned.** It is also more of a general agent runner than a focused PR-reviewer (no structured findings, no inline anchoring beyond what the model chooses).

**`dceoy/opencode-action`** — a community fork of the official action that adds good hygiene: it pins itself by SHA, keeps the `/oc` `/opencode` trigger model, and supports BYOK for a wide provider list. Still a general agent runner, not a structured reviewer. This is the closest "safe BYOK wrapper" precedent.

**`Barmore-Genc/opencode-pr-reviewer`** — the most directly comparable product: a composite action that runs `opencode run --model <model>` against a PR diff and posts the verdict as **one self-editing comment** ("Starting review…" → verdict). It has an `opencode-version` input (default latest, docs recommend pinning), BYOK env-key auth, and workflow-level controls (auto-review events, `/oc review` re-review, `/no-bot-review` opt-out). Small (2 stars) and single-comment only — no formal review, no inline comments, no security-hardening discussed.

**`ccsert/opencode-review-gitea`** — the most popular opencode review tool (65 stars) but for **Gitea/Forgejo**, not GitHub. Docker-packaged, does line-level comments and formal approve/request_changes decisions, BYOK. Its existence proves demand for an opencode-based reviewer; GitHub is unserved at this maturity.

**`jaloszek/gh-openreview`** and **`pgup-ai/jbot-review-action`** — both push the security/trust envelope that the rest ignore: `gh-openreview` gates on-demand reviews to trusted authors, runs a "LLM pass never sees a GitHub token" design, and ships restart/skip guards; `jbot-review` accepts a coding-CLI subscription (Codex/Cursor/Cline) as the key, not just raw API keys. These are the strongest signals of where the opencode-review category is heading.

## Differentiation (white space for a BYOK opencode-wrapper action)

1. **GitHub PR review with opencode maturity, structured output.** OpenCode review today is dominated by the general official action (unpinned, agent-style) or tiny single-comment wrappers. Nobody in the opencode ecosystem matches CodeRabbit/PR-Agent's **structured, inline, resolvable review** experience. A wrapper that converts `opencode` output into **formal PR reviews + inline line comments** (not just a summary comment) is unclaimed territory among opencode actions.
2. **BYOK is now table stakes, but "bring your existing subscription" is not.** PR-Agent/CodeRabbit default to hosted relays; opencode actions are BYOK but only raw API keys. `jbot-review` shows the next rung: accept **any opencode-supported credential** (provider keys, OpenCode gateway, coding-CLI logins like Codex/Cursor/Codex subscriptions). A BYOK action that simply passes through whatever the consumer already pays for — with zero per-review markup — is the cleanest pitch, and it aligns with opencode's "any provider" model.
3. **Trusted-fork safety as a first-class feature.** Almost every competitor treats `pull_request` (not `_target`) and silently leaks tokens or reviews untrusted code. `gh-openreview` and Anthropic's action are the only ones that gate on account age/author trust. An action that does trusted-author gating, safe fork handling, and token hygiene out of the box is a real differentiator.
4. **Pin to a verified opencode version + model.** The whole ecosystem pins `@latest`/`latest` or `@main`. No opencode review action offers reproducible, tested opencode-version pinning with a verified model default. There is room to be the "supply-chain-safe" option.

## Design traps

- **Feedback spam / noise.** Single-comment edits (Barmore) reduce spam but hide signal; naive "comment every synchronize" floods PRs. Mitigate with: concurrency group keyed to the PR (`cancel-in-progress`), "update existing review, don't re-comment", dedupe/suppression rules, and confidence or severity thresholds (openlens does this; most do not).
- **Unsafe fork handling / token leakage.** Running on `pull_request` (safe token scope) vs `pull_request_target` (token with write access) is the classic footgun. CodeRabbit-class apps and naive actions with `pull-requests: write` on untrusted forks leak secrets via PR bodies (prompt injection can exfiltrate the token, since Anthropic's own action admits it is "not hardened against prompt injection"). Mitigate: only run reviews on `pull_request`, treat PR content as untrusted input, gate on trusted authors/account age (Anthropic recommends "require approval for all external contributors"), and never hand the model a token it can read/return (gh-openreview's "LLM never sees the GitHub token" pattern).
- **Unpinned dependencies.** Official action = `@latest` + runtime-resolved opencode release; Anthropic's = `@main`; Barmore/Valaurum default to latest. This breaks reproducibility and can break workflows silently. Mitigate: pin the action by SHA/tag and add an `opencode-version` input defaulting to a tested release.
- **Secret leakage in review output.** LLM reviews can echo secrets found in the diff (or hallucinated ones) into a public comment. Mitigate: redact common secret patterns before posting, and consider requiring private-repo gating for public repos.
- **Cost blowup on huge PRs.** Unbounded diffs → unbounded tokens. Most actions have no size cap. Mitigate: diff-size limits, file caps, `relaxed`/`skip` classification (ai-review-action), and chunking.
- **Model/provider lock-in.** An action that hard-codes a provider or a free-tier default (nilesh32236's `opencode/deepseek-v4-flash-free`, gh-openreview's bundled free model) creates retention/quality surprises for private code. Keep `provider/model` fully consumer-configurable.
- **Re-review / skip ergonomics.** Without an opt-out (`/no-bot-review`) or explicit re-review trigger (`/oc review`) and skip guards, bots review drafts, dependabot bumps, and WIP forever. Barmore and gh-openreview handle this; most don't.
