/**
 * Fork-specific switches.
 *
 * The upstream project (Despical/GreenLauncher) ships an auto-updater that downloads
 * releases from the upstream GitHub repository. A modified build must never silently
 * replace itself with upstream binaries, so updates are OFF unless this fork points the
 * updater at its own release feed and opts in explicitly.
 *
 * To opt in for your own releases: change `owner`/`repo` in `src/main/index.ts`
 * (NsisUpdater options), `src/main/portable-updater.ts`, `src/main/app-update.yml` and
 * `package.json -> build.publish`, then run the launcher with GREEN_LAUNCHER_ENABLE_UPDATES=1.
 */
export const updatesEnabled = process.env.GREEN_LAUNCHER_ENABLE_UPDATES === '1'
