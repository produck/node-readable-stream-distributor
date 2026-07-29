---
applyTo: '**'
---

<!-- managed-by: @produck/agent-toolkit -->
<!-- source: .github/distribution/produck/00-produck-base.instructions.md -->

# AI Collaboration

This document defines a lightweight AI collaboration baseline for repositories
in the `produck` organization.

## Goals

- Improve consistency when using AI tools across repositories
- Keep the baseline lightweight and easy to adopt
- Let repositories add stricter or more specific instructions when needed

## Instruction source split

Path semantics differ between the upstream policy repository and downstream
repositories:

- Upstream policy repository (this `produck/.github` repo):
  - `.github/distribution/produck/*.instructions.md` — canonical baseline,
    distributed to downstream repositories.
  - `.github/instructions/produck/*.instructions.md` — reserved for
    organization-only governance that should NOT be distributed.
- Downstream repositories (consumers of the baseline):
  - `.github/instructions/produck/*.instructions.md` — synced copy of the
    upstream canonical baseline (managed by `agent-toolkit sync-instructions`).
  - `.github/copilot-instructions.md` — repository-specific exceptions and
    stricter local constraints.

Editing rule:

- Update downstream baseline rules directly in
  `.github/distribution/produck/*.instructions.md`.
- For internal-only governance (this repo only, not distributed), add files
  under `.github/instructions/produck/`.

## Default expectations

- Default to Chinese for explanations and discussion unless the repository or
  request requires another language.
- Prefer existing repository patterns over introducing new abstractions or
  frameworks.
- Do not invent APIs, packages, configuration keys, commands, environment
  variables, or files.
- Do not add new dependencies unless necessary and explicitly justified.
- When changing behavior, add or update tests when practical.
- Treat authentication, authorization, secrets, infrastructure, and production
  configuration as high-risk areas that require human review.
- Repositories should include a root `.gitattributes` to normalize line endings
  safely across platforms.

## Git attributes conventions

- All repositories should include a root `.gitattributes`.
- Default text line ending policy is LF.
- Recommended minimum template:

```gitattributes
* text=auto eol=lf

# Windows script entrypoints
*.bat text eol=crlf
*.cmd text eol=crlf
```

- Repository-specific exceptions are allowed but must be documented in
  repository instructions.

## EditorConfig conventions

- All repositories should include a root `.editorconfig`.
- Recommended organization baseline:

```editorconfig
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.{yml,yaml}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
max_line_length = 80
```

- Repository-specific exceptions are allowed but must be documented in
  repository instructions.
- Organization-wide requirement: all Markdown files should keep each line at 80
  characters or fewer.

### EditorConfig quick rule

- Default action: directly copy the `.editorconfig` sample in this document.
- If target repository has no root `.editorconfig`, create one from this sample
  without modification.
- If target repository already has a root `.editorconfig`, do not replace the
  whole file; add only missing required keys from this sample.
- Repository-documented exceptions override this sample.
- If an exception applies, keep the exception and record it in change notes.
- Do not include unrelated formatting-only changes in the same commit.

## ESLint conventions

- Repository owners generate `eslint.config.mjs` first (for example via
  framework scaffolding or ESLint official initialization flow).
- AI must not replace the existing config wholesale; it should only check the
  current config and add missing `@produck/eslint-rules` integration.
- `@produck/eslint-rules` is the organization-wide style consensus and should
  be present in repository lint configuration.
- Apply minimal patching only: keep existing repository/framework structure and
  add the smallest necessary changes.
- Repository-specific overrides are optional and should be added only when
  behavior intentionally differs from shared presets.
- In ESLint flat config, "layer on top" means local override items must appear
  after shared preset items in exported order.
- No-op overrides that repeat inherited values should be avoided.

## Language conventions

- Explanations, discussion, and review communication default to Chinese unless
  the repository or request requires another language.
- Commit messages keep the bracketed format and use English summaries.
- PR descriptions and issue comments may use Chinese or English, but keep one
  language per section and keep terminology consistent.
- Code identifiers, filenames, and existing public API names should follow
  existing repository conventions; do not translate existing symbols.
- User-facing copy should follow the target product locale of the
  repository/module.

## Commit and PR conventions

- Commit and commit-precheck rules are defined in
  `.github/distribution/produck/20-produck-commit.instructions.md`.
- Use commit message validator before commit and amend:
  `npm exec -- agent-toolkit validate-commit-msg --file <message-file>`.
- Do not redefine commit tag, target, or monorepo section rules outside
  `20-produck-commit.instructions.md`.
- PR title format is repository-defined (no organization-level restriction).
- PR descriptions should summarize what changed, why, validation, and known
  risks or follow-up work.

## Terminal long-output protocol

When a command may produce large output (for example 10k+ lines), use a
two-phase flow instead of shell pipelines like `| grep` or `| tail`.

Node-first policy:

- MUST use Node scripts first for output processing, file processing, path
  checks, and multi-step command orchestration.
- MAY use direct shell commands only for short, read-only, atomic checks (for
  example status/list/current-directory checks).
- MUST avoid shell pipelines and stream redirection for long-output tasks.

- Phase 1 (capture): run command and write full output to a file first.
- Phase 2 (analyze): run a separate step to filter/summarize that file.

