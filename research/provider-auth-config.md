# Research: Provider auth env vars and config for the opencode CLI

**Date:** 2026-08-08

**Ticket:** Provider auth env vars and config for opencode CLI

## Question

For every provider the opencode CLI supports, what env var or auth method is used, and which
work without an interactive login (pure env-var pass-through, which is what a headless CI
action needs)? Produce the mapping: GitHub Action secret -> opencode env var.

## Headline findings

1. **Pure env-var pass-through works for ~all API-key providers.** opencode's provider
   loading code reads each provider's documented env vars straight out of `process.env` at
   startup. No `opencode auth login` or `/connect` is required for any API-key provider —
   that command only writes the same key into `~/.local/share/opencode/auth.json`. The
   official `anomalyco/opencode/github` GitHub Action itself passes keys purely as env vars
   (e.g. `env: ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`) and runs `opencode
   github run` with zero interactive auth. A BYO-key action can do the same via
   `opencode run`.

2. **The authoritative env-var names come from models.dev.** opencode's provider catalog is
   built from https://models.dev/api.json — each provider entry carries an `env` array of
   env var names. opencode's `packages/opencode/src/provider/provider.ts` loads a provider
   if **any** of its listed env vars is set; if the provider lists exactly one env var, its
   value becomes the API key passed to the AI SDK. Multi-env-var providers still work purely
   via env vars because the underlying AI SDK package reads them from `process.env` itself.

3. **Only subscription/OAuth login flows need interactivity** (and none of them are usable
   by a headless CI without a key anyway): Anthropic Claude Pro/Max, OpenAI ChatGPT
   Plus/Pro, and GitHub App/OIDC token exchange. Every one of these has an env-var
   alternative for real API keys / PATs.

4. **`OPENCODE_AUTH_CONTENT` env var can inject the whole auth.json content** — an escape
   hatch if an action ever needs to seed credentials exactly as `/connect` would, headlessly.

5. **`OPENCODE_CONFIG_CONTENT` env var can inject inline JSON config** — the cleanest way
   for a headless action to set `model`, `provider` options, `baseURL`, `disabled_providers`,
   `enabled_providers`, etc., without writing a config file.

6. **Model selection is `provider/model`.** Config key `"model": "anthropic/claude-sonnet-4-5"`,
   CLI flag `opencode run --model provider/model`, or `-m`. Same format everywhere
   (GitHub action input `model`, `MODEL` env in the official action, `opencode github run`).

