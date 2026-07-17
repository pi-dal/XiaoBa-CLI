# Bundle Official xURL as a Native Runtime

Status: accepted

XiaoBa desktop releases bundle the unmodified official xURL native executable.
The release build downloads the target-specific `@xuanwo/xurl` npm artifact,
verifies its pinned SHA-256 digest, and extracts only the native executable into
the existing bundled runtime directory. The build then executes `xurl
--version` and fails unless it reports the manifest-pinned version.

At runtime, an explicit `XIAOBA_EXTERNAL_SESSION_LOG_XURL_COMMAND` remains the
highest-precedence operator override. Without an override, XiaoBa uses the
bundled executable and then falls back to a system `xurl` command for source
and development installations.

The npm artifact is a build-time distribution source, not a user runtime
dependency. Desktop users do not need Node.js, npm, or pnpm to run xURL.
XiaoBa continues to invoke xURL as an external process through the official
`agents://` rendered Timeline interface established by ADR-0043.

Bundling is tied to XiaoBa releases. XiaoBa does not install or upgrade xURL
independently at runtime, which keeps renderer compatibility changes inside
the existing release and Canary gates.
