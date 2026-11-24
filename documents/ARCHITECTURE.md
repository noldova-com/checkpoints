# Architecture

**Scope:** What the checkpoints module is, its parts, how it stores, compares and restores a folder's files with its own Git, Noldova's decisions it keeps, and where its boundaries with Noldova Desktop and the apps that add it lie.

This document is the design the module is built to.
**Not yet** marks what isn't built yet.
Each section's "Tests:" line cites the tests that hold its rules, each by its exact name in double quotes, without its suites' names, a `"` or `\` in it escaped with `\`, joined by `; ` and ending in a full stop, all on one line.
A whole `npm test` run fails when a cited name matches no test it ran, or a "Tests:" line takes another form, as [README.md](../README.md#checks) says.

## The boundary

- Checkpoints is a module, with the id `checkpoints`, for any app on [Noldova Desktop](https://github.com/noldova-com/desktop).
- It stays product-neutral: an app adds its package, decides when to take a checkpoint and when to offer a restore, and no app's names, text or behaviour live in it.
- It installs published versions of Noldova Desktop's packages and depends on no app.
  An app asks for a change here through an issue, and the module asks for a change to Noldova Desktop through an issue there.
- It runs on Windows, macOS and Linux, each on x64 and ARM64.
- Git is a separate program the module ships and starts; the module never loads Git as a library and never runs an installed Git.
- Git reads and writes only the module's own store.
  It never reads the person's folder: the module reads the folder's files and hands their contents to Git.
  The person's repository storage, index, branches, references, configuration and hooks are never read or changed by Git.
- Nothing is written into the person's folder, except by a restore the person asked for.

## Noldova's decisions

- A checkpoint keeps every file in the folder by default: no ignore rules, no cap on the number of files, and each file streamed, never held in memory.
  It leaves out a file over 10 MiB, listing it as too large, and takes no checkpoint when the new and changed files come to over 1 GiB, so a build's output or a download never makes a checkpoint hold up a turn; both limits are fixed.
  A setting makes it follow the folder's `.gitignore` files instead.
- Every `.git` in the folder, its own and each nested repository's or submodule's, is never kept, read or restored, in either mode, so a restore never touches the person's branches, commits or stashes.
- The store lives outside the folder, in the app's data directory under `~/.noldova/<app>/`, and the person never sees it.
- Every checkpoint is kept until the person deletes it; when disk space is low, no new checkpoint is taken, and a visible note says why.
- A restore runs only on the person's request, through a preview, and finishes whole or not at all.
- The app ships a Git build for each target, with its licences and signed with the app, as it ships Electron and its other programs: Git for Windows' MinGit, and a ready-made macOS and Linux build.
  It runs with the system's and the person's configuration, hooks and settings switched off.
  The module never runs an installed Git, in a packaged app, in development or in tests.
  Git ships under its GPL, and each package names the upstream Git source version its build comes from.

## The package

The module follows Noldova Desktop's module contract, `documents/MODULES.md` in Noldova Desktop, with the same layout as the other modules.

| Package | Folder | Holds |
|---|---|---|
| `@noldova/checkpoints` | `src/noldova.checkpoints` | `module.json` at its root, `settings.json`, and the runtime part |
| `@noldova/checkpoints.protocol` | `src/noldova.checkpoints.protocol` | the requests, results and events of the runtime methods, with the folders and checkpoints they name |
| `@noldova/checkpoints.window` | `src/noldova.checkpoints.window` | the storage view: each folder's space used, and its delete action (**Not yet**, below) |
| `@noldova/checkpoints.git.<platform>-<arch>` | `src/noldova.checkpoints.git` | one package per target, holding that target's Git build ([The Git builds](#the-git-builds)) |

- `module.json` declares the id `checkpoints`, the part `runtime`, and what the module contributes:
  - the `checkpoints.*` methods and events ([The API](#the-api));
  - the notification kind `checkpoints.lowDiskSpace` ([Low disk space](#low-disk-space));
  - the setting `checkpoints.followIgnoreFiles` ([Settings](#settings)).
- With the window part (**Not yet**, below), it also declares the part `window`, the command `checkpoints.openStorage`, which opens the storage view and which the `checkpoints.storage` Action runs, the setting `checkpoints.storage`, and the storage view `checkpoints.storage`.
- The runtime part owns every store and every Git process, and publishes the module's service to other runtime parts.
- The window part shows only the storage view and registers `checkpoints.openStorage`; the restore preview and the changes are shown by the app, from the API's results.
- **Not yet:** the window part isn't built yet; Noldova Desktop 0.0.1 publishes the Window package it builds on.

## The API

The runtime part publishes one service, and the same calls as `checkpoints.*` methods for the window part.

- A folder is named by an identity the app owns and the folder's current path on this device.
  The identity is 1 to 64 characters of letters, digits and `-`, such as a project's id; the store is keyed by it, so a moved folder keeps its checkpoints.
- `capture` takes a checkpoint of a folder and returns it; the app may attach a label of up to 1 KiB, such as the turn it belongs to.
  It answers `Captured` with the checkpoint, or `LowDiskSpace` with the space free and the space needed, in bytes ([Low disk space](#low-disk-space)), or `TooLarge` with the size of the new and changed files and its 1 GiB limit, or `FolderMissing` or `HeldUp`.
  The app may also give the time a turn started, `asOf`, and take the checkpoint after the turn starts, which keeps the folder as it was at that time ([The turn's start](#the-turns-start)).
- `list` returns a folder's checkpoints, newest first.
- `compare` gives the changes between two checkpoints, or between one and the folder now, and `read` gives one file's content at a checkpoint, or its line diff against another checkpoint or the folder now, up to a size the caller sets.
  `compare` answers `Compared` with its changes, or `CheckpointMissing` or `FolderMissing`; `read` answers `Read` with the bytes, the whole size and whether the bytes are cut, or `CheckpointMissing`, `FolderMissing`, `PathMissing`, `Unknown` or `Binary` ([Changes](#changes)).
- `previewRestore` returns the restore's plan: what it writes, replaces and deletes, which of the files it writes are as the checkpoint before had them, what stays as it is and why, and the space it needs.
- `restore` carries out a plan the person accepted, and refuses a plan the folder has moved on from.
  It answers `Restored` with the checkpoint taken before it, and one that keeps what another program changed meanwhile, or `RolledBack` with the checkpoint taken before it, or `MovedOn`, `LowDiskSpace`, `TooLarge` with the size of the new and changed files and its 1 GiB limit, `CheckpointMissing`, `FolderMissing` or `HeldUp` ([Restoring](#restoring)).
  `capture`, `compare`, `previewRestore` and `restore` also answer `FolderMissing` when the folder is deleted or renamed while they walk it, and a restore whose moved-aside folder is gone when it walks it again keeps nothing from it, nor a file in it deleted after that walk.
- `storage` lists every folder's space used, the largest first and folders of one size by identity: its identity, the path it had at its last capture, or none when its `folder.json` can't be read, and the sum of the sizes of its store's files.
  It reads outside the folders' queues, so it never waits for an operation or stops a housekeeping pass, and its sizes are a snapshot: a capture or a pass running as it reads may change them at once.
  A file or folder that goes away as it reads is left out, and so is a store a delete is moving aside; a delete waits for a read of the store that has started, since Windows refuses to rename a folder while a program lists or reads in it.
  Space a delete couldn't free yet, in `deleted/`, isn't listed.
- `deleteFolder` deletes all of one folder's checkpoints, and answers `Deleted`, also for a folder that has none, or `HeldUp` while an interrupted restore of the folder can't finish ([Keeping and deleting](#keeping-and-deleting)).
- Events report a capture paused for low disk space, `checkpoints.capturePaused`, with the space free and needed, and its resumption, `checkpoints.captureResumed`, a finished restore, `checkpoints.restored`, and a restore held up by files it can't change, `checkpoints.restoreHeldUp`, with their paths ([An interrupted restore](#an-interrupted-restore)).
- A checkpoint is its id, a UUID version 7 so that ids sort by time, its time, its mode, its label, and the paths it couldn't read, each with its reason, and for an unreadable one the system's error code.
  An id's millisecond and the 12 bits after it count up as one number, so the ids one runtime gives keep their order even when many are taken in one millisecond or the clock steps back.
- A folder whose path is missing is reported as missing, never captured or compared as empty, as Noldova Desktop's `documents/RUNTIME.md` requires.
- A `checkpoints.*` method whose request isn't its wire form fails with context's `JsonException`, and one whose request holds a value its model refuses, such as a checkpoint id that isn't a UUID version 7, fails with Noldova Desktop's `MethodFailureException` with `InvalidParams`, the refusal's message and the refusal as its cause; Noldova Desktop answers both as `InvalidParams` with that message.
  A failure once the request is read, in the service, is answered as before.
- Tests: "answers a request holding a value its model refuses as invalid parameters, with the refusal's message and the refusal as its cause, for each method that takes a value"; "refuses a request that isn't the method's wire form with the JSON failure itself".

## The store

The store is in the module's folder of the data directory, `~/.noldova/<app>/modules/checkpoints/`, which Noldova Desktop gives the runtime part as `moduleFolder`.

```text
modules/checkpoints/
  empty                 an empty file, given to Git as its global configuration and its attributes and ignore files
  hooks/                an empty folder, given to Git as its hooks folder
  deleted/<identity>-<uuid>/  a folder's store a delete moved aside, only until it is removed
  folders/<identity>/
    folder.json         the folder's last path
    git/                a bare Git repository holding this folder's checkpoints
    housekeeping.json   when the store's last full housekeeping pass ended
    index               the module's index of the folder's files
    restore.json        the journal of a restore, only while one runs or after one was interrupted
