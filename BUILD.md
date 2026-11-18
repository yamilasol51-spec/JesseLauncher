# Build and run

Requirements: **Windows x64**, Node.js 22, pnpm 10.28.2, and (for the update helper) a
C++ toolchain as used by `scripts/build_update_helper.mjs`.

```powershell
pnpm install --frozen-lockfile
pnpm dev                 # run in development
pnpm run build           # type-check + production bundle
node scripts/check-i18n.mjs
pnpm dist:portable       # portable GreenLauncher.exe in release/
pnpm dist:setup          # NSIS installer
```

Notes
- Offline play: type a 3-16 character name (letters, digits, underscore) in Quick Play.
- Updates are disabled by default in this fork (see NOTICE-MODIFICATIONS.md).
- This build has not been compiled or run by the author of the modifications; run
  `pnpm run build` first and report any type errors.