Recommended three-step flow:

1. Preflight: verify required files/paths and create output directories.
2. Capture: execute command and persist full output.
3. Analyze: summarize or filter captured output.

Recommended local tools:

- `npm exec -- agent-toolkit preflight --cwd . --require package.json --ensure-dir logs`
- `npm exec -- agent-toolkit run-capture --out logs/run.log --cmd "<command>"`
- `npm exec -- agent-toolkit summarize-log --file logs/run.log --last 120`
- `npm exec -- agent-toolkit summarize-log --file logs/run.log --match "FAIL|ERROR"`

Guardrails:

- Always create output directories before capture.
- Do not append fragile post-pipelines to the capture command.
- If filtering fails, keep the captured raw log as the source of truth.

Script placement and lifecycle policy:

- Reusable repository scripts MUST be stored in `scripts/`.
- Runtime outputs (logs, reports, captures) MUST be stored in `logs/` or
  repository-defined output directories and ignored by git.
- For organization-level policy repositories (for example this `.github`
  repository), do not add runtime-output `.gitignore` only for local agent
  execution; use session memory paths or local temp locations instead.
- Temporary diagnostic scripts MUST NOT be committed and MUST use session
  memory workspace paths when available.
- Do not place ad-hoc execution scripts in `.git/`, `.github/`, or random root
  paths.
- `.github/` is reserved for GitHub platform config (workflows, templates,
  issue forms), not for temporary run scripts.

## Organization-level AI instruction scope

This repository is the policy source for organization-wide AI instructions.

What works across repositories:

- Organization-level AI instruction text can guide agent behavior in all
  repositories when configured at organization settings.
- Rules in `.github/distribution/produck/` are the downstream-sync source.
- Repository-specific rules may still add stricter constraints.

What does not work automatically:

- Scripts stored in this repository are not auto-mounted into other
  repositories.
- Agents in another repository cannot assume local file paths from this
  repository exist.
- Cross-repository script execution requires an explicit bridge mechanism.

### Manual instruction distribution workflow

When CI enforcement is deferred, use manual sync per repository:

1. Sync organization downstream source
   `.github/distribution/produck/*.instructions.md` into target repository
   `.github/instructions/produck/`.
2. Keep repository-specific exceptions in `.github/copilot-instructions.md`.
3. Validate critical policies manually in each update cycle.
4. After instruction sync, validate duplicated policy sections remain
   consistent across instruction files, especially commit tag and target
   whitelists.

Recommended command:

- `npm exec -- agent-toolkit sync-instructions --cwd . --source <path-to-org>/.github/distribution/produck --force --prune`

If the installed package includes bundled assets, `--source` can be omitted to
use those built-in assets.

This keeps instruction entrypoints aligned without requiring submodule or
automatic PR rollout.

### Central package execution policy

When bridge mechanism uses a central npm package, the package is installed
locally in downstream repositories at a fixed version managed by the
organization baseline.

- Local install and pinned version are deployed by
  `agent-toolkit sync-git` (root devDependency pinning) and
  `agent-toolkit sync-install` (root install script baseline).
- Invocation uses the locally installed copy:
  `npm exec -- <bin> ...`.
- Do not use `npm exec --package=<pkg>@latest` for routine invocations.

Local implementation reference in this repository:

- `packages/agent-toolkit` stores the central CLI bridge package source.
- `packages/eslint-rules` stores the shared ESLint rule presets.
- This local path is the implementation source, not an automatic runtime mount
  for other repositories.

Required safeguards for central tooling:

- Print resolved package version before running high-impact commands.
- For high-risk operations, run dry-run/preview first, then execute.
- Keep an emergency fallback path to a pinned version for incident mitigation.
- Prefer `npm exec -- <bin> ...` for predictable invocation.

Version observability (required before high-impact operations):

- `npm view @produck/agent-toolkit version`
- Record the observed version in task notes or PR description.

Post-release synchronization (required):

- Push release commit: `git push`
- Push release tag: `git push --tags`

Rollback runbook (minimum):

- Confirm latest published version:
  `npm view @produck/agent-toolkit version`
- If rollback is needed, bump from current source and republish a fixed version.
- Do not republish an already-used version number.
- Push corresponding commit and tags after rollback publish.

### Recommended organization AI instruction template

When authoring organization-level AI instruction text (for example in
organization settings), reference the canonical sources in this baseline
instead of duplicating their content:

- Language and default expectations: see `Default expectations` and
  `Language conventions` sections above.
- Node-first execution policy: see `Terminal long-output protocol` above.
- Central package policy: see `Central package execution policy` above.
- Commit message policy: see
  [Commit Convention](20-produck-commit.instructions.md) (canonical source
  for tag whitelist, target whitelist, and validator usage).
- Cross-repository assumptions: do not assume scripts from the organization
  `.github` repository exist in target repositories.
- Precedence: repository-specific stricter rules override organization
  defaults.

## Precedence

If a repository provides more specific instructions, follow the repository
instructions over this organization baseline.

For Node.js repositories, also follow [Node.js Initialization
Baseline](10-produck-node.instructions.md) and [Test Authoring
Baseline](12-produck-test.instructions.md).