```

- One repository per folder keeps each folder's space used and its deletion separate.
- Operations on one folder run one at a time in the runtime part; a request that arrives during one waits for it, and one cancelled while it waits never runs ([Cancelling](#cancelling)).
  Each first reads any journal an interrupted restore left ([An interrupted restore](#an-interrupted-restore)).
  No file lock is needed: one runtime owns each data directory, as Noldova Desktop's `documents/RUNTIME.md` says, and only its runtime part opens the store.
- The module writes `git/config` itself each time it opens a repository, so an edited configuration never lasts.
- Each JSON file the module writes names its format version, and one of a version the module doesn't read fails as unreadable, so a later version of the module can tell an earlier store apart.
  `checkpoint.json` is at version 2, whose unread paths each keep the system's error code, `null` for none; the module also reads version 1, whose unread paths hold only a path and a reason, as paths with no code, refusing one that holds any other field, and writes only version 2.
  `folder.json`, `housekeeping.json`, `index` and the script in a restore's journal are at version 1.
- The protocol's models and the module's stored records read their JSON through `@noldova/context.json`'s `JsonReader`, as Noldova Desktop's protocol does, and each refuses a field it doesn't have.
  A value that isn't one's JSON form throws context's `JsonException`, whose path starts at the model's or record's name, such as `FolderRecord.path`; a stored file that throws it fails as unreadable.
- Tests: "reads a record of format version 1, whose unread paths kept no code, as paths with none"; "refuses a record of format version 1 whose unread path holds a code, a field that version never wrote"; "refuses a record of format version 2 whose unread path has no code"; "refuses a record of a format version newer than the one it writes, naming it"; "lists a checkpoint whose checkpoint.json an earlier version wrote, in format version 1, its unread paths with no code"; "gives the format version of a file that names one of the versions it reads, and refuses any other".

### A checkpoint as a commit

- Each checkpoint is one commit, whose parent is the folder's previous checkpoint, and one reference, `refs/checkpoints/<id>`.
- The commit's tree holds these entries:
  - `files/`, the folder's files, as [Which files a checkpoint keeps](#which-files-a-checkpoint-keeps) says;
  - `checkpoint.json`, the format version, the mode, the label, the folders that were empty, each link's kind, each path that couldn't be read, with its reason and, for an unreadable one, the system's error code, `ignoreRules`: for a checkpoint that followed the ignore files, whether letter case was ignored and the folders of the nested repositories, and `null` for one of every file, and `earlierPaths`, each path kept as the checkpoint before had it ([The turn's start](#the-turns-start));
    format version 3 added `earlierPaths`, and a record of version 2 reads as one with none;
  - `rules/`, only in a checkpoint that followed the ignore files: each `.gitignore` the capture followed, at `rules/<folder>/.gitignore`, as it read it ([Following the ignore files](#following-the-ignore-files)).
- The commit's author and committer name the module, with the time of the capture, and its message is `Checkpoint <id>`.
- `list` reads the references and their `checkpoint.json` in one `for-each-ref` and one `cat-file --batch`.
- The references keep every checkpoint reachable, so Git's packing never loses one.
- Each new reference is a loose file until the idle maintenance packs the references into `packed-refs` ([Keeping and deleting](#keeping-and-deleting)), so `for-each-ref` stays fast with thousands of checkpoints.

### The module's index

- `index` holds the capture's start time, and one entry per file the folder had at the last checkpoint: its path as bytes, its kind (file, executable, link), size, modification and change times in nanoseconds, file id, and Git object id.
- A file whose size, times, file id and kind match its entry is not read again; any other file is read and hashed.
- An entry whose modification or change time is not earlier than the last capture's start, less two seconds, is always read again.
  So a file rewritten during a long capture, in the same tick and at the same size, isn't missed, however long the capture took.
- The module computes Git's object ids itself, while it reads a file, without loading it whole.
- The index is written to a temporary file and renamed over the old one after the checkpoint's reference exists, so a lost index only costs a slower next capture.
- The index replaces Git's own: Git would read the folder's `.gitattributes`, and keep a folder that holds a `.git` only as a pointer to another repository, not its files.

## How Git runs

- The runtime part starts Git through Noldova Desktop's `startProcessAsync`, by the absolute path of the build for the running target, in the folder's `git/` as its working folder.
- Where the build's exec path holds a copy of its program, as macOS's and Linux's `libexec/git-core/git` beside `bin/git`, every command starts that copy.
  A package can't hold a hard link, so the two are separate files with the same bytes, and Git starts the exec path's copy for its own commands; `bin/git` stays in the package and nothing starts it.
  Started from there, Git can't tell its install from its own place, so it finds its commands by `GIT_EXEC_PATH`, which the module always gives, and the variables below keep out every system file it would look for, as they did for the commands Git started itself.
  macOS checks each newly written program on its first launch, about 0.35 s on an x64 Mac, so one copy is checked once instead of two per first capture.
  Windows' MinGit holds one `git.exe`, which runs as before.
- As the runtime part activates, once it has published its service and registered its methods, it starts that Git once with `--version` in the background, so the first capture after an install or an update doesn't wait for the check; an activation that fails before then starts nothing that its deactivation couldn't reach.
  It gets every variable below but `GIT_DIR`, so no configuration of the person's or the system's applies to it either, and a command's time limit.
  The activation never waits for it, a failure never fails it, its deactivation stops it, and the module's log records how long it took, or why it failed.
- The module gives Git these variables, beside those Noldova Desktop passes to every program it starts:
  - `GIT_DIR` is the folder's `git/`, and no work tree is set; every command is one that needs none.
  - `GIT_CONFIG_NOSYSTEM=1`, and `GIT_CONFIG_GLOBAL`, `HOME` and `XDG_CONFIG_HOME` point at `empty` and the module's folder, so no configuration of the person's or the system's applies.
    On Windows, `GIT_CONFIG_NOSYSTEM` also keeps Git for Windows from reading `%ProgramData%\Git\config` and the build's own `etc/gitconfig`; a Windows test plants both and checks that neither applies.
  - `GIT_EXEC_PATH` and, on Windows, `PATH` point into the build; `GIT_TERMINAL_PROMPT=0`, `GIT_ATTR_NOSYSTEM=1` and `GIT_NO_REPLACE_OBJECTS=1`.
- `git/config` holds the settings the store needs: `core.bare=true`, `core.logAllRefUpdates=false`, `core.autocrlf=false`, `core.precomposeUnicode=false`, `core.protectNTFS=true`, `core.protectHFS=true`, `core.hooksPath` at `hooks/`, `core.attributesFile` and `core.excludesFile` at `empty`, `core.bigFileThreshold=32m`, `gc.auto=0`, `maintenance.auto=false` and `commit.gpgSign=false`.
- `git/info/attributes` holds `* -text -eol -filter -ident -working-tree-encoding`, so no line-ending conversion, filter or encoding ever changes a file's bytes.
- The module runs only these commands: `--version`, once as it starts, `init --bare --template=`, `fast-import`, `hash-object -w --stdin --no-filters`, `cat-file`, `for-each-ref`, `update-ref`, `diff-tree`, `diff` between two objects, `count-objects`, `pack-refs --all`, `repack` and `prune`.
  None of them runs a hook.
- Each store keeps one `cat-file --batch-command` for its object reads and one `fast-import` for its captures running between requests, since each start of Git costs 60 to 160 ms on Windows; every other command runs once per request.
  - A request starts either one when it first needs it, or again when the one running has exited, as after a crash.
  - One that fails or is cancelled while it uses either stops it, and the next request starts it again; `fast-import` whose writing failed has its input ended before its checkpoint, so it keeps what it wrote as a pack and makes no reference.
  - A read writes its requests to `cat-file` while it takes the answers, since `cat-file` stops reading once its output is full.
  - `cat-file` runs with `--buffer`, and each read's requests end with `flush`, so it writes its answers in full buffers, as do the one-shot `cat-file --batch` runs that list checkpoints and stage a restore's files, which end at the end of their input; without it, each answer is a pipe write of its own.
  - The module names what it reads by object id; a `<reference>:<path>` name makes Git search the commit's trees again for each one, so ten thousand names in one folder of ten thousand files took 40 seconds where their ids took under half a second, and only `checkpoint.json` is read by its path.
  - Writing to a command waits while it reads more slowly than the module writes; a command that ends early closes its input, which fails a write as a broken pipe or, on macOS, at times as no longer connected; what is written after that is dropped, and its exit says what went wrong.
  - `cat-file`'s output is read as it comes, in parts cut anywhere: a name with no object answers `<name> missing`, and that name may hold a space; output that ends inside a content gives no object for it; and a name `cat-file --batch` gave no answer for reads as missing.
  - `cat-file` finds what a capture wrote after it started, since Git looks for new packs when an object is missing and reads each reference as it's asked for.
  - A store's commands end once neither has been used for 10 minutes, before its housekeeping ([Keeping and deleting](#keeping-and-deleting)), before its folder is deleted, after a request cancelled while it ran, and as the runtime part deactivates: `cat-file` at the end of its input, `fast-import` at its `done`, each stopped if it still runs 10 seconds later.
- Tests: "keeps one cat-file --batch-command --buffer running for each store between reads, flushing each batch, and gives what each reading gave"; "writes each capture to the store's fast-import, kept running, and gives the commit of its mark once the reference is written"; "ends fast-import's input when a writing fails, so it makes no reference, and starts it again for the next capture"; "starts a store's fast-import again once it has crashed between captures"; "keeps its cat-file running between reads, and starts it again once it has crashed"; "fails a long-lived command that ends before its reading has what it needs, with what it wrote, and starts it again for the next use"; "stops a cat-file read that waits past its limit with no output, at the limit and not before, failing as a stopped command"; "ends a store's long-lived commands once the idle delay passes with none in use, or when stopped, fast-import at its done"; "keeps a store's commands running past the idle delay while any use of them runs, and ends them once the last use ends"; "reads a line that comes in parts, and keeps what follows it for the next reading"; "gives the reason of a signal aborted before a long-lived command's use, and starts nothing"; "fails a long-lived command that can't start, and starts it for the next use"; "stops a command still running once the limit after the end of its input has passed, and not a millisecond before"; "reads ten thousand objects, more than 1 MiB in all, in one batch, named by their ids and a few by reference and path, taking cat-file's answers while it writes the requests".
- Git's output is read as bytes with `-z` where a command offers it; diffs run with `--no-ext-diff --no-textconv`.
- A command that hasn't finished within its time limit is stopped, and the operation fails as a whole; so is a read through the store's `cat-file`.
  The commands of the store's housekeeping, `pack-refs`, `repack` and `prune`, run for as long as they take, and stop when a request for the folder comes ([Keeping and deleting](#keeping-and-deleting)).

## Cancelling

- Each request comes with Noldova Desktop's signal, which aborts when its caller cancels it, its time runs out or its connection closes; a runtime part that calls the service may pass a signal too.
  The service joins each request's signal with its own stop, through `AbortSignal.any`, and checks the joined signal, so either one stops the request.
- A request whose signal aborts while it waits for the folder's earlier operations never runs, and the folder's next request runs in its turn.
- One that runs stops at its next safe point and fails with the signal's reason:
  - the walk checks the signal before each entry, and reading the folder's files, to hash them or to describe a change, checks it before each file;
  - each Git command the request started is stopped through Noldova Desktop, and the request fails only once the command has exited, so no Git of it is left running;
  - a request cancelled while it runs, failed or carried to its end, also ends the store's long-lived `cat-file` and `fast-import`, so none of its Git runs after it ([How Git runs](#how-git-runs));
  - a command that ended well before the cancel stopped it keeps its result, so a capture whose `fast-import` has told its commit after its checkpoint writes its index, and its checkpoint stays.
- A capture so stopped stops its `fast-import` before its checkpoint: no reference is created, so no list or read sees a checkpoint, and the index stays as it was; what Git wrote of the run is dropped by the store's housekeeping once it is two weeks old ([Keeping and deleting](#keeping-and-deleting)).
- `list`, `compare`, `read` and `previewRestore` change nothing a cancel could leave half done; `read`'s object of a file of the folder now, which `hash-object` writes whole, stays unnamed until the housekeeping drops it.
- `restore` honours the signal only until it writes its journal: while it plans again, checks the space and takes the checkpoint before it.
  From the journal's first write on, it runs to its end, or stops only as a crash would, and its journal finishes or undoes it ([An interrupted restore](#an-interrupted-restore)), so a cancel never stops a person's files mid-step.
  A restore cancelled once its checkpoint before it was taken keeps that checkpoint.
- The recovery of an interrupted restore that each request starts with always runs to its end.
- `storage` checks the signal as it starts and before each entry it reads, and changes nothing.
- `deleteFolder` honours the signal only until it moves the store aside, also between two tries of that move; from then on it runs to its end, so a cancel never leaves a store half removed.
- Deactivating the runtime part, as when the module is turned off, aborts every request's signal as a cancel would, and ends once none of its requests runs: one still waiting never runs, one running stops at its next safe point, and one that comes to the old service later is refused.
  So none of the old service's requests runs beside those of the service a later activation publishes, whose queues know nothing of them.
- Tests: "never runs an operation cancelled while it waits, gives the cancel to its caller, and runs the next one in its turn"; "stops before its next entry once its signal aborts, inside a folder too, with the signal's reason"; "stops a command whose signal aborts, and gives the signal's reason once the command has exited"; "gives the signal's reason once the command has exited, when its reading fails after a cancel"; "gives the output of a command that ended well before its cancel came"; "never starts a command whose signal aborted before it"; "stops a capture cancelled mid-walk or while its content streams, leaving no checkpoint, its index as it was and no Git running"; "stops a long-lived command whose signal aborts while it's used, gives the signal's reason once it has exited, and starts it again after"; "stops a list, compare, read or preview cancelled while its Git runs, with no Git left running, and runs the next request"; "stops a compare, preview or restore cancelled mid-walk of the folder now, and runs the next request"; "stops a compare or preview cancelled between two files it reads of the folder now"; "stops a compare cancelled while it describes the changes it found"; "stops a restore cancelled before it writes its journal, changing nothing, and carries one cancelled after to its end"; "stops a restore cancelled once its checkpoint before it is taken, before its journal, keeping that checkpoint and changing nothing"; "gives each method its request's signal, so a request cancelled before its turn never runs"; "stops before the rename once its signal aborts, also between two tries without waiting out the delay, leaving the store"; "runs to its end once the store is renamed, though its signal aborts then"; "runs none of its service's requests once turned off, so none runs beside those of the service it publishes once on again"; "stops a read of the space used running as the service stops, which waits for it, and refuses one after, with no store too".

## Which files a checkpoint keeps

The module walks the folder itself, reading names as bytes, and never follows a link.

- **Every file** (the default): every file, link and folder, except each `.git`.
- **The folder's ignore files** (`checkpoints.followIgnoreFiles`): the folder's `.gitignore` files at every depth, read and matched by the module with Git's rules, and never through the person's Git ([Following the ignore files](#following-the-ignore-files)).
  The global ignore file, `.git/info/exclude` and the person's configuration play no part, since the module reads nothing inside a `.git`.
  A nested repository follows its own rules, as its own Git would: the outer folder's rules decide whether its folder is kept at all, and inside it only its own `.gitignore` files apply, from its root down.
- Each checkpoint records its mode, and the setting is read as each capture starts.
- A link is stored as a link, with its target as bytes; on Windows `checkpoint.json` records whether it was a file link, a folder link or a junction.
- A folder with nothing in it is listed in `checkpoint.json`, since Git keeps no empty folders.
- The executable bit is kept on macOS and Linux; other attributes, extended attributes, times and hard links are not, and a restored file gets the restore's time.
- A name Git can't hold, such as a Windows name with an unpaired surrogate, is listed among the paths that couldn't be read.
- A file over 10 MiB isn't read: the checkpoint lists it as too large and keeps no content for it, and a restore of that checkpoint leaves it as it is; a link is kept whatever size it reports.
  A preview doesn't read one in the folder now either, so a file the checkpoint holds that has since grown past 10 MiB stays as it is, as too large; nor does a capture read a file that grows past 10 MiB once the walk has seen it.
  A file of up to 10 MiB is streamed, and Git writes a file over `core.bigFileThreshold` into its store without holding it in memory; a checkpoint an earlier version took may hold larger files, and they restore like any other.
- Tests: "leaves out a file over 10 MiB as too large, keeps one of exactly 10 MiB, and its restore preview keeps the one left out"; "takes no checkpoint when the content it would add is over 1 GiB, and gives that size and the limit"; "restores a large file a checkpoint kept before the size limit, and a file's letter case where the folder ignores case"; "keeps a file that grew past 10 MiB since the checkpoint as too large, and restores the rest"; "lists a file that grows past 10 MiB once the walk has seen it as too large, without reading it again".

### Following the ignore files

- The walk reads a folder's `.gitignore` before its entries, and leaves out each entry the rules ignore.
- The module matches as Git does, on bytes, so `?` matches one byte and never a character of two:
  - a blank line, and one that starts with `#`, gives no pattern; one carriage return at a line's end is dropped, a line is read only up to a NUL, trailing spaces are dropped unless `\` escapes them, and a leading byte order mark is passed over;
  - `!` includes again what it matches, and `\!` and `\#` stand for themselves;
  - a trailing `/` matches only folders, and a link is never a folder;
  - a pattern with no other `/` matches a name at any depth below its file's folder; one with a `/` at its start or within matches the path from that folder;
  - `*` and `?` never match `/`; `**` with only a `/`, or the pattern's start or end, on each side matches across folders, and `**/` also matches no folder; any other `**` is one `*`;
  - `[...]` matches one byte of a set, `[!...]` or `[^...]` one outside it, with ranges and Git's ASCII classes such as `[:alpha:]`, and never `/`; `\` takes the next byte as it is, and a pattern Git finds malformed, such as an unclosed set or a trailing `\`, matches nothing.
