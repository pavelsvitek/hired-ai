---
name: create-draft-pr
description: Push and create a draft PR with a focused summary.
user-invocable: true
---

# Create Draft PR

Push to remote and create a draft pull request.

## Steps

1. Run `git status` to see current state
2. Run `git diff main...HEAD` to understand what changed compared to `main`
3. Run `git log main..HEAD` to see the commits to be included
4. Push branch to remote with `-u` flag (do NOT commit any new changes)
5. Create draft PR using `gh pr create --draft`

## PR Body Format

## Problem / Intent

[Why this change exists - the problem being solved or feature being added]

## Approach

[High-level concept of the solution - not a list of file changes]

## Linear

https://linear.app/pavelsvitekcom/issue/PAV-XX

Replace `PAV-XX` with the real issue id (e.g. `PAV-38`).

## Rules

- PR title must start with one of: `Feature:`, `Bug:`, `Task:`, or `Ops:`
- PR title must include the full Linear issue id in the form `PAV-38` (see team **pavelsvitek**, key `PAV`)
- PR title format: `<Type>: PAV-XX - <succinct title>`
- Example: `Feature: PAV-38 - Public job listing and apply flow`
- Extract `PAV-123` (or a `pav-123` segment) from the current branch name when present (examples: `feature/PAV-38-public-job-listing`, `feature/pav-38-short-slug`)
- If the branch has no ticket id, **ask the user once** for the `PAV-` issue (or have them run the **create-ticket** project skill in `.cursor/skills/create-ticket` to add an issue in the **hired.ai** Linear project, then use that id)
- The **## Linear** link in the body must be `https://linear.app/pavelsvitekcom/issue/PAV-XX` with the same id as in the title
- Do NOT include a summary of code changes or files modified
- Do NOT include a test plan with checkboxes
- Do NOT include "Generated with Claude Code" or similar footers
- Keep the PR description concise and focused on intent and approach
- Use HEREDOC for the PR body to preserve formatting

## Shell Execution Rules

- Both `git push` and `gh pr create` require `required_permissions: ["all"]` (not just `full_network`) to avoid TLS certificate errors in the sandbox
- Do NOT use apostrophes or single quotes in the PR body text — they break the HEREDOC inside `"$(cat <<'EOF' ... EOF)"`. Rewrite sentences to avoid them (e.g. "the user's email" → "the email of the user")
