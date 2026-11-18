# Modification notice (GPL-3.0 section 5a)

This project is a modified version of **GreenLauncher** by Despical
(https://github.com/Despical/GreenLauncher), licensed under the GNU General Public
License v3.0 only. The full license text is in `LICENSE`. This modified version is
distributed under the same license; the complete corresponding source is this repository.

Modified on: 2026-11-17

## Changes made to the original
- Added a Quick Play panel on the Home screen (`src/renderer/src/QuickLaunchPanel.tsx`):
  username, version selector, RAM slider, Java selector.
- Added an installed-versions manager tab on the Versions page
  (`src/renderer/src/InstalledVersionsManager.tsx`) with new IPC calls
  `getInstalledVersions` and `getSystemInfo` (`src/main/game.ts`, `src/main/index.ts`,
  `src/preload/index.ts`, `src/shared/types.ts`).
- Fixed: a base Minecraft version could be deleted while installed loader versions
  (Fabric/Forge/Quilt/OptiFine) inherited from it; deletion is now refused.
- Disabled the auto-updater by default so a modified build never replaces itself with
  upstream releases (`src/main/fork-config.ts`; opt in with `GREEN_LAUNCHER_ENABLE_UPDATES=1`
  after pointing the update feed at your own repository).
- Restyled the interface: palette remap across all CSS plus `src/renderer/src/minecraft-theme.css`.
- Added translations (en, de, fr, ru, pl) for all new strings; one new error-message rule.

Original copyright and author credits (About panel, package.json author) are retained.
Minecraft is a trademark of Mojang/Microsoft; this is not an official product.