- The last pattern in a file that matches a path decides it, and a deeper folder's file that matches decides over those above.
- An ignored folder is never entered, so nothing under it is included again and no `.gitignore` in it is read, as in Git.
- Letter case is ignored as Git's `core.ignoreCase` would be, which `git init` sets from the file system: at each capture the module looks up one of the folder's names, never one left out as a `.git`, with its ASCII letters' case swapped, and the same file means case is ignored.
  A folder with no name to look up takes the system's usual answer: ignored on Windows and macOS, not on Linux.
  The probe writes nothing; the answer is recorded in `checkpoint.json`, and a comparison applies each side's own.
  Like Git, it folds only ASCII letters, and only where Git does: a byte of the pattern, a range and `[:upper:]`, never an escaped byte or a lone byte of a set.
  A wildcard's class never matches the byte 0, which no name holds.
  The probe passes over a name it can't look up for that name alone, by the rules of [Taking a checkpoint](#taking-a-checkpoint), and tries the next; a disk error or running out of file handles stops the capture.
- A `.gitignore` is opened by that name, as Git opens it, so a file system that ignores letter case finds it under any case.
  It is read only when it is a file: not a folder, a pipe, a socket or a device, and not a link, which Git also refuses.
  The module opens it without following a link and without waiting on a pipe, then checks what it opened, so a `.gitignore` swapped for a link or a pipe while the walk reads it can't stop the capture.
  One of 100 MiB or more is passed over, as Git passes it over, and so is one that grows while the module reads it; one the system won't let the module read gives no rules, and the capture lists it among the paths it couldn't read, unless the rules above leave it out.
  Any other error reading it stops the capture, since going on without its rules would keep every file it ignores, such as `node_modules`.
