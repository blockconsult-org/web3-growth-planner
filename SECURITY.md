# Security

The current release receives security fixes. Report a vulnerability privately using GitHub's **Security → Report a vulnerability** feature. Do not publish exploit details or private scenario data in issues.

The renderer loads only packaged assets through a restricted custom protocol. Node integration is disabled; context isolation and sandboxing are enabled. The preload exposes only a PDF-save action, which verifies its sender and uses a native file picker. Network requests, embedded frames and arbitrary new windows are blocked. HTTPS evidence links leave the app only after destination confirmation. No credentials or signing material belong in this repository.

Scenario data and share links are not encrypted. Local profile data is protected by the operating-system account. Dependency updates and signing status are reviewed for each release.
