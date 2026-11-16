# Changelog

**Scope:** What each published version of Checkpoints' packages holds, newest first.

Each version's section is written by the pull request that changes the version, from the pull requests merged since the previous version; other pull requests don't edit this file.

## 0.0.3

- The six Git packages hold Git v2.56.1, which fixes CVE-2026-111760, CVE-2026-113408, CVE-2026-114466, CVE-2026-114467, CVE-2026-114469 and CVE-2026-105437.
  - Windows, `win32-x64` and `win32-arm64`: MinGit from Git for Windows v2.56.1.windows.1, in place of v2.56.0.windows.4.
  - macOS and Linux, `darwin-x64`, `darwin-arm64`, `linux-x64` and `linux-arm64`: dugite-native v2.56.1, in place of v2.56.0-2.
    The Linux arm64 build still reports itself as `git version 2.56.1.dirty`, as the README says.
- `@noldova/checkpoints.protocol`'s models, and the module's stored records, read their JSON through `@noldova/context.json`'s `JsonReader`.
  - A malformed form now rejects with context's `JsonException`, with its message and path. A value the model refuses still rejects with `ProtocolException`.
  - The protocol no longer exports `JsonObjectReader`, `JsonObject`, `JsonValue`, `FieldNotABooleanException`, `FieldNotAListException`, `FieldNotANumberException`, `FieldNotANumberOrNullException`, `FieldNotAStringException`, `FieldNotAStringListException`, `FieldNotAStringOrNullException`, `MissingFieldException`, `NotAnObjectException` or `UnknownFieldException`.
    The module no longer has `StoreFieldNotABooleanException` or `StoreFieldNotAStringListException`.
  - Both packages take `@noldova/context.json` as a peer, `>=0.0.7 <0.1.0`.
- A `checkpoints.*` request whose form is right, but which holds a value its model refuses, is answered as `InvalidParams`, with the refusal's message, instead of as `Internal`.
- The packages are built and tested against Noldova Desktop 0.0.2's `@noldova/desktop.protocol` and `@noldova/desktop.runtime`.
  - `@noldova/desktop.runtime` 0.0.2 takes `@types/node` `>=26.6.6 <27.0.0` as an optional peer.
  - The module's own peer range for both stays `>=0.0.1 <0.1.0`.

## 0.0.2

- `@noldova/checkpoints` and `@noldova/checkpoints.protocol` each hold a `README.md`, which npm shows as the package's page.
  The build refuses to pack either package without one.
- `@noldova/checkpoints` takes a write to a Git command's input that macOS fails as no longer connected, `ENOTCONN`, as the command having ended early, as it takes a broken pipe, `EPIPE`.
  On macOS, a read whose Git command stopped reading once it had what it needed no longer fails; a command's exit still says what went wrong.
- The six Git packages hold the same Git builds as 0.0.1; the eight packages move together.

## 0.0.1

- The first version of `@noldova/checkpoints` and `@noldova/checkpoints.protocol`, under the MIT License, and of the six `@noldova/checkpoints.git.<os>-<arch>` packages, under the licences of the Git builds they hold.
  The eight packages move together.
- `@noldova/checkpoints` holds `module.json` and the runtime part, and exports `./runtime`.
  - `./runtime` exports `StoreAnswersMismatchException` and `TreeLineMalformedException`, the two `StoreException` subclasses a compare, a read, a preview or a restore can reject with.
  - `GitManifestInvalidException` is also the cause when the Git build's manifest isn't JSON or can't be read; for a manifest Node refused while the module looked for the build, its `manifestFile` is the manifest as the module asked for it, `@noldova/checkpoints.git.<platform>-<arch>/package.json`.
  - A compare, a preview or a restore of a checkpoint whose ignore file the store lacks, or gives as something other than a file's content, rejects with `StoreObjectMissingException` or `StoreObjectNotABlobException` instead of reading that ignore file as empty.
  - The runtime part publishes its service and registers its methods before it starts its background work, so an activation that fails there leaves nothing running.
- `@noldova/checkpoints.protocol` holds the requests, results and events of the runtime methods, with the folders and checkpoints they name.
  - The last constructor parameter of `UnreadPath(path, reason, code)`, `PreviewRequest(folder, checkpoint, paths)` and `RestorePlan(..., state, paths)` is required, passed as `null` for none.
  - `JsonObjectReader` reads a list of text with `readStringList`, and one that may be `null` with `readStringListOrNull`; both refuse a missing field.
  - `InvalidRelativePathException`'s message for a scope path that breaks only the `\` rule names that rule.
- A checkpoint's `checkpoint.json` is at format version 2, which keeps each unread path's `code`; the module also reads version 1, which holds no `code`, as paths with none.
- Both packages' `@noldova/context.exceptions` peer is the range `>=0.0.7 <0.1.0`.
- Each Git package holds one target's upstream Git build, MinGit on Windows and dugite-native's on macOS and Linux, with every bundled component's licence in its `licenses/` folder, and names the upstream source each build came from.
- Each Git package names every file of its build in `noldovaDesktop.unpacked`, so Noldova Desktop unpacks them, and the module runs Git from those unpacked copies in a packaged app.