- A nested repository is a folder, below the folder walked, that holds a name left out as a `.git` ([The `.git` left out](#the-git-left-out)); the walk starts its rules afresh there, and `checkpoint.json` lists its folder.
- A folder whose entries are all ignored is listed as empty, so a restore keeps the folder.
- Each `.gitignore` the capture followed is kept under `rules/` as it was read, sharing its object with `files/` when it is kept there too.
  So a checkpoint's rules can be applied again, with the nested repositories' folders, even when a `.gitignore` ignores itself or couldn't be read as a file afterwards.
- Tests: "follows the .gitignore files at every depth as Git matches them: negation, an anchoring \"/\", a trailing \"/\", \"**\" and escapes"; "never enters an ignored folder, so a file included again under it stays out and a .gitignore in it is never read, as in Git"; "lets the outer rules decide a nested repository's folder, and only its own .gitignore files what is in it"; "matches letter case as the folder's file system does, and records which".

### The `.git` left out

- A `.git` is left out at every depth, the folder's own and each nested repository's or submodule's, whether it is a folder or the file that points a linked work tree or a submodule to its repository: each is the person's repository storage.
- The walk never enters, lists or reads a `.git`, nor opens it for reading; it sees its name in its parent's listing, and reads only its metadata, for its file id.
- Every name some file system can resolve to `.git` is left out as a `.git`, on every system, by the rules Git's `is_ntfs_dotgit` and `is_hfs_dotgit` apply:
  - `.git` in any letter case, such as `.GIT`, which is the repository itself on a folder that ignores letter case;
  - Windows' short name `GIT~1`, in any letter case;
  - either of those followed by dots or spaces, such as `.git.` or `.git `, or by a stream, such as `.git::$INDEX_ALLOCATION`, which Windows resolves to `.git`;
  - `.git` with any of the code points HFS+ ignores, such as U+200C, which HFS+ resolves to `.git`.
  Git refuses such a name in a checkout where it resolves to `.git`; the module leaves each out on every system, so a checkpoint taken on one restores safely on another, and a file that really has such a name, such as a real `.GIT` on a folder that tells letter case apart, stays out of every checkpoint, which the preview says.
- In a folder that holds a `.git`, an entry with the `.git`'s file id is left out too, so another name for it, such as a different short name or a hard link to a `.git` file, is never read.
- The rest of a nested repository's folder is kept like any other folder, so a checkpoint holds its files but not its history.
- A bare repository under another name, such as `mirror.git/`, holds no `.git`, so it is kept, compared and restored as plain files, like any other folder.
- Every other name is stored as it is, such as `.gitignore` or `.git~`, so the store needs no mapping of names.
- Tests: "never enters a .git, the folder's own or a nested repository's, nor a .git file, and keeps the rest of a nested repository"; "never reads inside a .git, even one the system won't let it open"; "leaves out every name Git treats as .git that the system can hold: another letter case, the short name, an HFS+ ignorable"; "leaves out and records another name with a .git's file id, such as a hard link to a .git file".

## Taking a checkpoint

1. Check the folder exists.
2. Walk the folder and compare each file with the index, which gives the size of the new and changed files, leaving out each file over 10 MiB and, with `asOf`, each file the turn changed ([The turn's start](#the-turns-start)).
3. Answer `TooLarge` when that size is over 1 GiB, and otherwise check the free space for it ([Low disk space](#low-disk-space)).
4. Stream each new or changed file's content to the store's `fast-import`, hashing it on the way for the index; Git skips content its store already holds.
5. Then write the commit, listing every path's object, with the store's newest checkpoint as its parent, and ask for a `checkpoint`, which writes the pack and the reference, then for the commit's mark, which `fast-import` tells once both are written.
6. Write the new index.

- The module remembers each store's newest checkpoint, the reference whose name sorts last, as one `for-each-ref` reads it at the store's first capture and as each capture takes one, so a capture runs no `for-each-ref`; a capture that fails, and a delete, make the next capture read it again.
- Tests: "reads the newest checkpoint with one for-each-ref, then takes each capture's as the next one's parent, and reads it again after a delete"; "reads the newest checkpoint again after a capture that fails"; "counts a meter set again from the bytes written since, as each capture through a long-lived fast-import sets its own".

- `fast-import` takes each content with its size declared first, so the module declares the size it read from the file's metadata and sends exactly that many bytes.
  A read that fails once a file's content is on its way fails the capture, since `fast-import` would read what follows as the rest of that content.
  The capture's `get-mark` is followed by no blank line, since `fast-import` fails on an empty command.
  When the file ends early or turns out longer, or its size or times changed by the end of the read, the module sends the rest as zeros or stops at the declared size, never names that content in the commit, and reads the file again; the unnamed content is removed by the next pruning.
- A file that changes while it is read is read again, up to three times in all; after that, and for a file the system won't let the module open, the checkpoint lists the path with the reason and keeps no content for it.
  A listed path stays as it is in any restore of that checkpoint.
- A path that is gone by the time the module reads it is left out, as the folder no longer holds it.
  One the system refuses or another program holds (EACCES, EPERM, EBUSY) is listed as denied, and one that has become a loop of links (ELOOP) as changing, since another program changed it during the walk.
  A disk error (EIO), or the process or system out of file handles (EMFILE, ENFILE), stops the capture with that error rather than keep a checkpoint that hides it, since every later read would fail too.
  Any other error the system gives for the path, such as a name too long for it (ENAMETOOLONG), a network share that timed out or went stale (ETIMEDOUT, ESTALE), or a cloud file that isn't on the computer, lists the path as unreadable with the error's code, so one such file never blocks every checkpoint of the folder.
  An error that isn't the system's, one with no error number, stops the capture as the module's own fault.
  On Windows, a link whose target the module can't look at is listed the same way and kept neither as an entry nor as a link; one whose target is missing or a loop of links is kept as a file link.
- Tests: "takes a path the system won't let the module read, or holds for another program, as denied"; "gives a link found where a file was opened without following links as Changing"; "takes any other system error as one path the module couldn't read, and records its code"; "lets a disk error, running out of handles, an error that isn't the system's, and anything else through as it is, so the capture fails with it"; "lists a link on Windows whose target the system won't let it look at as Denied, with no entry or link record"; "passes over a name the system won't read for that name alone, such as one too long for it, and takes the next".
- Each file in a checkpoint is whole as it was at one moment, but the folder as a whole is not one moment: while an agent or another program writes during the walk, files read at different times may not belong together.
  An app that needs the folder settled takes the checkpoint when its own writes are done, such as at the end of an agent's turn.
- The free space is checked again while content streams, and a capture whose volume falls below the reserve stops, leaving no checkpoint.
- An interrupted or cancelled capture leaves no reference, so no checkpoint; its stray objects are removed by the next pruning ([Cancelling](#cancelling)).
- A folder with no files gives a checkpoint whose `files/` is empty.
- A capture that finds nothing changed still gives a new checkpoint, with its own label, sharing all its content with the last.

### The turn's start

- An app that takes a checkpoint for each turn of an agent gives the time the turn started, `asOf`, and takes the checkpoint once the turn is under way or done, in the background, so the turn never waits for it.
  The checkpoint then keeps each file the turn changed as the last checkpoint had it, as far as the files' times tell, not as it was when the turn started: a restore of it undoes the turn and, with it, any change the person made to those files after the last checkpoint and before the turn.
- A file whose modification or change time is at or after `asOf`, less two seconds, is the turn's: the checkpoint keeps it as the checkpoint before had it, and leaves it out when that one didn't hold it.
  The two seconds cover a file system that keeps times to two seconds, such as FAT, as the index's do ([The module's index](#the-modules-index)).
- A file the turn deletes, rewrites or keeps changing while the capture reads it, and a link it retargets then, is kept the same way: a read that finds the file changed reads it again, and keeps the earlier copy when its time is now at or after the cutoff.
- A file gone before the walk from a folder whose time is at or after the cutoff, or from under a folder gone with it, is kept as the checkpoint before had it; one gone from an older folder is left out, since it went before the turn.
  A folder's time is read again once the walk has been through what it holds, so a file the turn deletes anywhere in it while the walk runs, a later sibling of a folder being walked too, still counts as the turn's; a folder deleted while the walk is inside it keeps no time, and the folder above it decides.
  A file replaced by a folder of the same name is decided by that folder's own time, and is the person's change, kept as the folder now is, when the folder holds a file older than the cutoff; when the earlier file is kept, the folder's contents are left out, since the checkpoint can't hold both.
  A path the walk leaves out as ignored, as a repository's or as unreadable, or one under such a folder, is never brought back.
- `checkpoint.json` lists each path so kept as `earlierPaths`, and a restore's plan names those its steps write ([The preview](#the-preview)), so the person can see which copies are the last checkpoint's.
- The times are the file system's, so the cutoff follows the clock: one stepped back between turns makes the files changed since the last turn look like the turn's, and they keep their earlier copies; one stepped forward makes the turn's files look older, and the checkpoint keeps them as the turn left them.
  A program that sets a file's times back, as an unpacker may, can likewise make the checkpoint keep that file as the turn left it.
- A capture without `asOf`, such as the one before a restore, keeps the folder as it reads it.
- Tests: "keeps the earlier copy of a file changed at or after the turn's start, leaves out a file new since then, and its restore preview names the earlier copies"; "counts a file changed within two seconds before the turn's start as the turn's, since a filesystem may keep times to two seconds, and reads one changed earlier"; "keeps the earlier copy of each file changed since the last turn when the clock stepped back between turns"; "keeps the earlier copy of a file the turn deletes while the capture reads, and leaves out a new one it deletes"; "keeps the earlier copy of a file deleted from a folder changed at or after the turn's start, a whole deleted folder's too, and none from an older folder"; "brings back no earlier copy of a path the ignore files now ignore, a file or one under an ignored folder"; "brings back no earlier copy of a file under a folder the walk can't read"; "keeps the earlier copy of a file the turn rewrites, or a link it retargets, while the capture reads it"; "keeps the earlier copy of a file the turn replaced by a folder, and leaves out what the folder holds"; "takes a folder's time after it lists the folder, so a file deleted before the listing shows in the folder's time"; "takes a folder's time again once it has walked what the folder holds, so a later file deleted meanwhile shows in it"; "keeps no time for a folder deleted while it walks what the folder holds, so the folder above it decides"; "keeps a folder the person put in place of a file before the turn, by a file in it older than the turn's start, with what the turn added left out".

## Changes

A comparison lists each side whole, then compares them path by path, so a folder, an empty folder and a folder that couldn't be read are told apart as well as files.

- A checkpoint's side is its `checkpoint.json` and one `diff-tree -r -z --no-renames` from the empty tree to its commit: each file and link under `files/` with its mode and object, and each `.gitignore` under `rules/`, from which its rules are built again with its letter case and nested repositories.
- The folder now is walked in the checkpoint's own mode, whatever the setting is now: a checkpoint of every file against every file, and one that followed the ignore files against the folder's `.gitignore` files now.
  Each file the index can't vouch for is hashed as Git would, read again while it changes, and nothing is written to the store or the index.
  A restore's preview walks the folder now the same way ([The preview](#the-preview)).
- `compare` writes nothing; two checkpoints of a folder whose path is now missing still compare, since the store is kept by the identity, and only a comparison with the folder now reports it missing.
- A change is a path, in the byte order of the paths, added, deleted, modified, changed in kind or unknown, with each side's kind, size and whether it is text:
  - a path either side couldn't read, itself or a folder above it, is unknown, with that side's reason, never deleted, and a folder that couldn't be read stands for every path under it;
  - a path either side's rules ignore, itself or a folder above it, is on neither side;
  - a `.git`, or a name left out as one, is on neither side: a checkpoint never holds one, and the walk of the folder now never enters one;
  - a file, a link or a folder that became another of them changed in kind, and the paths under the folder are added or deleted; a folder that holds files is told by its files, and only an empty one is added or deleted itself;
  - a file whose content changed, or that became executable or stopped being so, is modified;
  - there is no rename detection: a moved file is deleted at one path and added at the other.
- A side is text as Git's diff tells it: at most `core.bigFileThreshold`, 32 MiB, with no NUL in its first 8,000 bytes, read from a checkpoint's objects and from the folder now's files.
  The objects are sized first with an `info` of each to the store's `cat-file`, and only those of at most 32 MiB are read, with a `contents` of each, so a larger object's content is never sent.
- A file or link of the folder now is read only as the one the walk or the look-up found, even when something is swapped in after it:
  - a file is opened without following a link, where the system has the flag, and without waiting on a pipe, and is read only while the open file is a file with the same device and file number, at most 32 MiB and one byte for a diff;
  - a link's target is read only while the link has the same device and file number and the target found, by its Git object id, since a link made in place of another can take the file number just freed, as Linux mostly gives it;
  - either is given only while its folder, with every link resolved, still lies inside the folder, so a link or a junction swapped in above it is never read through;
  - Windows has no flag that refuses to open a link, and there the file number is what refuses one;
  - a path that became another file gives `Unknown`, and one deleted after the look-up is diffed as deleted, since the checkpoint's side is read before the folder now's.
- `read` gives a file's content from an `info` then a `contents` to the store's `cat-file`, which keeps up to the caller's limit, at most 16 MiB, and reads the rest of the output through without keeping it, so a large file is never held whole.
- `read` against another checkpoint or the folder now gives the line diff from `diff --no-ext-diff --no-textconv --no-color` between two objects, from its first hunk, cut at its last whole line within the limit; a result shorter than its whole size is marked cut.
  - A file only one side holds gives a diff of all its lines added or deleted, written as Git writes it; a path that is a folder on the other side counts as not held there.
  - A side that isn't text gives `Binary`; a stored side is read whole when it is at most 32 MiB, and never read when it is larger.
  - For a diff against the folder now, the module first sends the file's current content to `hash-object -w --stdin --no-filters`, so both sides are objects in the store; no checkpoint names that object, so the next pruning removes it, and nothing else is written.
  - A path of the folder now is found name by name from each folder's listing, never through a link or into a `.git`: a name not written as the folder holds it, in another letter case or with a `\` Windows would take as a separator, finds nothing, and a folder that can't be listed gives `Unknown`.
- Tests: "reports a path either side couldn't read as Unknown, never deleted, with a folder it couldn't read standing for its paths"; "finds no .git at any depth on either side, under any name a file system takes for one"; "reports the folder now missing, or not a folder, while two of its checkpoints still compare"; "reports a path that became another kind as KindChanged, and the paths under a new folder as added"; "gives names that aren't ASCII as the file system holds them, in their bytes' order"; "cuts a large file at the caller's limit and marks it cut, with the whole file's size"; "diffs a file against the folder now by putting its content there in the store as one object, and writes nothing else"; "reports Unknown for a file swapped for a link to a file outside the folder, and never reads or stores it"; "reports Binary for a text file grown past 32 MiB, reading no more than a byte past what Git would diff"; "reports a checkpoint's side over 32 MiB as Binary by its size alone, never reading its content".

## Restoring

A restore runs only on the person's request, through its preview.

### The preview

- `previewRestore` compares the checkpoint with the folder now and lists each path the restore writes, replaces or deletes, and each path that stays as it is, with its reason:
  - each `.git`, and each name left out as one ([The `.git` left out](#the-git-left-out)), which the restore never reads, writes, replaces or deletes; a real `.GIT` on a folder that tells letter case apart stays for the same reason, since Git treats it as repository storage;
  - each folder that holds a `.git` at any depth, and each folder above one, which the restore never moves, replaces, renames or removes ([A repository's folders](#a-repositorys-folders));
  - in a checkpoint that followed the ignore files, a path ignored by the checkpoint's rules or by the folder's current ones, the folder now walked in the checkpoint's own mode, as [Changes](#changes) says;
  - a path the checkpoint couldn't read, or that the checkpoint or the folder now holds over 10 MiB;
  - a link this system won't let the module create, in the checkpoint or in the folder now, since a rollback puts a moved-aside link back by creating it again.
- The plan records each path's state now, the file id of each folder on its way from the folder's root, and the bytes the restore will write.
- The plan's `earlierPaths` names each path a step writes that the checkpoint kept as the checkpoint before had it, so the preview can say those copies are the last checkpoint's, which undoes any change made to them after it ([The turn's start](#the-turns-start)).
- A preview may list the paths the restore is limited to, `paths`, relative with "/" between names; without them it plans the whole folder.
  Each must equal the path a comparison gives exactly, letter case and Unicode normalisation included, and one holding `\` is refused on every system.
  The plan then holds only the changes at or under a listed path, and those above one that the restore needs: a change whose checkpoint side is a folder, such as a file now where the checkpoint holds a folder, but never a path the checkpoint doesn't hold, nor a file written over a folder now.
  It reports only the stays at, under or above a listed path, and records the state of its own paths alone, so a file changed outside them after the preview neither changes the restore nor refuses it as `MovedOn`.
  The plan carries the same `paths`, and the restore plans again with them.
  A folder the checkpoint doesn't hold is removed when it is at or under a listed path, or above one with nothing the walk found under it outside them; any other stays.
  A rename is a deletion and an addition, each restored only when its own path is listed: moving a file out of a listed folder writes it back there and leaves the moved copy, and moving one into it deletes it there without writing back the other.
  - Tests: "restores a listed file and leaves every other change, and the stays outside the list, as they are"; "restores everything under a listed folder, removing a folder the checkpoint doesn't hold, and nothing outside it"; "treats a rename across the list's edge as a deletion and an addition, restoring only the side whose path is listed"; "restores after something outside the list changes since the preview, and leaves that change and an unlisted new folder as they are"; "still refuses the plan when a listed path changes since the preview"; "removes a new folder above a listed path only when everything in it is listed"; "leaves a path above a listed one that the checkpoint doesn't hold as it is, such as a file now where the listed path was made"; "leaves a sibling whose name starts with a listed folder's as it is"; "puts back a folder above a listed path that the folder now holds as a file, and reports a stay above a listed path".
- The plan stores no letter case rule: the restore reads it from the names each folder lists ([Carrying it out](#carrying-it-out)).

### A repository's folders

A folder that holds a `.git`, at any depth below it, is part of a repository the person keeps, so the restore never moves, replaces, renames or removes it, nor any folder above it.

- A change of kind at such a path stays: when the checkpoint holds `vendor/lib` as a file and `vendor/lib/` now holds a cloned repository, `vendor/lib/` stays, and so does `vendor/`.
- A case-only rename of such a folder stays, and so does its deletion when the checkpoint doesn't hold it.
- The files inside it are restored like any others, each on its own, and never by moving the folder.
- Step 1 checks again that no folder the plan moves, replaces, renames or removes holds a `.git`, so a repository cloned after the preview ends the restore before it changes anything.
- A moved-aside folder is walked before it is removed, by a walk that never enters a `.git`; when that walk finds one at any depth, the restore rolls back, which moves the folder back.
- Tests: "keeps a folder that holds a .git at any depth, and each folder above it, through a change of kind, a case-only rename and a deletion"; "ends the restore when a repository appears in a planned folder after the preview"; "moves back a moved-aside folder in which a .git appeared".

### Writing only inside the folder

The restore writes only where the plan says, never through a link and never into a `.git`.

- Before and after each change, the module checks each folder on the path from the folder's root down with `lstat`, which never follows a link: each must still be a folder, not a link or a junction, with the file id the plan recorded, or, for a folder the restore created, the file id it had when first checked.
- A staged file is created as a new file, failing when any entry already has its name, so it is never written through a link.
- A staged file is renamed into place only where nothing has the target's name, so a name the system finds as another entry, such as a short name of `.git` on Windows, is never written through.
- A target is moved aside only when its file id is the one the checkpoint taken before the restore recorded, so a name that leads to another entry is never moved.
- A mismatch before the journal is marked as applying ends the restore before it changes anything; a mismatch at a step rolls the restore back, undoing that step too.
- Node offers no rename relative to an open folder, so a check and its change are separate calls; the check after each change narrows what a link swapped in between could do to that one change, which the rollback then undoes.
- The plan never holds a name Git treats as `.git` ([The preview](#the-preview)).
- The rollback, and the resume from a journal, run the same checks.
- Tests: "ends the restore when a folder on a planned path becomes a link after the preview"; "fails a path whose folder on its way became a link, naming the path"; "never writes through an entry that already has the staged file's name".

### Carrying it out

1. Check the plan: plan again, and refuse with `MovedOn` when the plan's state differs, which covers each planned path, each folder on its way, and a repository that appeared in a planned folder; then check the free space ([Low disk space](#low-disk-space)).
2. Take a checkpoint of the folder now, labelled `Before restore`, in the restored checkpoint's mode.
   It is the restore's way back and the person's undo.
   When it finds a planned file or link with other content or another file id than the plan did, or couldn't read a planned path, the restore ends with `MovedOn` before it changes anything.
   When the checkpoint would add over 1 GiB, it isn't taken, and the restore ends with `TooLarge`, with that size and the limit, before it changes anything.
3. Write the journal, `restore.json`, with the whole script ([The journal](#the-journal)).
4. Stage: write each new content into a folder of the restore's own at the folder's root, `.~<restore id>/`, as `<step>`, and flush each staged file to disk.
   The temporary names don't grow with the targets' names, so a target whose name is at the system's limit restores too.
   A target on another volume than the folder's root fails its placement, and the restore rolls back.
5. Mark the journal as applying, then apply in order, writing each action's record first:
   - move aside each target to replace or delete, deepest first, to `.~<restore id>/<step>.old`, and compare it with its entry in the checkpoint taken before the restore: a folder by its file id, and a file or link by its kind, size, modified time and file id, since a rename may move its change time.
     Where those match, a link's target and a file's content are compared with the entry's object id too, a file's read in chunks of 64 KiB, since another program may put a file or link in its place with its size and modified time, and the system may give it the file id just freed, as ext4 does; a file the system won't let the module read, after the pauses a rename takes while another program holds it, counts as changed.
     That costs one more read of each file the restore replaces or deletes.
     A restore that resumes at a target already moved aside compares it in the same way before it goes on, so a stop during the compare never lets another program's file through.
     A mismatch means another program wrote it after that checkpoint: the restore rolls back, so the write is never lost.
   - create each folder the checkpoint holds and the folder doesn't, shallowest first;
   - put each staged file in its place, never over what another program put at its name meanwhile, each way failing when the name is taken: a file by a hard link, so it keeps its file id, or, on a volume without hard links such as FAT, exFAT or some shares, by a copy: created first on a name nothing has, its file id recorded, then its content, times and mode written and flushed, and removed again, still empty, if its record fails; a link by a new link to the same target, since a hard link on macOS would follow it, its file id recorded once it is made; then its staged name is removed.
     A name that already is the staged item, or a link to the same target, as when a placement stopped before its staged name went, counts as placed; one that holds a copy or link whose file id the journal recorded, which a stop may have left part written, is removed and made again.
     A file another program put at the name is never taken for the restore's, even with the same bytes.
     A rollback puts a moved-aside item back the same way, and a folder by a rename after a check of the name, made again before each retry, since no other program's file can take a folder's place in a rename.
     On Windows a new link is a file link or a folder link by what its target is from its new place, so a junction moved aside comes back as a folder link;
   - remove each folder the checkpoint doesn't hold, deepest first, once it is empty; one that isn't empty holds what another program wrote, and stays.
   A folder that holds a `.git` at any depth, or one above it, is never moved aside or removed, so a nested repository's folder stays with its `.git` even when the checkpoint holds none of its files ([A repository's folders](#a-repositorys-folders)).
6. Mark the journal as cleaning, compare each moved-aside item again, and keep in a checkpoint labelled `Recovered after restore` any that another program changed since it was moved, each at the path it had.
   That checkpoint is of every file it keeps and leaves the folder's index alone.
   Its id is recorded first, so a later try gives the checkpoint already taken with that id instead of taking another.
   Then remove the moved-aside items and the restore's folder.
7. Remove the journal, and raise `checkpoints.restored`, on a resumed restore too.

- Once the journal is marked as cleaning the folder holds the checkpoint, and only a `.git` found in a moved-aside folder rolls the restore back.
  Any other failure from then on, such as a moved-aside item another program holds open, keeps the journal: the restore answers `Restored`, the module raises `checkpoints.restoreHeldUp` with the restore's folder, `.~<restore id>`, and it finishes the cleanup at a later operation on the folder, holding the folder up meanwhile ([An interrupted restore](#an-interrupted-restore)).
- Tests: "counts a restore done whose moved-aside items it can't remove yet, holds the folder up, and removes them once it can"; "takes the checkpoint of the changed moved-aside items once when the restore stops after recording its id"; "places a file by a hard link that keeps its file id, then removes its old name"; "never places a file over one another program put at its name, and finishes a placement that stopped before its old name went"; "places a file by a copy where the volume makes no hard link, created on a free name and its file id given before its content, times and mode"; "never copies a file over another program's, even one of the same bytes, and makes again a copy the journal recorded, which a stop may have left part written"; "makes again a copy a restore placed on a volume without hard links, when it stopped right after recording the copy"; "makes again a copy a rollback returned on a volume without hard links, when it stopped right after recording the copy"; "makes again a copy a rollback made again from the checkpoint taken before the restore on a volume without hard links, when it stopped right after recording the copy"; "places a link by a new link to the same target, a file's, a folder's or a missing one's, and gives its file id"; "never places a link over what another program put at its name, and finishes one that stopped before its old name went"; "rolls back a link it placed by a new link, by the new link's file id"; "restores on a volume without hard links by copies, and rolls back by the copies' file ids"; "places a link to a folder, or to one that is gone, by a new link, never over what another program put at its name"; "keeps a link the folder has now, which a rollback would make again, when the system won't let the module create one"; "keeps a link as one it can't create, and restores the rest, when this process can't create links".

- Letter case: on a system that ignores case, a file whose name differs only by case is moved aside under its old name before the new one is placed, so it is never deleted as a separate file.
  A folder to create whose path differs only by case from a folder the restore removes, and which is empty once its items are moved aside, is renamed to the checkpoint's case instead, on any system; a folder the system already finds at the path, on a system that ignores case one under another case that holds what stays, such as a `.git`, is used under the case it has.
  A folder is removed only when its parent lists it by its exact name, so removing an old name never removes the new one.
- A change another program holds up, as Windows does with a file open, is tried 3 times, 100 ms then 200 ms apart, then the restore rolls back.
- Before the journal is marked as cleaning, each folder the restore changed is flushed to disk, on Windows through a handle that may write, which Windows needs to flush one.

### The journal

- The journal's first record holds the whole script: each step with its staged file and its moved-aside name, the folders created and removed, and the file id of each folder on the steps' way.
- Each record after it names one action before it runs: the journal marked as applying, a target moved aside, a folder created or renamed to the checkpoint's case, a staged item placed, with its file id, and its copy's or new link's once it is created, before its content is written, a folder removed, the journal marked as cleaning, the changed moved-aside items kept, with the id of the checkpoint that keeps them, the rollback begun, each folder the rollback makes again, and each copy it creates, before its content is written, of a moved-aside item it moves back or of a file it writes again from the checkpoint taken before the restore.
- It is written ahead: each record is appended and flushed to disk before the action it names runs, and each record carries a SHA-256 checksum, so a torn last record, even one that lacks only its line feed, is ignored, and cut off when the journal is read, so the next record follows the last whole one.
  Only an append is torn, and only at the journal's end, so a first record that isn't whole, or a record that isn't whole before the last one, leaves the journal unreadable, as it is, and the folder held up.
- A write that writes only part of a record, as a nearly full disk does, writes the rest, so the record is written whole or the write fails, and the journal is created or appended to only with whole records.
- An append that fails, such as on a full disk, cuts the journal back to its length before the append, then gives its failure, so a later append never follows a torn record.
- The journal file is created by writing a temporary file, flushing it, renaming it into place and flushing the folder.
- Each action can run again over its own part done, so a resume runs again the action of the last record, then the rest.
- Tests: "cuts a failed append back to the last whole record, so the next append and a read keep both whole records"; "writes the rest of a record whose write wrote only part of it, so the next append and a read keep each whole record"; "writes the rest of the first record whose write wrote only part of it, so the journal it renames into place reads whole".

### An interrupted restore

The journal makes a restore finish whole or not at all.

- Every operation on a folder first reads any journal left behind.
- A journal not yet marked as applying means the folder is unchanged: the module removes the restore's folder and the journal.
  While another program holds a staged file there past its 3 tries, the module keeps the journal and holds the folder up, raising `checkpoints.restoreHeldUp` with the restore's folder, `.~<restore id>`; a restore that fails while it stages answers `HeldUp` then instead of `RolledBack`.
- A journal marked as applying means the restore is part done: the module resumes it from its last record, with the staged files and the moved-aside items.
- If it can't finish, the module rolls back, the newest record first: it removes each file or link the restore placed, by the file id the journal recorded for it or its copy, names back each folder it renamed, removes each folder it created unless another program wrote into it, makes again each folder it removed, and moves each moved-aside item back to its target, so the folder is as it was.
  A target whose moved-aside item is gone, as when another program removed it, is made again: a folder empty, as the restore found it once its items were moved aside, and a file or a link from the checkpoint taken before the restore; when that checkpoint is gone too, its path is held up.
  Each folder it makes again has a new file id, which the checks of the paths under it take, and its record makes a later try of the rollback take it too.
  An undo that fails for any reason, such as a path the system won't let the module read, leaves that path and goes on with the others; so does a failure to read or stage the files of the checkpoint taken before the restore, for each path it would write.
  Then it removes the restore's folder; a failure there is held up too, with the folder's name.
  The journal records the rollback first, so an interrupted rollback resumes the same way.
- A rollback that can't finish, such as when another program has put a file where a moved-aside item goes back, keeps the journal, and so does a cleanup that can't finish:
  - the module tries again at each operation on the folder;
  - meanwhile it refuses captures and restores of that folder with `HeldUp`, and previews with `HeldUp`;
  - it raises `checkpoints.restoreHeldUp`, naming the paths it couldn't change.
- A journal whose first record can't be read keeps the folder held up the same way, since that record is written whole and such a journal means the store was damaged.
- Tests: "finishes a restore interrupted at the removal of its journal when the folder is next opened"; "holds the folder up when a restore that fails while staging can't remove what it staged, and removes it once it can"; "finishes a rollback interrupted just after it was recorded when the folder is next opened"; "finishes a rollback interrupted at the journal's removal when the folder is next opened"; "finishes a rollback stopped just before it records a folder it makes again when the folder is next opened"; "finishes a rollback stopped just after it records a folder it makes again when the folder is next opened"; "finishes moving back an item whose move stopped before its moved-aside name went"; "counts an undo that fails for any reason as its path's, and goes on with the others"; "holds the folder up when its rollback can't remove its staging folder, and removes it once it can"; "holds up the paths whose moved-aside items are gone while it can't stage them again, and writes them once it can"; "refuses captures and restores while its rollback can't finish, raises the held-up event, and finishes the rollback once it can"; "rolls back, keeping the file, when another program writes a planned file after the checkpoint taken before the restore"; "rolls back, keeping the file, when another program puts in place of a planned file one of its size, modified time and file id"; "rolls back, keeping the link, when another program puts in place of a planned link one to another target with its size, modified time and file id"; "rolls back, keeping the file, when another program keeps the restore from reading a planned file once it is moved aside"; "rolls back, keeping the file, when the app stops once it has moved aside a planned file another program put in place, as the folder is next opened"; "restores a planned file whose read for the compare fails once while another program holds it"; "keeps in a checkpoint what another program wrote to a file after the restore moved it aside"; "makes again what another program removed from where the restore moved it, from the checkpoint taken before it, as it rolls back"; "renames a folder whose name differs only by letter case, and back as it rolls back".
- The restores interrupted before and after each record of their journal are one generated test a record, in the "RestoreRunner, interrupted" block of `src/noldova.checkpoints/tests/services/restore-runner.interrupted.test.ts`, so no "Tests:" line names them.

## Low disk space

- A capture needs, on the store's volume, 2 GiB free beyond the size of the new and changed files it will add.
- A restore needs, on the folder's volume, 2 GiB free beyond the bytes it stages, and the capture's need for its checkpoint before the restore.
- Free space is what the system lets the person's account write, read with Node's `statfs`, which asks the volume on Windows too, before each capture and restore, and again each time 64 MiB more of a capture's content has streamed, but at its last write, the checkpoint's own record, after which fast-import completes.
  The two needs of a restore add up when the folder and the store are on one volume.
  On APFS, space the system can purge, such as cached files, counts as free only once the system has purged it, so a nearly full Mac may pause captures that a purge would let through.
- While a capture's content streams, the volume needs 2 GiB free beyond the part still to come; a capture that falls below it ends its `fast-import`'s input before its checkpoint, so no checkpoint is taken and the index stays as it was.
  Git keeps what a stopped run wrote, as a pack or loose objects, and writes a `fast_import_crash_<pid>` report; the capture lists the store's `objects` folder and crash reports at its first check of the space, while the capture's objects are still only the pack `fast-import` is writing, and after a stop removes what the run added, since no reference names it and the folder's operations run one at a time.
  No check runs for the final checkpoint, where `fast-import` writes the reference, so a stop always ends the run before it and the run fails.
- When a capture the app asks for lacks the space, it is not taken: it answers `LowDiskSpace`, the module posts the folder's `checkpoints.lowDiskSpace` notification, "Checkpoints paused", that says the space free and the space needed, replacing the one an earlier capture posted, and raises `checkpoints.capturePaused`.
  The folder's next capture that is taken dismisses the notification and raises `checkpoints.captureResumed`.
  The module knows of a pause while its runtime part is active, as Noldova Desktop keeps the notification; after a restart, the next capture without the space pauses again.
- A restore whose checkpoint taken before it runs out of space answers `LowDiskSpace` and changes nothing.
  Only the captures the app asks for pause and resume the folder's captures: a restore's checkpoint taken before it posts no notification and raises neither event, since the restore's own answer tells the app.
- The store's housekeeping runs only with 2 GiB free on the store's volume beyond the size of the store's objects ([Keeping and deleting](#keeping-and-deleting)).
- Tests: "takes no checkpoint where the store's volume lacks 2 GiB free beyond the new and changed files, and answers the space free and needed"; "stops a capture whose store's volume falls below the margin while its content streams, and leaves the store as it was"; "takes a capture whose 64 MiB step falls on its final write, checking no space there, since fast-import completes there, and keeps its objects"; "posts the low-disk-space notification for a capture without the space, replaces it at the next, and dismisses it at one taken after"; "raises the paused event at each capture without the space, and the resumed event once, at the next one taken, for that folder alone"; "refuses a restore without the free space it needs, or whose checkpoint taken before it runs out of space, and changes nothing"; "refuses a restore whose checkpoint taken before it would add over 1 GiB, with that size and the limit, and changes nothing".

## Keeping and deleting

- Every checkpoint stays until the person deletes it: the module deletes only when the app asks, one folder whole.
- The storage view lists every folder with its space used, the sum of its store's files, and deletes all of one folder's checkpoints when the person asks; until it exists, an app offers the same through `storage` and `deleteFolder`.
- Deleting removes the folder's store; a folder whose store is deleted starts again at its next capture.
  - A delete runs as an operation of the folder's queue, so it waits for the folder's earlier operations, and a housekeeping pass running on the store stops first, as for any request; it ends the store's long-lived `cat-file` and `fast-import` before it moves the store, since Windows refuses to rename a folder a program runs in.
  - It first finishes or undoes an interrupted restore of the folder, as every request does; while that can't finish, it answers `HeldUp` and deletes nothing, since the restore's journal is what puts the person's files right.
  - It moves `folders/<identity>/` whole to `deleted/<identity>-<uuid>/`, then removes that folder, retrying files the system still holds, as Windows may for a moment; a move the system refuses while it holds a file, as an antivirus may, is tried again every 250 ms for about 5 s, and one it refuses otherwise fails the delete at once, leaving the store whole.
    So a crash mid-delete never leaves a half store that the folder's next capture would open.
  - A moved store the delete couldn't remove is written to the module's log; as the runtime part activates, it removes in the background what `deleted/` holds then, never a store a delete is removing; its deactivation stops it before its next store, and ends once it has stopped.
- Tests: "deletes all of a folder's checkpoints, and the folder's next capture starts a new store"; "answers Deleted for a folder never captured, and lists no space used"; "deletes only the folder it names"; "waits for a capture running on the folder, then deletes the store with that capture's checkpoint"; "stops a pass running on the folder's store, and deletes the store once the pass's Git command has exited"; "answers HeldUp and deletes nothing while an interrupted restore of the folder can't finish"; "renames the store again while the system holds a file in it, 20 tries 250 ms apart, and fails with the error after its last try, or at once for another error"; "deletes a store once the system lets go of a file held open in it, as Windows refuses the move until then"; "moves a store only once a read of the space used that started has ended, and leaves the folder out of a read during the move"; "never runs a delete still waiting as the service stops, and leaves the store"; "waits for a delete running as the service stops, which runs to its end once it has moved the store"; "stops sweeping before its next store once its signal aborts, leaving the rest for the next start"; "writes a removal that fails to the module's log, leaving the store in deleted/ for the sweep, which removes it"; "sweeps what deleted/ holds as it starts, but a store a delete is removing then, and writes each it can't remove to the log"; "removes as it starts the stores a delete left in deleted/, and ends its stop once that sweep has ended"; "removes as it activates what a delete left in deleted/, and ends its deactivation once that has ended"; "lists every folder's space used, the sum of its store's files, the largest first, with the path of its last capture"; "reads the space used without waiting for a capture running on the folder"; "leaves out a folder that goes away while it reads, and counts nothing for a file or a folder inside one that does".
- The store's housekeeping packs and prunes a folder's store once the folder is idle, splitting the work as `git maintenance` does:
  - A pass is due once the folder has taken a checkpoint since its last pass, by a capture or a restore, and starts once no request for the folder has come for 30 seconds.
    It runs as an operation of the folder's queue, so no other command touches the store while it runs.
  - A request for the folder that comes during a pass aborts it: the pass's Git command is stopped, and the request waits only for that command to exit, never for the pass to end.
    The pass runs again 30 seconds after the folder's last request.
    A stopped command leaves every checkpoint whole, since Git writes each new pack under a temporary name and removes an old one only once its replacement is in place.
    It may leave those temporary files, `tmp_*` and `.tmp-*` in `objects/pack`, so each pass first removes them; no other command writes to the store meanwhile.
  - `fast-import` writes a `.keep` file beside each pack it ends, which keeps the pack out of a repack, and removes them as it exits; one killed outright leaves them, so each pass removes those too.
  - A Git command stopped while it updates references, such as `pack-refs`, leaves its lock, `packed-refs.lock` or `refs/**/*.lock`, when the system ends it without its clean-up, as Windows does; every later `pack-refs` would fail on it, so each pass removes those locks too, since a pass runs in the folder's queue once `fast-import` has stopped and no Git command of the store holds one.
  - Each pass first ends the store's long-lived `fast-import`, whose pack in progress is such a temporary file, and a pass that repacks ends its `cat-file` too before it, since it holds open the packs a repack removes, which Windows would refuse to remove; a pass that only packs the references keeps `cat-file` running.
  - A light pass packs the loose references with `pack-refs --all`, and once the store has 50 packs or about 6,700 loose objects, `git gc --auto`'s limits, rolls them up with `repack --geometric=2 -d`, which rewrites only the smaller packs.
  - A full pass runs instead when the store records none, when its last ended a week ago or more, or later than now, as after the clock went back.
    It packs the references, then runs `repack --cruft -d --cruft-expiration=2.weeks.ago`, which writes every object a checkpoint reaches into one pack and the others into a cruft pack that keeps each one's age, dropping those older than two weeks.
    Then `prune --expire=2.weeks.ago` removes the loose objects and Git's temporary files that old, and the module removes the `fast_import_crash_<pid>` reports that old; `housekeeping.json` records when the pass ended.
  - The full pass is a cruft repack, not a geometric roll-up alone, because what no checkpoint reaches would never go otherwise.
    A geometric roll-up keeps every object of the packs it rolls, reached or not, and `prune` removes only loose objects, so a cancelled capture's pack, which `fast-import` keeps ([Cancelling](#cancelling)), would stay for good.
    A cruft repack drops those objects once they are two weeks old, and rewrites the whole store doing it, so it runs once a week, and the light pass keeps the packs few in between.
  - A pass runs only with 2 GiB free on the store's volume beyond the size of the store's objects, loose and packed, which a full pass may write again; a count of the store that leaves out either size counts as lacking it.
    Without the space, the pass waits for the folder's next checkpoint.
  - A pass that fails is written to the module's log, and the next one waits for the folder's next checkpoint; a `housekeeping.json` the module can't read fails the pass before any Git command.
  - Deactivating the runtime part stops every pass's timer, aborts any pass that runs, and ends once it has stopped.
- Tests: "makes no pass for a folder whose store isn't made yet"; "makes no pass without the margin free beyond the size of the store's objects, and makes one with it"; "packs the references, and at its first full pass drops what a stopped capture left two weeks ago or longer, keeping every checkpoint and what's newer"; "makes a full pass once a week has passed since the last, and only a light one before"; "makes a full pass when its last is later than now, as after the clock went back"; "rolls the packs together at a light pass once the store has 50, as git gc --auto does, and leaves 49 as they are"; "rolls the loose objects into a pack at a light pass once the store has 6,700, as git gc --auto does, and leaves fewer as they are"; "refuses a housekeeping.json it can't read before any Git command"; "refuses an output that gives no count it reads, naming that count"; "removes at the start of a pass the temporary files a full pass stopped mid-repack left in the pack folder, leaving only packs"; "ends the store's fast-import as a pass starts, and its cat-file too before a repack"; "removes at the start of a pass the files a killed fast-import left keeping its packs out of a repack, and rolls those packs up"; "stops a pass whose signal aborts during its repack, keeping every checkpoint and writing no record"; "runs a folder's pass once the delay passes after a request that writes, and none after one that only reads"; "puts the pass off while requests come, and starts its delay only once no request for the folder is open"; "aborts a running pass when a request comes, which waits only for the pass to stop, and runs it again after the request"; "writes a pass that fails to the module's log, and runs none again until the folder writes again"; "runs no pass once stopped while a folder's delay is pending"; "stops every timer and aborts every pass, ending once each has ended, and starts none after"; "packs and prunes a folder's store once no request for it has come for the delay after a capture, and not a millisecond before"; "stops a pass when a request for the folder comes during it, so the request waits only for its Git command, and passes again after"; "stops the service it publishes once asked, after the capture it ran, leaving no Git running and refusing a later request"; "removes at the start of a pass the reference locks a stopped Git command left, then packs the references and repacks".

## Settings

- `checkpoints.followIgnoreFiles`: Boolean, off by default, Shared, with no scopes, on the page Checkpoints in the group Files: whether a checkpoint follows the folder's ignore files.
- `checkpoints.storage`: an Action whose button runs `checkpoints.openStorage`, which opens the storage view; it comes with the window part (**Not yet**, [The package](#the-package)).

## The Git builds

The app ships Git as it ships Electron and Noldova Desktop's native addons: a pinned build per target, checked before use, unpacked from the app's archive and signed with the app, as Noldova Desktop's `documents/BUILD.md` says for its own.
The pinning, the checks and the list of files to unpack are the module's; Noldova Desktop's packaging unpacks and signs them, and the module runs Git from the unpacked copies.
Each target's build is pinned in `src/noldova.checkpoints.git/builds.json` by its address, its SHA-256 and the Git version and source it was built from.
A target whose build prints a version other than its Git version also holds `reportedVersion`, the version `git --version` prints, which the tests check in its place: dugite-native's Linux arm64 build prints `2.56.1.dirty`, as the README's Git builds section says.
The scripts refuse a `reportedVersion` that is not its `gitVersion`, a full stop and lowercase letters, through `TargetReportedVersionInvalidException`.

- Development and tests run the host's pinned build, from its installed package, the same files a packaged app runs.
  There is no fallback to an installed Git: when the running target's package is missing, the module refuses to start Git, naming the target, as Noldova Desktop's runtime refuses a missing addon.

| Target | Build |
|---|---|
| Windows x64 and ARM64 | MinGit, not its BusyBox variant, from Git for Windows' releases |
| macOS x64 and ARM64, Linux x64 and ARM64 | the dugite-native release for that target |

- The build script downloads each archive, checks its SHA-256 against `builds.json` before unpacking it, and fails on any mismatch.
- Each package holds its target's build, less Git LFS and the credential manager, which the module never runs, and names the upstream source each build came from.
- Each package ships the licence of every component its build bundles, not only Git's: curl, OpenSSL, zlib, PCRE2, libiconv, Expat and the rest the build holds.
  - The build script lists the build's components from `src/noldova.checkpoints.git/components/<target>.json`, and gathers each one's licence text into the package's `licenses/` folder.
  - For MinGit, the script checks that list against the build's own package list, `etc/package-versions.txt`, and fails when a package's version differs or a listed component is missing from it.
  - Where the archive already holds a component's licence, in MinGit's `usr/share/licenses/` folders, the script takes it from there; otherwise it takes the text pinned in `src/noldova.checkpoints.git/licenses/` for that component's version.
  - The script fails when a listed component has no licence text.
  - The package's `license` field is the SPDX expression of its components' licences, each term once, Git's being `GPL-2.0-only`.
- Each package names its target in npm's `os` and `cpu` fields, so an install takes only the package for the host's target.
- A newer Git with a security fix moves into `builds.json` through a PR, and a release of the module follows.
  `scripts/list-git-builds.ts` lists each newly pinned archive's entries and MinGit's package versions for that PR, as the README's Updating the Git builds says.
  A weekly scheduled workflow runs `scripts/check-git-builds.ts`, which compares the latest MinGit and dugite-native releases with the tags in `builds.json`'s addresses and files an issue in this repository for each newer one; the maintainers triage it, and a security fix goes ahead of feature work.
  - The check orders tags by the numbers in them, so `v2.56.0.windows.2` follows `v2.56.0.windows.1` and `v2.53.0-4` follows `v2.53.0-3`.
  - It titles each issue `Pin <source> <tag> in builds.json` and labels it `git-build`.
  - When a target it would replace holds `reportedVersion`, the issue also asks for that field to be dropped where the new build reports its Git version.
    The maintainers look for open `git-build` issues each week, and the check fails when GitHub leaves the label off.
  - It files a release once: a hidden line at the end of its issue names the source and the tag, and a release whose issue it filed before, open or closed, is never filed again, whatever the issue's title has become.
  - When a source's latest release has its issue, filed in this run or an earlier one, the check closes, with a comment naming that issue, each of the source's issues for an older release still open, since only the newest release is worth pinning.
  - It reads and checks every source's latest release before it files or closes any issue, so it fails, filing nothing, when a target's address is a release of neither source, when GitHub's answer for any source can't be read, or when a release's tag or page holds more than letters, digits, `.`, `-`, `_` and, in the page, `/`, so an issue never quotes Markdown from GitHub's answer.
  - The workflow, `.github/workflows/git-builds.yml`, runs it every Monday at 06:17 UTC, and when a maintainer starts it, on a GitHub-hosted Linux runner, with only `contents: read` and `issues: write`; it installs nothing, since the check uses only Node's own modules.
- Git runs from disk, so the app's packaging must leave each Git file unpacked from the archive.
  Noldova Desktop unpacks only the native files it finds and the files a package's manifest names in `noldovaDesktop.unpacked`, as exact paths from the package's folder with `/` between folders, so each Git package's manifest names every file of its build there, its programs, libraries, scripts and data alike.
  The build script writes that list from the build it unpacked, every file under the package's `git` folder, sorted, and refuses a committed manifest whose list differs, as it does for any other field.
  The package holds no symbolic link, since the build script copies each link it keeps, so each file is named once, as Noldova Desktop requires.
- On Windows, Noldova Desktop's packaging accepts the signature Git for Windows' files already carry; on macOS, the app signs and notarizes Git's programs and libraries with its own Developer ID; Linux packages are not signed, as Noldova Desktop's packaging says.
- Noldova Desktop's packaging installs the optional dependencies that fit each target it builds, so an app takes the module's Git package for that target by its `os` and `cpu` fields.
- The module gives Git its program, exec path and paths in the package's unpacked copy, through Noldova Desktop's `PackagedPath.unpacked`, which turns the first `app.asar` segment of the package's path into `app.asar.unpacked` and leaves an unpacked install's path as it is.
- Tests: "gives Git the paths into its package's unpacked copy when the package is inside app.asar, as a packaged app holds it".

## Dependencies

```text
an app on Noldova Desktop
        │  installs the packages; decides when to capture and restore; shows the preview and the changes
        ▼
the checkpoints module ──▶ Noldova Desktop (runtime part context, programs, settings, notifications, window, packaging)
        │
        └──▶ the Git build for the target (MinGit, dugite-native)
```

- The module depends on published versions of Noldova Desktop, and never on an app.
- It needs nothing that Noldova Desktop doesn't offer yet.