7. **The AI SDK env-var conventions are identical to models.dev.** `ANTHROPIC_API_KEY`,
   `OPENAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, etc., all match
   the industry-standard names. Secrets can be mapped 1:1 into GitHub Actions secrets.

## Sources

- opencode docs — Providers: https://opencode.ai/docs/providers
- opencode docs — Config: https://opencode.ai/docs/config
- opencode docs — CLI (auth, run, models, env vars): https://opencode.ai/docs/cli
- opencode docs — GitHub action: https://opencode.ai/docs/github
- models.dev API (source of truth for provider/env metadata, 181 providers): https://models.dev/api.json
- opencode source — provider loading & credential resolution: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/provider.ts
- opencode source — auth store: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/auth/index.ts
- opencode source — env service: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/env/index.ts
- opencode source — official GitHub action: https://github.com/anomalyco/opencode/blob/dev/github/action.yml and `packages/opencode/src/cli/cmd/github.handler.ts`
- opencode source — provider plugins (special-case providers): https://github.com/anomalyco/opencode/tree/dev/packages/core/src/plugin/provider

## Env-var mapping: GitHub Action secret -> opencode env var

The `env` values below are read directly from models.dev/api.json (fetched 2026-08-08). They
are the exact names opencode checks. The action secret name should match the env var name so
the workflow can be `env: <VAR>: ${{ secrets.<VAR> }}`.

### Primary / most-common providers

| Provider (config key / id) | opencode env var(s) | Auth method | Headless? |
|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | API key | Yes (env var). The Claude Pro/Max OAuth flow is interactive-only, but that is not a key path. |
| OpenAI | `OPENAI_API_KEY` | API key | Yes (env var). ChatGPT Plus/Pro OAuth flow is interactive-only. |
| Google / Gemini | `GOOGLE_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` | API key (any of the three; SDK prefers `GOOGLE_GENERATIVE_AI_API_KEY`) | Yes |
| OpenRouter | `OPENROUTER_API_KEY` | API key | Yes |
| Groq | `GROQ_API_KEY` | API key | Yes |
| Mistral | `MISTRAL_API_KEY` | API key | Yes |
| Azure OpenAI | `AZURE_RESOURCE_NAME` + `AZURE_API_KEY` | API key + resource name (SDK builds `https://RESOURCE.openai.azure.com/`) | Yes (set both). Config alternative: `provider.azure.options.resourceName`. |
| Azure Cognitive Services | `AZURE_COGNITIVE_SERVICES_RESOURCE_NAME` + `AZURE_COGNITIVE_SERVICES_API_KEY` | API key + resource name | Yes |
| Ollama (local) | none (local) | None — custom/local provider, `baseURL: http://localhost:11434/v1` | Yes — no key needed; requires config with `npm: @ai-sdk/openai-compatible` |
| xAI | `XAI_API_KEY` | API key | Yes |
| DeepSeek | `DEEPSEEK_API_KEY` | API key (OpenAI-compatible) | Yes |
| Together AI | `TOGETHER_API_KEY` | API key | Yes |
| Cerebras | `CEREBRAS_API_KEY` | API key | Yes |
| Fireworks AI | `FIREWORKS_API_KEY` | API key (OpenAI-compatible) | Yes |
| Hugging Face | `HF_TOKEN` | Token (OpenAI-compatible router) | Yes |
| Cohere | `COHERE_API_KEY` | API key | Yes |
| Perplexity | `PERPLEXITY_API_KEY` | API key | Yes |
| NVIDIA | `NVIDIA_API_KEY` | API key | Yes |
| Amazon Bedrock | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`, or `AWS_PROFILE`, or `AWS_BEARER_TOKEN_BEDROCK` | AWS credential chain / bearer token | Yes (also supports OIDC via `AWS_WEB_IDENTITY_TOKEN_FILE`/`AWS_ROLE_ARN`). Env vars override config; bearer token wins over credential chain. |
| Google Vertex AI | `GOOGLE_VERTEX_PROJECT` (+ optional `GOOGLE_VERTEX_LOCATION`) + `GOOGLE_APPLICATION_CREDENTIALS` (path to service-account JSON) | GCP service account | Yes. Fallback project envs also accepted: `GOOGLE_CLOUD_PROJECT`, `GCP_PROJECT`, `GCLOUD_PROJECT`. |
| OpenCode Zen / Go | `OPENCODE_API_KEY` | API key from opencode.ai/auth | Yes |
| GitHub Copilot | `GITHUB_TOKEN` | GitHub token (uses subscription) | Yes — token env var (OAuth device flow is interactive-only) |
| GitLab Duo | `GITLAB_TOKEN` (+ optional `GITLAB_INSTANCE_URL`, `GITLAB_AI_GATEWAY_URL`, `GITLAB_OAUTH_CLIENT_ID`) | PAT / OAuth | Yes via PAT (`GITLAB_TOKEN`). OAuth is interactive. |
| Cloudflare Workers AI | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_KEY` | Account ID + token | Yes |
| Cloudflare AI Gateway | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_GATEWAY_ID` + `CLOUDFLARE_API_TOKEN` | Account ID + gateway ID + token | Yes |
| DigitalOcean | `DIGITALOCEAN_ACCESS_TOKEN` | Model access key / token | Yes (OAuth optional, interactive) |
| Databricks | `DATABRICKS_HOST` + `DATABRICKS_TOKEN` | Token | Yes |
| Snowflake Cortex | `SNOWFLAKE_ACCOUNT` + `SNOWFLAKE_CORTEX_PAT` | PAT | Yes |
| SAP AI Core | `AICORE_SERVICE_KEY` (+ optional `AICORE_DEPLOYMENT_ID`, `AICORE_RESOURCE_GROUP`) | Service key (JSON string) | Yes |
| Modal | `MODAL_PROXY_TOKEN` | Combined `wk-<id>.ws-<secret>` token | Yes |
| MiniMax | `MINIMAX_API_KEY` | API key | Yes |
| Moonshot AI / Kimi | `MOONSHOT_API_KEY` | API key | Yes |
| Alibaba (Qwen) | `DASHSCOPE_API_KEY` | API key | Yes |
| Deep Infra | `DEEPINFRA_API_KEY` | API key | Yes |
| BaseTen | `BASETEN_API_KEY` | API key | Yes |
| Abacus | `ABACUS_API_KEY` | API key | Yes |
| 302.AI | `302AI_API_KEY` | API key | Yes |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | API key | Yes |
| LM Studio / llama.cpp / Atomic Chat | none (local) | Local OpenAI-compatible servers, no key; configured via `provider.*` with `npm: @ai-sdk/openai-compatible` + `baseURL` | Yes — local only, not relevant to CI |

### Full catalog

models.dev currently lists **181 providers**. The complete, machine-readable env-var mapping
is at https://models.dev/api.json (each provider entry has an `env` array). Notable additional
env var names from the catalog (single-key providers):

```
ZHIPU_API_KEY, LUCIDQUERY_API_KEY, ANYAPI_API_KEY, IMPOSSIBL_API_KEY, BLUECLAW_API_KEY,
TENCENT_TOKENHUB_API_KEY, GREENPT_API_KEY, WANDB_API_KEY, CROSSMODEL_API_KEY, LLMTR_API_KEY,
CLAUDINIO_API_KEY, COHERE_API_KEY, BASETEN_API_KEY, NVIDIA_API_KEY, NEBIUS_API_KEY,
VIVGRID_API_KEY, TINKER_API_KEY, LILAC_API_KEY, STEPFUN_API_KEY, NANO_GPT_API_KEY,
FASTROUTER_API_KEY, NEARAI_API_KEY, DAOXE_API_KEY, CROF_API_KEY, QVAC_API_KEY, ABLIT_KEY,
ALIBABA_CODING_PLAN_API_KEY, LLMGATEWAY_API_KEY, KENARI_API_KEY, FRIENDLI_TOKEN,
SAKANA_API_KEY, TRUSTEDROUTER_API_KEY, SALAD_CLOUD_API_KEY, ATOMIC_CHAT_API_KEY,
INCEPTION_API_KEY, MODELSCOPE_API_KEY, HELICONE_API_KEY, SUBMODEL_INSTAGEN_ACCESS_KEY,
INFOMANIAK_API_KEY, AMBIENT_API_KEY, DINFERENCE_API_KEY, PRIVATEMODE_API_KEY, UNOROUTER_API_KEY,
FROGBOT_API_KEY, THEGRID_API_KEY, UPSTAGE_API_KEY, CLINE_API_KEY, REGOLO_API_KEY, AIAND_API_KEY,
PIONEER_API_KEY, SILICONFLOW_API_KEY, AI_ROUTER_API_KEY, ZENMUX_API_KEY, INFERENCE_API_KEY,
EVROC_API_KEY, INCEPTRON_API_KEY, EMPIRIOLABS_API_KEY, ALIBABA_TOKEN_PLAN_API_KEY,
META_MODEL_API_KEY, WAFER_API_KEY, CLARIFAI_PAT, IFLOW_API_KEY, BAILING_API_TOKEN,
VENICE_API_KEY, MIXLAYER_API_KEY, SCALEWAY_API_KEY, MODEL_ORACLE_API_KEY, DRUN_API_KEY,
LMSTUDIO_API_KEY, OVHCLOUD_API_KEY, ZELDOC_API_KEY, AURIKO_API_KEY, KUAE_API_KEY,
QIHANG_API_KEY, BERGET_API_KEY, MOARK_API_KEY, NOVA_API_KEY, VULTR_API_KEY,
IOINTELLIGENCE_API_KEY, NEURALWATT_API_KEY, AKI_IO_API_KEY, HETZNER_API_KEY,
ZENIFRA_AI_KEY, AIHUBMIX_API_KEY, MORPH_API_KEY, UMANS_AI_API_KEY, OFOX_API_KEY,
ORCAROUTER_API_KEY, XIAOMI_API_KEY, V0_API_KEY, POOLSIDE_API_KEY, ROUTING_RUN_API_KEY,
TENCENT_TOKEN_PLAN_API_KEY, SYNTHETIC_API_KEY, GMICLOUD_API_KEY, FREEMODEL_API_KEY,
MINIMAX_API_KEY, KIMI_API_KEY, REQUESTY_API_KEY, TENSORX_API_KEY, LLAMA_API_KEY,
KILO_API_KEY, MERGE_GATEWAY_API_KEY, SCX_API_KEY, CLOUDFERRO_SHERLOCK_API_KEY,
MODELIS_API_KEY, SUBCONSCIOUS_API_KEY, TENCENT_CODING_PLAN_API_KEY, HYPER_API_KEY,
NOVITA_API_KEY, TINFOIL_API_KEY, STACKIT_API_KEY, LYNKR_API_KEY,
CHUTES_API_KEY, QINIU_API_KEY, LONGCAT_API_KEY, JIEKOU_API_KEY, XPERSONA_API_KEY,
SARVAM_API_KEY, INFERX_API_KEY, MEGANOVA_API_KEY, CORTECS_API_KEY, HPC_AI_API_KEY, EBCLOUD_API_KEY
```

Multi-env-var providers in the catalog: `google` (3), `azure` (2), `azure-cognitive-services`
(2), `amazon-bedrock` (4), `google-vertex` (3), `google-vertex-anthropic` (3),
`cloudflare-workers-ai` (2), `cloudflare-ai-gateway` (3), `gitlab` (1 + optional),
`snowflake-cortex` (2), `sap-ai-core` (1 + optional), `databricks` (2), `modal` (1),
`infomaniak` (2), `privatemode-ai` (2), `neon` (2).

## How provider selection / configuration works

### Config file (`opencode.json` / `.jsonc`)

Locations, in precedence order (later wins): remote `.well-known/opencode` -> global
`~/.config/opencode/opencode.json` -> `OPENCODE_CONFIG` env (custom file) -> project
`opencode.json` -> `.opencode/` dirs -> `OPENCODE_CONFIG_CONTENT` env (inline) -> managed.

Key schema:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",           // default model, provider/model
  "small_model": "anthropic/claude-haiku-4-5",       // cheap model for titles etc.
  "provider": {
    "anthropic": {
      "options": { "apiKey": "{env:ANTHROPIC_API_KEY}", "baseURL": "..." },
      "models": { "my-model": { "id": "claude-x", "name": "My Claude" } },
      "blacklist": ["..."],                          // hide models
      "whitelist": ["..."]                           // only show these
    }
  },
  "disabled_providers": ["openai"],
  "enabled_providers": ["anthropic"],
  "default_agent": "build"
}
```

