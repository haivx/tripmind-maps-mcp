# Ship

Pre-publish checklist before releasing a new version.

## Pre-flight Checks

Run all of these and report results:

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

ALL must pass. If any fail, fix before proceeding.

## Checklist

- [ ] All tools tested with MCP Inspector
- [ ] README.md tool table is up to date
- [ ] CHANGELOG.md has entry for this version
- [ ] .env.example has all required environment variables
- [ ] No `console.log` in any src/ file (only `console.error` for debug)
- [ ] package.json version bumped appropriately (semver)
- [ ] `npm run build` produces clean output in `build/`
- [ ] `node build/index.js` starts without errors (quick smoke test)

## Version Bump

Determine bump type:
- **patch**: Bug fixes, cache improvements, error message changes
- **minor**: New tool added, new transport support
- **major**: Breaking changes to tool schemas or server config

## Publish Steps

1. `npm version <patch|minor|major>`
2. `git add -A && git commit -m "chore: release vX.Y.Z"`
3. `git tag vX.Y.Z`
4. `npm publish` (if publishing to npm)
5. `git push origin main --tags`
