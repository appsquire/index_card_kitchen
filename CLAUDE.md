# CLAUDE.md

This repository is **Index Card Kitchen** — a recipe box web application.

All agent instructions are in `AGENTS.md`. Read it for architecture, patterns, and development
guidelines.

@AGENTS.md

The `recipebox-dev` skill in `.claude/skills/` provides quick orientation for common tasks. It
should trigger automatically when working on the codebase.

**The short version:** offline-first architecture (IndexedDB primary, PostgreSQL sync optional),
React Context for state, thin routes with fat services on the backend, and always test both
online and offline paths.