- Provider ids are the models.dev keys (e.g. `anthropic`, `openai`, `google`, `azure`,
  `openrouter`, `groq`, `mistral`, `amazon-bedrock`, `google-vertex`, `ollama`, `lmstudio`,
  `github-copilot`, `gitlab`, ...).
- Custom/self-hosted providers are declared in the same `provider` block with
  `"npm": "@ai-sdk/openai-compatible"`, `"options": { "baseURL": ... }`, and a `models` map.
- `{env:VAR}` and `{file:path}` substitution is supported inside config values.
- Env vars can also be used for the config itself: `OPENCODE_CONFIG` (file path),
  `OPENCODE_CONFIG_CONTENT` (inline JSON), `OPENCODE_CONFIG_DIR` (directory), plus
  `OPENCODE_TUI_CONFIG`.

### How the default provider/model is chosen

1. `model` key in config (explicit) — parsed as `provider/model`.
2. Otherwise, the most recent model used (from `model.json` state file), if still available.
3. Otherwise, the first available provider whose models are loaded (respecting
   `enabled_providers`/`disabled_providers`), picking the top model by opencode's sort
   priority (prefers ids containing `gpt-5`, `claude-sonnet-4`, `big-pickle`,
   `gemini-3-pro`, then newest `...latest`, then lexicographic).

