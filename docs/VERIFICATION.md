# Release verification

Verified locally on macOS with Electron 45.3.4:

- TypeScript and Vite production builds.
- Original model/calculation regression tests and custom-protocol security tests.
- Real Electron: English/German, dark/light, desktop/narrow layout, WCAG A/AA axe checks after theme transitions settle.
- Sandboxing, context isolation, no renderer Node access, denied background network access.
- Native PDF output with report content; editable JSON export/import round trip; public-browser share links reopened offline.

The release workflow repeats these tests independently on macOS and Windows before creating installers. Native installers require final release review. CI logs provide platform-specific results.

`npm audit --omit=dev` reports no runtime package advisories; renderer libraries are bundled by Vite. The full development-tool audit currently flags the upstream picomatch glob-matching ReDoS advisory, for which the npm registry has no patched release as of 18 November 2026. It is confined to trusted build inputs. The available minimatch patch is applied with a scoped override. Do not run build scripts against untrusted repository content. Recheck build-tool advisories on each release.
