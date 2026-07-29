---
applyTo: '**'
---

<!-- managed-by: @produck/agent-toolkit -->
<!-- source: .github/distribution/produck/20-produck-commit.instructions.md -->

# Commit Convention

Repositories in the `produck` organization use a bracketed TAG style for commit
messages.

## Format

Use this format:

- `[TAG] summary`

Multi-line commit message rule:

- Every non-empty line in the commit message must start with `[TAG]`.
- Empty lines are not allowed in commit message body.
- Do not use untagged bullet lines in commit message body.
- If body details are needed, repeat tagged lines instead of raw bullets.
- `summary` cannot appear as a standalone untagged line.

Monorepo format (required for multi-package repositories):

- Package/workspace labels appear as **section headers** followed by a colon
  (format: `package-name:` or `@scope/package:`).
- Section scope naming convention:
  - For subpackage changes, use the package `name` as section header
    (for example `@produck/agent-toolkit:`).
  - For non-subpackage or root-level changes, use `workspace:`.
  - For complex mixed commits across multiple scopes, `*:` is allowed.
- All lines under a package header belong to that package.
- Every line under a package header must start with `[TAG]`.
- No empty lines between tagged lines within a package section.
- Multiple packages follow the same pattern (each with its own header).

Example monorepo format:

```text
foo:
[FIX] race condition in auth handler
[ADD] <test>: cover edge case for concurrent login
bar:
[REFACTOR] <docs>: rewrite installation guide
```

Standalone repository format:

- Do not use package/workspace section headers.
- Write commit messages directly as `[TAG] summary`.
- All tagged lines belong to the repository globally.

Allowed tags (fixed whitelist):

- `[INIT]`
- `[ADD]`
- `[REMOVE]`
- `[FIX]`
- `[REFACTOR]`
- `[UPGRADE]`
- `[PUBLISH]`

When using this style:

- `TAG` must be uppercase and must be one of the allowed tags above.
- Summary must be in English.
- Keep summaries specific and behavior-oriented.
- Summary may include a target noun prefix to express content domain.
- Mention concrete areas when useful (route, endpoint, helper, file, test,
  constraint).
- Prefer one clear tagged change per line when writing grouped summaries.
- `[REFACTOR]` implies potentially breaking updates and should explicitly
  describe impact.
- Special rule for `[UPGRADE]`: use `[UPGRADE] deps` for pure dependency
  upgrades.
- If `[UPGRADE]` also includes IFF artifacts or IPC-related artifacts/calls, the
  summary must explicitly name the updated artifact/call.
- Special rule for `[PUBLISH]`: use `[PUBLISH]` for release and package
  publishing commits managed by lerna or similar tools. No target required.

Summary target extension (optional):

- Format: `[TAG] <target>: <summary>`
- Allowed targets (fixed whitelist):
  - `docs`: documentation content, guides, comments, and usage notes
  - `test`: test cases, fixtures, assertions, and test tooling
  - `ci`: continuous integration workflows, pipeline steps, and automation jobs
  - `deps`: dependency declarations, lockfiles, and dependency management scripts
  - `api`: externally visible interfaces, route contracts, and client/server API
    behavior
  - `schema`: data model definitions, migration schemas, and validation schema
    changes
  - `infra`: infrastructure and environment provisioning/configuration
  - `fmt`: code formatting, style, and linter configuration changes
- When target syntax is used, `target` must be one of the allowed values above.
- Target must be wrapped in angle brackets (`<target>`) to distinguish it from
  namespace-like identifiers inside summary text.
- Targets are nouns in summary context, not tags.

## Examples

- `[FIX] race conditions in createTeam/acceptInvitation/acceptRequest by
wrapping checks and writes in one transaction`
- `[FIX] <infra>: enforce node-first execution`
- `[FIX] <infra>: remove repo-local ignore for transient logs`
- `[FIX] <infra>: add policy-repo exception for local agent output`
- `[ADD] shared helper src/Web/Student/Router/Team/membership.mjs for
student-side team mutation routes`
- `[REFACTOR] remove c8 ignore on Screenshot.mjs response.ok (covered by
integration test)`
- `[INIT] initialize @tjuamt/eer-score-field-ai-kitchen debug tool`
- `[REMOVE] deprecated score-field prompt template`
- `[UPGRADE] deps`
- `[ADD] <docs>: onboarding section for monorepo mode`
- `[FIX] <test>: stabilize screenshot upload retry assertion`
- `[REFACTOR] <ci>: split lint and test jobs for faster feedback`

Monorepo examples:

```text
foo:
[FIX] a
[FIX] b
[FIX] c
```

```text
core:
[ADD] <api>: new user authentication endpoint
[REFACTOR] <test>: restructure session management tests
utils:
[UPGRADE] <deps>: update lodash to v4.17.21
[FIX] <docs>: clarify error handling in README
```

## Avoid

Avoid vague or low-signal messages such as:

- `[ADD] update things`
- `[FIX] issue`
- `[UPGRADE] dependencies` when artifact/call updates exist but are not named
- `[ADD] docs: ...` (target syntax without angle brackets)
- `[ADD] <feature>: ...` (target outside allowed whitelist)
- `[added] ...` (non-uppercase tag)
- `[CHANGED] ...` (tag outside whitelist)
- `- remove old script` (untagged body line)
- `summary without tag` (untagged standalone line)
- empty lines between tagged lines
- Monorepo mistakes:
  - `foo: [FIX] a` (package header and tag on same line)
  - `@produck/foo: [FIX] a` (package name in every tag line instead of
    section header)
  - `foo:\n\n[FIX] a` (empty line after package header)
  - `foo:` without any tagged lines below (orphaned section header)

## Validation

Use the local validator before commit:

- AI-agent-authored commits/amends:
  validation is required before both `git commit` and `git commit --amend`.
- For AI-agent-authored operations, do not create or amend a commit when
  validation fails.
- Human engineer-authored commits/amends:
  validation is recommended by default and may be enforced by
  repository-specific hooks/CI.
- Do not require retroactive rewrite/amend of historical commits solely for
  commit-message style compliance.

Commit precheck gate (AI-agent required, human recommended):

- For AI-agent-authored operations, complete repository style gates before both
  `git commit` and `git commit --amend` (for example `produck:format` and
  `produck:lint`).
- For AI-agent-authored operations, `git commit --no-verify` and
  `git commit --amend --no-verify` are forbidden.
- For human engineer-authored operations, style gates are recommended baseline
  practice unless repository-specific hooks/CI enforce them.
- Temporary non-executable state or failing tests are allowed for
  intermediate commits.
- Test/coverage pass status is not a hard blocker at commit time.
- Before merge or release, restore executable test commands and fix failing
  tests.

- `npm exec -- agent-toolkit validate-commit-msg --file <message-file>`

If validation fails, fix the message and rerun until it passes.

## Workspace Draft Files

AI agents **must not** create or organize commit message draft files (such as
`.git/COMMIT_EDITMSG` snapshots, staged-message backups, or raw draft text
files) anywhere in the working tree.

**Exception**: draft files are allowed if the filename matches the
`*.ign*` glob pattern (for example `commit-msg.ign` or
`message.draft.ignore`). This ensures the file is covered by the
organization-level `.gitignore` rules and will never be accidentally
committed.

## Notes

- Keep the summary concise and specific.
- Prefer imperative phrasing.
- This document does not restrict PR title format.
