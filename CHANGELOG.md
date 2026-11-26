# Changelog

**Scope:** What each published version of Checkpoints' packages holds, newest first.

Each version's section is written by the pull request that changes the version, from the pull requests merged since the previous version; other pull requests don't edit this file.

## 0.0.4

- A turn no longer has to wait for its checkpoint: `CaptureRequest.asOf`, the time the turn started, lets the app take it in the background once the turn is under way or done, and the checkpoint keeps the folder as it was at `asOf`.
  - A file whose modification or change time is at or after `asOf` less two seconds keeps the copy the last checkpoint had, or is left out when that one didn't hold it; so does a file deleted, rewritten or changing while the capture reads it.
  - `Checkpoint.earlierPaths` and `RestorePlan.earlierPaths` name the paths kept as the checkpoint before had them, so a preview can say those copies are from before the turn.
  - `checkpoint.json` goes to format version 3, with `earlierPaths`; a version 2 record reads as one with none.
- A checkpoint leaves out what doesn't belong in one, at fixed limits:
  - a file over 10 MiB isn't read: it is listed as too large, as `KeepReason.TooLarge` or `UnreadReason.TooLarge`, a preview keeps it as `TooLarge`, and a restore leaves it as it is;
  - a capture whose new and changed files come to over 1 GiB answers `CaptureOutcome.TooLarge`, with the size and the limit, and takes no checkpoint;
  - a restore whose checkpoint taken before it would add over 1 GiB answers `RestoreOutcome.TooLarge`, with `contentSize` and `contentLimit`, and changes nothing.
- A folder deleted or renamed while it is walked answers `FolderMissing` from capture, compare, preview and restore, instead of a raw `ENOENT`.
- A folder's identity must be lower case: the protocol refuses an identity with an upper-case letter, so one identity names one store and one queue on every file system.
  Before, on Windows and macOS, `Case-1` and `case-1` shared one store but held separate queues, so a delete could move the store during a capture.
- A restore that fails while staging, and can't then remove what it staged, holds the folder up, raising `checkpoints.restoreHeldUp`, instead of throwing; each later operation on the folder tries the removal again first.
- Each housekeeping pass removes the reference locks a stopped Git command left, so its `pack-refs` no longer fails on them and the store's packs no longer pile up.
- A restore journal record is written whole or not at all: an append that fails cuts the journal back to its length before the append.
- Each Git package's `package.json` names the upstream source of its build, `sourcePages` and `sources`, each file by address, size and SHA-256, so an app that ships it can point to its complete corresponding source.
- Checkpoints needs Noldova Desktop 0.0.17 or later and context's packages 0.0.12 or later:
  - `@noldova/checkpoints` takes `@noldova/desktop.protocol` and `@noldova/desktop.runtime` at `>=0.0.17 <0.1.0`, and `module.json`'s `noldovaDesktop` is `>=0.0.17 <0.1.0`;
  - both packages take `@noldova/context.core`, new as a peer, `@noldova/context.exceptions` and `@noldova/context.json` at `>=0.0.12 <0.1.0`.

## 0.0.3

- The six Git packages hold Git v2.56.1, which fixes CVE-2026-111760, CVE-2026-113408, CVE-2026-114466, CVE-2026-114467, CVE-2026-114469 and CVE-2026-105437.
  - Windows, `win32-x64` and `win32-arm64`: MinGit from Git for Windows v2.56.1.windows.1, in place of v2.56.0.windows.4.
  - macOS and Linux, `darwin-x64`, `darwin-arm64`, `linux-x64` and `linux-arm64`: dugite-native v2.56.1, in place of v2.56.0-2.
    The Linux arm64 build still reports itself as `git version 2.56.1.dirty`, as the README says.
- `@noldova/checkpoints.protocol`'s models, and the module's stored records, read their JSON through `@noldova/context.json`'s `JsonReader`.
  - A malformed form now rejects with context's `JsonException`, with its message and path.
    A value the model refuses still rejects with `ProtocolException`.
  - A `checkpoints.*` request that isn't its method's form is answered as `InvalidParams`, with the `JsonException`'s message, instead of as `Internal`.
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
