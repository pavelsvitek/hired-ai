# implement-ticket

Run this workflow for the Linear issue ID or identifier the user provides (for example `ENG-123`, `LIN-42`). If they omitted it, ask once for the ticket before continuing.

## Preconditions

- Linear MCP (`plugin-linear-linear`) is available. Before calling any Linear tool, read that tool’s JSON schema under the project’s MCP descriptors so arguments match the schema.
- Repository is a git checkout with `origin` pointing at the canonical remote.

## 1. Load the issue

1. Call **get_issue** with `id` set to the user’s ticket identifier (`includeRelations` optional if useful for planning).
2. From the issue, capture at least: **identifier** (e.g. `ENG-123`), **title**, **description**, **team** (name or ID — needed for statuses), labels, and any fields that help classify the work.

## 2. Classify branch prefix (`feature` vs `fix`)

Use **`fix/`** when any of these hold (case-insensitive); otherwise use **`feature/`**:

- A label suggests a bug (e.g. contains `bug`, `defect`, `regression`), or  
- The issue title/description clearly indicates fixing broken behavior rather than new capability.

If classification is ambiguous, prefer **`feature/`** and note the assumption in the plan.

## 3. Branch short description

Derive a **kebab-case** slug from the issue title:

- Lowercase, replace spaces and punctuation runs with single hyphens, strip leading/trailing hyphens, collapse repeated hyphens.  
- ASCII only; drop or transliterate symbols that are not URL/git-safe.  
- Truncate to about **40 characters** (after hyphens), without trailing hyphen.

**Branch name** (create only after user approval — see §5):

```text
<feature|fix>/<issue-identifier>-<short-slug>
```

Example: `feature/eng-123-add-export-to-csv`.

## 4. Write the plan file (first deliverable)

1. Ensure `.cursor/plans` exists under the repo root.
2. Create or overwrite:

   ` .cursor/plans/<ISSUE-IDENTIFIER-LOWERCASE>-<short-slug>.plan.md `

   Use the **full issue identifier** from Linear (e.g. `eng-123`) in lowercase before the slug so filenames stay unique and traceable. The file **must** use the **`.plan.md`** suffix.

3. The Markdown body should be implementation-ready and include, as applicable:

   - Issue link reference: identifier + title  
   - Goal and **acceptance criteria** (from description or bullets you infer; explicitly mark assumptions)  
   - **Out of scope**  
   - **Technical approach** (files/modules, APIs, data, edge cases)  
   - **Checklist** of concrete tasks  
   - **Risks / open questions**

## 5. Pause for the user (do not skip)

After saving the plan, **stop and ask** the user what they want next. Offer these options clearly:

1. **Refine** — They reply with edits; you update the same `.plan.md` until they are satisfied (no Linear or git steps yet beyond the plan file).  
2. **Approve** — They confirm the plan is final.  
3. **Build** — Same as approve, but you **also** start implementing the ticket after the post-approval steps below.

Do **not** create a branch, change Linear, or post comments until the user has chosen **Approve** or **Build**.

If they only refine, iterate on the plan file until they say **Approve** or **Build**.

## 6. After Approve or Build — git branch from `origin/main`

Run in the repo (adjust if the user’s default branch is not `main`; prefer `origin/main` as they requested):

```bash
git fetch origin main
git checkout -b '<feature|fix>/<identifier>-<short-slug>' origin/main
```

If the working tree is dirty and checkout would fail, report the situation and wait for the user to stash/commit before retrying.

## 7. After Approve or Build — Linear: comment and status

1. Read the **final** plan from `.cursor/plans/…​.plan.md` (after any refinements).

2. **save_comment** — Create a comment on the issue:

   - `issueId`: the issue identifier (e.g. `ENG-123`)  
   - `body`: Markdown. Start with a short line such as `**Implementation plan (approved)**` then paste or summarize the plan so it is readable in Linear (headings and lists are fine). If the full plan is very long, include the complete text anyway unless Linear size limits force truncation — if truncated, state that the canonical copy is in the repo path `.cursor/plans/…​.plan.md`.

3. **Set status to in progress**

   - Call **list_issue_statuses** with `team` from the issue.  
   - Pick the workflow status that represents **work started** (e.g. named “In Progress”, “Started”, or the status whose **type** is in-progress in your team’s workflow).  
   - Call **save_issue** with `id` set to the issue identifier and `state` set to the **exact** name or ID required by the MCP for that status.

4. Confirm to the user: **branch name**, **plan path**, **Linear updated** (comment + status).

## 8. If they chose Build

After §6–7, proceed with implementation on the new branch: follow the plan, keep changes scoped, and use the project’s existing patterns.

---

## Quick reference

| Step              | Action |
|-------------------|--------|
| Issue details     | `get_issue` |
| Plan file         | `.cursor/plans/<id>-<slug>.plan.md` |
| User gate         | Refine → edit plan; Approve / Build → continue |
| Branch            | `git fetch` + `git checkout -b … origin/main` |
| Linear comment    | `save_comment` |
| Linear in progress| `list_issue_statuses` + `save_issue` (`state`) |
