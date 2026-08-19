# Loop Smoke-Test Report

## Scope

This is a smoke-test artifact for the pinned XiaoBa-CLI revision. The inspection was read-only except for this report file.

## Main runtime entry point

The primary CLI runtime entry point is `src/index.ts`.

Evidence:

- `package.json:main` is `electron/main.js` for the Electron application shell.
- `package.json:bin.catsco` and `package.json:bin.xiaoba` both point to `dist/index.js`.
- `package.json:scripts.dev` runs `tsx src/index.ts`.
- `package.json:scripts.start` and `package.json:scripts.start:cli` run `node dist/index.js`.
- `src/index.ts:13` defines `function main()`; `src/index.ts:213` invokes `main()`.
- `src/index.ts:3` imports `Command` from `commander`, and `src/index.ts:16` reads `process.argv` to select runtime behavior.

Thus, `src/index.ts` is the source entry point for the CLI runtime, compiled to `dist/index.js`; `electron/main.js` is the Electron shell entry configured by `package.json:main`.

## Build and test scripts

Evidence source: `package.json`.

- `build`: `tsc`
- `test`: `node scripts/run-tests.mjs runtime`
- `test:runtime`: `node scripts/run-tests.mjs runtime`
- `test:legacy`: `node scripts/run-tests.mjs legacy`
- `test:all`: `node scripts/run-tests.mjs all`
- `test:list`: `node scripts/run-tests.mjs runtime --list`
- `watch`: `tsc --watch`
- `electron:dev`: builds, then runs `scripts/start-electron-dev.mjs`
- `electron:build`: builds, prepares runtime assets, prunes Electron optional natives, then invokes electron-builder

## Loop-related skills currently present

The repository's `skills/` tree was inspected for skill directories and `SKILL.md` files. No skill path with a Loop-specific name or Loop-specific text match was found in the pinned revision.

The closest runtime/agent-adjacent skill paths found by name are:

- `skills/catsco-people-responsibility-board/SKILL.md`
- `skills/catsco-prompt-editor/SKILL.md`

These are listed as nearby CatsCo skills, not as confirmed Loop skills. The repository therefore contains no confirmed Loop-related skill path at this revision.

## Limitations

This report records static repository evidence only. It does not claim that the full build or test suite was executed, and it does not infer runtime behavior beyond the cited files and package scripts. Search results are limited to the pinned base revision and the repository's tracked skill paths.
