# implement-ticket

Run this workflow for the Linear issue ID or identifier the user provides (for example `PAV-123`, `LIN-42`). If they omitted it, ask once for the ticket before continuing.

## Preconditions

- Linear MCP (`plugin-linear-linear`) is available. Before calling any Linear tool, read that tool’s JSON schema under the project’s MCP descriptors so arguments match the schema.
- Repository is a git checkout with `origin` pointing at the canonical remote.

## 1. Load the issue

1. Call **get_issue** with `id` set to the user’s ticket identifier (`includeRelations` optional if useful for planning).
2. From the issue, capture at least: **identifier** (e.g. `PAV-123`), **title**, **description**, **team** (name or ID — needed for statuses), labels, and any fields that help classify the work.

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

**Branch name**:

```text
<feature|fix>/<issue-identifier>-<short-slug>
```

Example: `feature/PAV-123-add-export-to-csv`.

## 4. Create branch from `origin/main` (always first — before plan, Linear, or source edits)

**Immediately** after **§1–§3**, and **before** writing the plan file, posting to Linear, or changing application/package **source** (anything outside `.cursor/plans/` for this ticket), create and check out the ticket branch from `origin/main`:

```bash
git fetch origin main
git checkout -b '<feature|fix>/<identifier>-<short-slug>' origin/main
```

If the branch already exists locally, check it out after `git fetch origin main` (e.g. `git checkout '<branch>'`) instead of failing on `checkout -b`. If it was created from the wrong base, reconcile with the user (e.g. rebase onto `origin/main`) before implementing.

If the working tree is dirty and checkout would fail, report the situation and wait for the user to stash/commit before retrying.

After this step, confirm `git branch --show-current` matches the ticket branch before continuing.

### Invariant: branch before implementation

**Do not** change application or package **source** (anything outside `.cursor/plans/` for this ticket) until **§4** has succeeded and your current branch is the ticket branch (`git branch --show-current` matches **§4**). If the issue is resumed later and you are not on that branch, run **§4** (or `git checkout` the existing branch) **before** the first source edit.

Implementation order after the plan exists: **§6 → §7 → §8** when the user chooses **Build**; **§8** must not start until **§7** has completed. Do not parallelize code edits with Linear setup.

## 5. Write the plan file (first deliverable)

1. Ensure `.cursor/plans` exists under the repo root.
2. Create or overwrite:

   ` .cursor/plans/<ISSUE-IDENTIFIER-LOWERCASE>-<short-slug>.plan.md `

   Use the **full issue identifier** from Linear (e.g. `PAV-123`) in lowercase before the slug so filenames stay unique and traceable. The file **must** use the **`.plan.md`** suffix.

3. The Markdown body should be implementation-ready and include, as applicable:

   - Issue link reference: identifier + title
   - Goal and **acceptance criteria** (from description or bullets you infer; explicitly mark assumptions)
   - **Out of scope**
   - **Technical approach** (files/modules, APIs, data, edge cases)
   - **Checklist** of concrete tasks
   - **Risks / open questions**

## 6. Pause for the user (do not skip)

After saving the plan, **stop and ask** the user what they want next. Offer these options clearly:

1. **Refine** — They reply with edits; you update the same `.plan.md` until they are satisfied (no Linear steps until **Approve** or **Build**).
2. **Approve** — They confirm the plan is final.
3. **Build** — Same as approve, but you **also** start implementing the ticket after **§7–§8**. Implementation (**§8**) may begin only after **§7** has completed and only while on the ticket branch from **§4**.

Do **not** change Linear **until** the user has chosen **Approve** or **Build**. The ticket branch should **already** exist from **§4**.

Once they choose **Build**, **§7 (Linear) is mandatory before §8**: never start implementing the plan until Linear has been updated per **§7**.

If they only refine, iterate on the plan file until they say **Approve** or **Build**.

## 7. After Approve or Build — Linear: comment and status

1. Read the **final** plan from `.cursor/plans/…​.plan.md` (after any refinements).

2. **save_comment** — Create a comment on the issue:

   - `issueId`: the issue identifier (e.g. `PAV-123`)
   - `body`: Markdown. Start with a short line such as `**Implementation plan (approved)**` then paste or summarize the plan so it is readable in Linear (headings and lists are fine). If the full plan is very long, include the complete text anyway unless Linear size limits force truncation — if truncated, state that the canonical copy is in the repo path `.cursor/plans/…​.plan.md`.

3. **Set status to in progress**

   - Call **list_issue_statuses** with `team` from the issue.
   - Pick the workflow status that represents **work started** (e.g. named “In Progress”, “Started”, or the status whose **type** is in-progress in your team’s workflow).
   - Call **save_issue** with `id` set to the issue identifier and `state` set to the **exact** name or ID required by the MCP for that status.

4. Confirm to the user: **branch name**, **plan path**, **Linear updated** (comment + status).

## 8. If they chose Build

**Only after §7** (and only while on the ticket branch from **§4**): implement the ticket — follow the plan, keep changes scoped, and use the project’s existing patterns. If **§4** was skipped or you are not on the ticket branch, **stop** and run **§4** before any source changes.

---

## Quick reference

| Step               | Action                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| Branch (first)     | **§4** right after **§1–§3**: `git fetch origin main` + `git checkout -b … origin/main` |
| Plan file          | `.cursor/plans/<id>-<slug>.plan.md`                                               |
| User gate          | Refine → edit plan; Approve / Build → continue                                    |
| Issue details      | **§1** (`get_issue`)                                                              |
| Linear comment     | `save_comment` (**§7**, after Approve/Build)                                      |
| Linear in progress | `list_issue_statuses` + `save_issue` (`state`)                                    |