So a headless action should always pass an explicit model (`--model provider/model` or
config `model`), never rely on implicit defaults.

### `opencode auth` (interactive login)

- `opencode auth login` (alias of `/connect`) stores credentials in
  `~/.local/share/opencode/auth.json`. Flags: `--provider/-p <id>`, `--method/-m <label>`.
  It can be scripted for API-key providers (paste key), but is NOT required when env vars are
  set.
- `opencode auth list`, `opencode auth logout`.
- Credential precedence in opencode's loader:
  1. config `provider.<id>.options.apiKey` (explicit)
  2. env var(s) from models.dev `env` array (`source: "env"`)
  3. auth.json API-key entries (`source: "api"`)
  4. OAuth/plugin flows (interactive)
  The key is then injected as `options.apiKey` into the AI SDK factory call.

### Headless-safe env vars for the action itself

| Env var | Purpose |
|---|---|
| `OPENCODE_CONFIG_CONTENT` | Inject full JSON config inline (best way to set `model`/`provider` without files) |
| `OPENCODE_CONFIG` | Path to a config file |
| `OPENCODE_CONFIG_DIR` | Custom config directory |
| `OPENCODE_AUTH_CONTENT` | Inject full `auth.json` JSON content inline (seed creds headlessly) |
| `OPENCODE_MODELS_URL` | Custom models.dev URL (can point at a pinned mirror) |
| `OPENCODE_DISABLE_AUTOUPDATE` | Disable update checks in CI |
| `OPENCODE_SERVER_PASSWORD` / `OPENCODE_SERVER_USERNAME` | Basic auth for `serve`/`web` (not needed for `run`) |

