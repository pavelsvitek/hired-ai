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

## Rules

- PR title must start with one of: `Feature:`, `Bug:`, `Task:`, or `Ops:`
- PR title must include the full ticket number in this format: `MAI-68`
- PR title format must be: `<Type>: <Ticket> - <succinct title>`
- Example PR title: `Feature: MAI-68 - Instant project creation`
- Extract the ticket number from the current branch name when possible (example: `feature/MAI-68-instant-project-creation`)
- If the branch name does not contain a ticket number, ask the user for the ticket number before creating the PR
- Include the Linear link in the PR body using this fixed base URL plus the extracted ticket number: `https://themandai.atlassian.net/browse/MAI-68`
- Do NOT include a summary of code changes or files modified
- Do NOT include a test plan with checkboxes
- Do NOT include "Generated with Claude Code" or similar footers
- Keep the PR description concise and focused on intent and approach
- Use HEREDOC for the PR body to preserve formatting

## Shell Execution Rules

- Both `git push` and `gh pr create` require `required_permissions: ["all"]` (not just `full_network`) to avoid TLS certificate errors in the sandbox
- Do NOT use apostrophes or single quotes in the PR body text — they break the HEREDOC inside `"$(cat <<'EOF' ... EOF)"`. Rewrite sentences to avoid them (e.g. "the user's email" → "the email of the user")
