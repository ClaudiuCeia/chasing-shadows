# AGENTS.md

Guidance for coding agents working in this repository.

## 1) Repository Snapshot

- Runtime: Bun (not Node.js).
- Language: TypeScript (ESNext, strict mode).
- Entry points: `index.html` (browser/dev), `index.ts` (module bootstrap).
- Package manager: Bun (`bun.lock` present).
- Current scripts: `dev` (`bun --watch index.html`).
- Lint/format tools: not explicitly configured yet.

## 2) Instruction Sources (Highest Priority First)

1. Direct user request in the current task.
2. This `AGENTS.md` file.
3. `CLAUDE.md` repository instructions.
4. Existing project conventions in source files.

## 3) External Agent Rule Files Check

- Checked `.cursor/rules/`: not present.
- Checked `.cursorrules`: not present.
- Checked `.github/copilot-instructions.md`: not present.
- Therefore, there are currently no Cursor/Copilot-specific rule files to apply.

## 4) Required Platform Defaults (From CLAUDE.md)

- Use Bun commands by default.
- Prefer `bun <file>` over `node <file>` or `ts-node`.
- Prefer `bun test` over Jest/Vitest CLIs.
- Prefer `bun build` over webpack/esbuild CLIs.
- Prefer `bun install` over npm/yarn/pnpm install.
- Prefer `bun run <script>` over npm/yarn/pnpm run.
- Prefer `bunx <pkg>` over `npx <pkg>`.
- Bun auto-loads `.env`; do not add `dotenv` unless explicitly required.

## 5) Build / Run / Test / Lint Commands

Use these commands from repository root.

### Setup

- Install dependencies: `bun install`

### Run

- Run browser dev server (recommended): `bun dev`
- Equivalent command: `bun --watch index.html`
- Non-browser runtime check: `bun run index.ts`

Notes:

- Main gameplay runs in DOM/canvas context via `index.html` + `index.ts`.
- Running `bun run index.ts` in a non-DOM environment prints a bootstrap skip message.

### Build

- No dedicated build script exists yet.
- Build frontend app bundle: `bun build index.html --outdir ./dist`
- Optional direct TS artifact build: `bun build index.ts --outdir ./dist`

### Test

- Run all tests: `bun test`
- Run tests by filename/pattern: `bun test <pattern>`
- Run one test file: `bun test path/to/file.test.ts`
- Run one test by name regex: `bun test -t "test name regex"`
- Run one test file + one test name: `bun test path/to/file.test.ts -t "exact case"`
- Useful in CI/debug: `bun test --bail`, `bun test --coverage`, `bun test --timeout 10000`

### Lint / Static Checks

- No linter is configured in `package.json` yet.
- Minimum quality gate today: type-check with TypeScript.
- Type-check command: `bunx tsc --noEmit`
- If a linter is introduced, prefer a Bun-invoked command (for example `bunx biome check .`).

## 6) TypeScript Configuration Implications

Based on `tsconfig.json`:

- `strict: true`: keep code fully type-safe; avoid `any`.
- `noUncheckedIndexedAccess: true`: treat indexed access as possibly `undefined`.
- `noImplicitOverride: true`: mark subclass overrides explicitly with `override`.
- `noFallthroughCasesInSwitch: true`: do not fall through switch cases.
- `moduleResolution: bundler`: write imports compatible with bundler-style resolution.
- `verbatimModuleSyntax: true`: keep import/export syntax intentional and explicit.
- `allowImportingTsExtensions: true`: `.ts` extension imports are allowed when useful.
- `noUnusedLocals` and `noUnusedParameters` are currently off, but avoid dead code anyway.

## 7) Code Style Guidelines

### Imports

- Prefer ESM imports/exports only.
- Group imports in this order: builtin/runtime, third-party, internal relative.
- Keep import lists minimal; remove unused imports.
- Use named exports for reusable utilities unless a default export is clearly better.
- Avoid deep, fragile relative paths when a cleaner module boundary is available.
- For static assets (`.png`, `.jpg`, etc.), import files directly via Bun bundler.
- Keep `modules.d.ts` in sync when introducing new static asset extensions.

### Formatting

- Follow existing file style; do not reformat unrelated lines.
- Use semicolon style consistently within a file.
- Keep functions small and readable; extract helpers over deeply nested logic.
- Prefer single-responsibility modules.
- Keep lines reasonably compact unless readability improves with longer lines.

### Types

- Prefer explicit public function return types.
- Infer obvious local variable types when it improves readability.
- Use `unknown` instead of `any` for untrusted data; narrow before use.
- Model domain concepts with `type`/`interface` aliases rather than loose objects.
- Use discriminated unions for variant states.
- Avoid non-null assertions (`!`) unless truly guaranteed.

### Naming

- Variables/functions: `camelCase`.
- Types/interfaces/classes: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants.
- File names: prefer descriptive names aligned with exported symbol or responsibility.
- Test names: describe behavior, not implementation details.

### Error Handling

- Fail fast on invalid inputs at boundaries.
- Throw `Error` objects (or subclasses), not strings.
- Add contextual messages so failures are actionable.
- Do not swallow errors silently; rethrow or convert with context.
- Handle async failures with `try/catch` when recovery or context is needed.

### Logging

- Keep logs concise and purposeful.
- Avoid noisy debug logging in committed code.
- Prefer structured information in log messages when troubleshooting complex flows.

## 8) Bun-Specific Development Guidelines

- For HTTP services, prefer `Bun.serve()` over Express.
- For SQLite, prefer `bun:sqlite`.
- For Redis, prefer `Bun.redis`.
- For Postgres, prefer `Bun.sql`.
- For files, prefer `Bun.file` over Node `fs` read/write helpers.
- For subprocesses in Bun scripts, prefer `Bun.$`.
- Prefer Bun-native asset imports in browser code (e.g. `import Walk from "../assets/player/Walk.png"`).

## 9) Testing Guidelines

- Use Bun test API: `import { test, expect } from "bun:test"`.
- Keep tests deterministic; avoid time/network flakiness unless explicitly integration-tested.
- Co-locate tests near source (`*.test.ts`) or in a clear `tests/` directory.
- Prefer one behavioral assertion block per test case.
- Add regression tests for bug fixes.
- When fixing a bug: write/adjust a failing test first when practical.

## 10) Change Management for Agents

- Make the smallest change that fully solves the task.
- Do not introduce new dependencies without clear need.
- Update docs when commands or architecture change.
- If adding scripts, prefer `package.json` script names: `dev`, `build`, `test`, `lint`, `typecheck`.
- If introducing lint/format tooling, document exact commands in this file.

## 11) Quick Command Reference

- Install: `bun install`
- Dev server: `bun dev`
- Run module directly: `bun run index.ts`
- Test all: `bun test`
- Test single file: `bun test src/foo.test.ts`
- Test single case: `bun test src/foo.test.ts -t "handles empty input"`
- Type-check: `bunx tsc --noEmit`
- Build sample: `bun build index.html --outdir dist`

Keep this file updated as tooling and conventions evolve.
