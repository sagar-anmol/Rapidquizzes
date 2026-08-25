# AGENTS.md

## Git workflow

- Never commit directly to `main`.
- For every new feature or change, create a new branch first and work on it (branch naming: lowercase, hyphenated, e.g. `durgesh-updates`, `feature/<name>`).
- Only commit/push when explicitly asked.

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Note: git is not on PATH by default in PowerShell; refresh with
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")` before running git.
