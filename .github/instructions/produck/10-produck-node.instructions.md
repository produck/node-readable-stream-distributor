---
applyTo: '**'
---

<!-- managed-by: @produck/agent-toolkit -->
<!-- source: .github/distribution/produck/10-produck-node.instructions.md -->

# Node.js Baseline (Monorepo + Standalone)

## Scope

- Applies to Node.js repositories in the organization.
- Default package manager: npm.
- Default language level: modern stable Node.js for current LTS.
- Module system: ESM by default for executable/publishable Node.js packages
  (`"type": "module"` in package-level `package.json`).
- Follow the organization `.gitattributes` baseline (LF default for text files).
- Follow the organization `.editorconfig` baseline.

Required script keys:

- `produck:install`
- `test`
- `produck:coverage`
- `produck:lint`
- `publish`

Notes:

- Script key names are fixed and must match exactly.
- Keep the script key name `produck:install` (organization-reserved key).
- The required value for `produck:install` is governed by
  `agent-toolkit sync-install`; see the Monorepo mode section below for the
  canonical value.
- `publish` may be a no-op when repository-specific release workflow does not
  use npm publishing.
- Coverage governance policy:
  - Keep the script key name `produck:coverage` (organization-reserved key).
  - In monorepo mode, workspace subpackage `scripts.produck:coverage` and
    workspace `devDependencies.c8` are fully governed by organization
    baseline.
  - Source of truth for tooling versions/template:
    `.github/distribution/produck/tooling-version-baseline.json`.
  - Use central remediation command to deploy root install script baseline:
    `npm exec -- agent-toolkit sync-install --cwd .`.
  - Use central remediation command to deploy coverage scripts:
    `npm exec -- agent-toolkit sync-coverage --cwd .`.
  - Use central remediation command to deploy local anti-drift hook baseline:
    `npm exec -- agent-toolkit sync-git --cwd .`.
  - Use central remediation command to deploy root format script/config
    baseline:
    `npm exec -- agent-toolkit sync-format --cwd .`.
  - Use central remediation command to deploy root lint script/config and
    eslint integration baseline:
    `npm exec -- agent-toolkit sync-lint --cwd .`.
  - Downstream repositories must not use unversioned `npx c8` or `c8@latest`
    in shared scripts/CI.

- Testing strategy and framework are repository-defined.
- `verify` scripts are optional repository-local health checks and are not
  organization-required script keys.
- `verify` is not part of organization commit gates; style gates remain
  repository `produck:format` and `produck:lint` policy.
- `test` script implementation is repository-defined and is not overwritten by
  organization coverage remediation.
- Repositories should keep `npm run test` and `npm run produck:coverage`
  executable in steady state.
- For intermediate commits, temporary non-executable state or failing tests are
  allowed.
- Commit prechecks still require passing repository style gates (for example
  `produck:format` and `produck:lint`).

Enforcement:

- For one-step execution of all mandatory checks, use:
  `npm exec -- agent-toolkit enforce-node-baseline --cwd .`.
- `agent-toolkit validate-commit-msg` is required for AI-agent-authored
  `git commit` and `git commit --amend`.
- For human engineers, commit-message validation is recommended.
- Do not require retroactive rewrite/amend of historical commits.

Test authoring baseline:

- See [Test Authoring Baseline](12-produck-test.instructions.md) for the full
  test writing, structure, debug, and coverage workflow rules.

Script and output directory policy:

- Follow script/output placement and lifecycle policy from
  `00-produck-base.instructions.md`.
- For monorepo shared configuration and root workspace practices, follow
  `15-produck-workspace.instructions.md`.

Required ignore baseline:

- Each Node.js repository must include a root `.gitignore`.
- Baseline template and required minimum entries follow
  `00-produck-base.instructions.md`.
- Monorepo centralization policy and workspace-specific ignore guidance follow
  `15-produck-workspace.instructions.md`.

Team conventions for `.gitignore`:

- Team extension entries and placement rules follow
  `00-produck-base.instructions.md`.

## Monorepo mode

### Repository layout

- Root-level `docs/` is required.
- Each package/app should contain its own `src/` and `test/`.

### Root `package.json` governance

The root `package.json` exists only for development orchestration. It is
never consumed as a downstream dependency, so runtime-oriented fields are
prohibited.

#### Required fields

