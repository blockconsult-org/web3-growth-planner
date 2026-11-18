# Releasing

1. Update `package.json`, `package-lock.json` and `app.json` to the same version.
2. Run `npm ci` and `npm run verify`. Inspect the desktop UI and generated PDF/PNG/JSON exports.
3. Commit and tag `vX.Y.Z`, then push the branch and tag. GitHub Actions runs model tests, a production build and real Electron checks on macOS and Windows, then packages a universal macOS DMG/ZIP plus Windows installer/portable executable.
4. The workflow creates a **draft** release only after both platforms succeed. Verify its assets, `SHA256SUMS.txt` and platform build logs. Publish the draft after review.

## Signing

CI can use electron-builder's `CSC_LINK` / `CSC_KEY_PASSWORD` (Apple) and `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (Windows) through repository secrets. Never commit certificates. This workflow does not export a developer's local Keychain identity.

For a local signed Mac build, use the existing Developer ID identity. Notarize the final DMG using an existing Keychain profile:

```sh
xcrun notarytool submit release/APP.dmg --keychain-profile PROFILE --wait
xcrun stapler staple release/APP.dmg
xcrun stapler validate release/APP.dmg
```

Verify the app with `codesign --verify --deep --strict` and assess the installed app with `spctl --assess --type execute`. If signing or notarization is unavailable, disclose it in the release notes; never label an ad-hoc signature as Developer ID signing. After replacing any artifact, regenerate checksums. Windows Authenticode requires a Windows signing certificate or trusted-signing service; a Mac Developer ID does not sign Windows binaries.
