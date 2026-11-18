# Repository guidance

This is a standalone offline desktop app. Keep model/schema behavior compatible with the Block Consult browser tool. Do not add telemetry, remote code, credentials, or portal dependencies. Keep English and German equivalent. Run `npm run verify` before release. Main-process and preload changes require a security-boundary regression test. Publish only reviewed artifacts and describe signing status accurately.
