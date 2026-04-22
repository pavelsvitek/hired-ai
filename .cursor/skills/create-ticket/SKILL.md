---
name: create-ticket
description: Creates Linear issues in the hired.ai project (team pavelsvitek) with correct project linkage. Use when the user asks to add or create a Linear ticket, issue, or backlog item for this repository, or to file work in the hired / hired.ai project.
---

# Create ticket (Linear, hired.ai)

## Defaults (do not change unless the user overrides)

- **Team:** `pavelsvitek` (key `PAV` — identifiers look like `PAV-12`).
- **Project:** the Linear project **hired.ai** (product URL: <https://linear.app/pavelsvitekcom/project/hiredai-9594f0f3e2db/overview>).
- When calling **`save_issue`**, pass `project` as **`hired.ai`** (project name) or the project `id` from **`list_projects` / `get_project`**. Do not create issues without this project set unless the user explicitly wants a different project.

## Before any Linear tool

1. If the Linear MCP server is not yet authenticated, call **`mcp_auth`** for `plugin-linear-linear` with `{}`.
2. **Read the JSON tool descriptor** for each tool you use (for example `save_issue`, `list_projects`, `get_project`) under the workspace MCP path so arguments match the schema.

## Create an issue

1. Gather a **title** and a **description** (Markdown). If the user only gave a vague request, ask once for a short title, or draft both from context and let them correct you.
2. Call **`save_issue`** with at least:
   - `title` — required for create
   - `team` — `pavelsvitek`
   - `project` — `hired.ai` (required for this skill)
   - `description` — optional but preferred; use real newlines in strings (not `\\n` escape sequences in JSON for markdown body)
3. Set optional fields only when useful or when the user asked: `priority`, `labels`, `state`, `assignee`, `cycle`, `links`, etc. (see **`save_issue`** schema).
4. Reply with the issue **identifier** (e.g. `PAV-38`), the **URL** from the tool response, and the suggested **`gitBranchName`** if the user is starting work.

## Project verification (if `save_issue` errors on `project`)

1. **`list_projects`** with `query` set to `hired` and confirm the project **name** `hired.ai` and `id`.
2. Retry **`save_issue`** with `project` set to that **`id`** or **`hired.ai`**.

## Do not

- Create issues in other Linear projects for this repo unless the user says so.
- Skip the **`project`** field for work that belongs in hired.ai.
