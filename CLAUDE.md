# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Claude Code

- Use plan mode for multi-file, risky, architectural, or ambiguous changes.
- Use subagents only for bounded sidecar work: exploration, review, test triage, or documentation lookup.
- Prefer separate worktrees for parallel implementation sessions.
- When a task touches `ee/`, follow `ee/AGENTS.md`; if running Claude Code inside `ee/`, `ee/CLAUDE.md` imports that overlay.

## Automatic Hooks

`.claude/settings.json` registers PostToolUse hooks that fire after every Edit or Write:

- **auto-format-go.sh** — runs `goimports` + `gofmt` on changed `.go` files
- **auto-lint-ts.sh** — runs `oxlint --fix` on changed `.ts`/`.tsx` files
- **auto-graphql-codegen.sh** — re-runs `go generate ./...` if `schema.graphqls` changed

Hook output is expected and not a sign of error. If a hook reports a failure, fix the underlying issue before continuing.