## Providers that require interactive login (NOT headless-compatible)

| Provider | Interactive-only method | Headless alternative |
|---|---|---|
| Anthropic Claude Pro/Max subscription | OAuth device flow (`/connect`) | None for subscription. Use `ANTHROPIC_API_KEY` for API billing. |
| OpenAI ChatGPT Plus/Pro | OAuth device flow (`/connect`) | None for subscription. Use `OPENAI_API_KEY` for API billing. |
| GitHub Copilot | OAuth device flow | `GITHUB_TOKEN` env var (uses Copilot subscription) |
| GitLab Duo | OAuth | `GITLAB_TOKEN` PAT |
| DigitalOcean | OAuth (router discovery) | `DIGITALOCEAN_ACCESS_TOKEN` (note: manual key doesn't auto-discover inference routers) |
| OpenCode GitHub App token exchange | OIDC -> app token exchange (only in the official `opencode github run` flow) | Not applicable — our action uses `opencode run`, not the app |

For the BYO-key reviewer action this means: **every provider in the ticket's scope
(Anthropic, OpenAI, Google/Gemini, OpenRouter, Groq, Mistral, Azure OpenAI) plus essentially
all of models.dev's catalog works via pure env-var pass-through.** Interactive login is only
ever needed for subscription/OAuth features.

## Open questions / uncertainties

1. **`azure` key flow in CI.** Confirmed from source that `azure` reads `AZURE_RESOURCE_NAME`
   and the SDK reads `AZURE_API_KEY`. The model id in `provider/model` for Azure must match the
   deployment name. Worth a live test, since Azure deployment/model naming is the most
   fiddly part.
2. **Google env-var precedence.** models.dev lists three google env vars; the `@ai-sdk/google`
   factory reads `GOOGLE_GENERATIVE_AI_API_KEY` (falling back to `GOOGLE_API_KEY`/`GEMINI_API_KEY`).
   Recommend standardizing on `GOOGLE_GENERATIVE_AI_API_KEY`.
3. **models.dev is the live source.** Provider list (181) and env names change as providers
   are added. The action should not hardcode the whole catalog; either read
   https://models.dev/api.json at build/docs time, or expose a `OPENCODE_MODELS_URL` escape
   hatch. A pinned snapshot is prudent for reproducibility.
4. **`.env` files.** opencode (Bun) auto-loads `.env` in the working dir, so repo-level `.env`
   files also work — but for CI, GitHub Actions secrets + `env:` is the supported path.
5. **`opencode run` exit codes / headless output.** Not part of this ticket, but the action
   must pass a prompt and read stdout. `opencode run "..." --format json` emits raw JSON events;
   `--model provider/model` selects the model; `--agent` selects the agent; `--auto` auto-approves
   permissions. (Not verified here; separate ticket.)
