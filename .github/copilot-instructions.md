# Repository AI Instructions

This repository uses organization baseline instructions from:

- .github/instructions/produck/*.instructions.md

Repository-specific rules should be written in this file.
Keep organization baseline rules in the produck namespace files above.

## Repository overrides

Repository deviations from the organization baseline live in
`.github/instructions/override/`, one file per baseline file, reusing its number
and name:

- `.github/instructions/override/00-produck-base.instructions.md`
- `.github/instructions/override/10-produck-node.instructions.md`
- `.github/instructions/override/12-produck-test.instructions.md`

They are picked up by the default instruction glob, so no editor setting is
needed. Overrides list deltas only; anything not listed still follows the
baseline. Read the override whose number matches the topic before working on
tests, document layout, or repository gates.

Recommended usage:

- Add local constraints and exceptions here.
- Do not copy organization baseline content into this file.
- Keep this file focused on repository-only behavior.