- `name` — A fixed name stabilizes the `name` field in `package-lock.json`.
- `private`: `true` — Prevents accidental npm publish.
- `workspaces` — Explicit path list only; see constraints below.
- `scripts` — See [Required scripts](#required-scripts) section below.
- `devDependencies` — The development materials manifest. Root
  `devDependencies` is the single source of truth for organization-level and
  repository-level tooling.

#### Optional fields

- `version` — Root is not published; version is meaningless.
- `description` — Root is not published; description has no practical use.
- `engines` — Not required. Leave this to Node.js version managers if
  needed.

#### Prohibited fields

The following fields must never appear in root `package.json`:

- `type`
- `main`
- `exports`
- `types`
- `files`
- `publishConfig`
- `dependencies`

#### `workspaces` field constraints

- Do not use wildcard/glob patterns (for example `packages/*`, `**`, `?`,
  `{}` or `[]`).
- List each workspace package path explicitly.

### Required scripts

Root `package.json` must define:

| Script key              | Required value                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `produck:install`       | `npm -v && npm install`                                                                           |
| `prepare`               | `husky`                                                                                           |
| `test`                  | Repository-defined (may use `--workspaces --if-present`)                                          |
| `produck:coverage`      | Organization-defined via `agent-toolkit sync-coverage`                                            |
| `produck:lint`          | Organization-defined via `agent-toolkit sync-lint`                                                |
| `produck:format`        | Organization-defined via `agent-toolkit sync-format`                                              |
| `produck:commit:check`  | `npm run produck:format && npm run produck:lint`                                                  |
| `produck:baseline`      | `npm exec --package=@produck/agent-toolkit@latest -- agent-toolkit enforce-node-baseline --cwd .` |
| `produck:publish`       | Required when `lerna.json` is present; governed by `agent-toolkit sync-publish`                   |
| `produck:publish:check` | Required when `lerna.json` is present; governed by `agent-toolkit sync-publish`                   |

Notes:

- `publish` may be defined at root or package level based on release workflow.
- Remediation commands (run from root):
  - `npm exec -- agent-toolkit sync-install --cwd .` — deploy root install script
  - `npm exec -- agent-toolkit sync-coverage --cwd .` — deploy coverage scripts
  - `npm exec -- agent-toolkit sync-git --cwd .` — deploy git hooks and deps
  - `npm exec -- agent-toolkit sync-format --cwd .` — deploy format config
  - `npm exec -- agent-toolkit sync-lint --cwd .` — deploy lint config

### Workspace `package.json` governance

#### Property restrictions

Workspace-level `package.json` must NOT contain:

- `private` — Package publication state is managed by the root workspace;
  individual workspace packages should not declare it.
- `workspaces` — Only the root `package.json` defines workspace paths.
  Nested declarations violate the centralization principle.
- Root orchestration scripts — These are the root `package.json`'s
  responsibility and must not be duplicated in workspace packages:
  `produck:install`, `produck:baseline`, `produck:commit:check`, `prepare`,
  `produck:format`, `produck:publish`, `produck:publish:check`

#### Recommended structure

Workspace packages should keep their `package.json` lean, containing only:

- Package metadata: `name`, `version`, `type`, `main`, `exports`, etc.
- Dependencies: `dependencies`, `devDependencies`
- Package-level scripts: `test`, `produck:coverage`

#### Publish metadata governance

Workspace packages that are published to npm must correctly declare the
following fields. These control the package's npm registry page appearance and
link back to the git hosting platform.

**Required fields:**

- `description` — Short summary shown on npm search results and package page.
  Must be meaningful and accurate.
- `license` — SPDX license identifier (for example `"MIT"`). Displayed on npm
  package page.

**Repository linkage fields** (affect npm "repository", "bugs", "homepage"
links):

- `repository` — Must use the expanded object form with `directory` to
  identify the subpackage location within the monorepo:
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/produck/<repo>.git",
    "directory": "packages/<name>"
  }
  ```
  The `url` value must match the repository's canonical git remote. The
  `directory` value must be the package's workspace-relative path from the
  monorepo root.
- `bugs` — Must link to the GitHub issues page:
  ```json
  "bugs": {
    "url": "https://github.com/produck/<repo>/issues"
  }
  ```
- `homepage` — Must point to the package's README on the default branch, using
  the `directory` form to navigate to the subpackage:
  ```json
  "homepage": "https://github.com/produck/<repo>/tree/main/packages/<name>#readme"
  ```

**Recommended fields:**

- `keywords` — Array of strings that describe the package. Improves npm search
  discoverability. Omit if the package has no meaningful keywords.

**Rationale:**

- Without `repository.directory`, npm links the repository field to the
  monorepo root, which is not helpful for subpackage visitors.
- Without `bugs`, npm omits the "Report issues" link on the package page.
- Without `description`, npm shows "(not yet filled)" on the package page.
- Invalid or missing `license` causes npm warnings during publish.

### Release tooling policy

- Monorepo release workflow must use `lerna`.
- `lerna` execution version is governed at organization level, not per
  repository.
- Source of truth for `lerna` version baseline:
  `.github/distribution/produck/tooling-version-baseline.json`.
- Required execution baseline: version specified in the
  `tooling-version-baseline.json`.
- Required invocation:
  `npm exec -- lerna <subcommand>`.
- Downstream repositories must not use unversioned `npx lerna` or
  `lerna@latest` in shared scripts/CI.
- For high-impact release commands, run dry-run/preview before publish.
- Keep an emergency organization-level rollback path when baseline version is
  updated.

### Ignore strategy

- Keep ignore rules centralized at repository root whenever possible.
- Add package-level `.gitignore` only when a package has unique generated
  artifacts.

## Standalone mode

Repository layout:

- Top-level `src/`, `test/`, and `docs/` are required.

Script placement:

- The repository root `package.json` must define `produck:install`, `test`,
  `produck:coverage`, `produck:lint`, and `publish`.
- Root `package.json` must define a `produck:baseline` script for organization
  baseline enforcement:
  ```json
  "produck:baseline": "npm exec --package=@produck/agent-toolkit@latest -- agent-toolkit enforce-node-baseline --cwd ."
  ```

Ignore strategy:

- Keep project-specific generated files ignored in the repository root
  `.gitignore`.

## Enforcement strategy

- This baseline is enforced by documentation first.
- CI enforcement can be added later with repository checks.

## Precedence

- Repository-specific rules may add stricter requirements.
- If repository-specific rules conflict with this document, repository owners
  should explicitly document the exception.
