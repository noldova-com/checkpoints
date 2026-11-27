# Checkpoints

[![Build and test](https://github.com/noldova-com/checkpoints/actions/workflows/build-and-test.yml/badge.svg?branch=main)](https://github.com/noldova-com/checkpoints/actions/workflows/build-and-test.yml)
[![npm](https://badgen.net/npm/v/@noldova/checkpoints)](https://www.npmjs.com/package/@noldova/checkpoints)
[![License: MIT](https://badgen.net/static/license/MIT/blue)](LICENSE)

The checkpoints module for Noldova's desktop apps.
A checkpoint keeps a working folder's files at one moment, so an app can show what changed since and put them back when the person asks.

It keeps its own copies with its own Git, in the app's data folder: it never runs the installed Git and never reads or changes the person's repository, branches or settings.
Apps built on [Noldova Desktop](https://github.com/noldova-com/desktop) add the module; it names no app and works the same in each.

It runs on Windows, macOS and Linux, on x64 and ARM64.
Every package is below 1.0 for now, and its API may change from one version to the next.
To report a bug or ask for a change, open an issue in this repository, as the organization's [contributing guide](https://github.com/noldova-com/.github/blob/main/CONTRIBUTING.md) says.
Report a security problem privately, as its [security policy](https://github.com/noldova-com/.github/blob/main/SECURITY.md) says.

## Getting started

An app on Noldova Desktop installs the module's package, pinned exactly, and adds it as Noldova Desktop's module contract, its `documents/MODULES.md`, says:

```bash
npm install --save-exact @noldova/checkpoints
```

The install brings the protocol's package and the Git package for the host's target; the Git packages are optional dependencies, each limited to its target by npm's `os` and `cpu` fields.
The module's runtime part publishes the service `checkpoints.service`, which another runtime part gets with `getService`:

```ts
import { CheckpointsService } from "@noldova/checkpoints/runtime";
import { CaptureRequest, FolderReference } from "@noldova/checkpoints.protocol";
import type { IRuntimePartContext } from "@noldova/desktop.runtime";

export async function captureAsync(context: IRuntimePartContext): Promise<void> {
  const checkpoints = context.getService("checkpoints.service", CheckpointsService);
  const result = await checkpoints.captureAsync(new CaptureRequest(new FolderReference("project-1", "/work/project"), "Turn 3"));
  console.log(result.outcome.value);
}
```

[documents/ARCHITECTURE.md](documents/ARCHITECTURE.md) describes the API, the store, how a restore runs, and the module's parts and boundaries.

| Package | npm | What it is |
|---|---|---|
| [`checkpoints`](src/noldova.checkpoints) | [![npm](https://badgen.net/npm/v/@noldova/checkpoints)](https://www.npmjs.com/package/@noldova/checkpoints) | The module: its `module.json`, its settings and its runtime part, which owns the stores and runs Git. |
| [`checkpoints.protocol`](src/noldova.checkpoints.protocol) | [![npm](https://badgen.net/npm/v/@noldova/checkpoints.protocol)](https://www.npmjs.com/package/@noldova/checkpoints.protocol) | The protocol: the requests, results and events of the runtime methods, with the folders and checkpoints they name. |
| [`checkpoints.git.<platform>-<arch>`](src/noldova.checkpoints.git) | [![npm](https://badgen.net/npm/v/@noldova/checkpoints.git.linux-x64)](https://www.npmjs.com/package/@noldova/checkpoints.git.linux-x64) | One package per target, `darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `win32-arm64` and `win32-x64`, each holding that target's Git build ([The Git builds](#the-git-builds)). |

## The Git builds

The module runs a Git build it ships, never an installed Git.
Each target's build is pinned in [`src/noldova.checkpoints.git/builds.json`](src/noldova.checkpoints.git/builds.json) by its address, its SHA-256, and the Git version and upstream source it comes from:

| Package | Built by | Upstream Git source |
|---|---|---|
| `@noldova/checkpoints.git.win32-x64`, `@noldova/checkpoints.git.win32-arm64` | MinGit, from [Git for Windows](https://github.com/git-for-windows/git)' releases | [Git for Windows v2.56.1.windows.1](https://github.com/git-for-windows/git/tree/v2.56.1.windows.1) |
| `@noldova/checkpoints.git.darwin-x64`, `@noldova/checkpoints.git.darwin-arm64`, `@noldova/checkpoints.git.linux-x64`, `@noldova/checkpoints.git.linux-arm64` | [dugite-native](https://github.com/desktop/dugite-native) v2.56.1 | [Git v2.56.1](https://github.com/git/git/tree/v2.56.1) |

`builds.json` is the record: when it moves to a newer build, the package's `noldova.git.source` field names the new upstream version.

`builds.json`'s `sources` pins, for each family of builds, the upstream places their complete corresponding source is published, which every app that ships a Git package must point to:

| Sources | Targets | Pages | Files |
|---|---|---|---|
| `windows` | `win32-x64`, `win32-arm64` | the Git for Windows v2.56.1.windows.1 release | the source package of each of MinGit's components, from MSYS2 and Git for Windows' pacman repository |
| `dugite` | `darwin-x64`, `darwin-arm64`, `linux-x64`, `linux-arm64` | Git's tag v2.56.1 and dugite-native's commit 238326e | Git v2.56.1's release tarball |

Each Git package's `noldovaDesktop.sourcePages` and `noldovaDesktop.sources`, `README.md` and `LICENSE` give those addresses, as [documents/ARCHITECTURE.md](documents/ARCHITECTURE.md#the-git-builds) says; the module publishes no copy of them.
Each file is pinned by its address, size and SHA-256, so it must be one its upstream publishes as fixed bytes; a source GitHub only offers as an archive generated from a commit, such as dugite-native's, whose bytes GitHub doesn't promise, is pinned by the commit's page alone.

The Linux arm64 build reports itself as `git version 2.56.1.dirty`, though it is built from Git v2.56.1: dugite-native's Ubuntu build names the cross-compiler's strip tool by editing Git's tracked `Makefile` before it builds, and Git marks a build from a changed tree as dirty ([desktop/dugite-native#553](https://github.com/desktop/dugite-native/pull/553) passes the strip tool to `make` instead).
So that target's entry also holds `reportedVersion`, the version the build prints, which the tests check in its place; the weekly Git builds check's issue asks for it to be dropped once a newer build reports its Git version.

Each package's `package.json` names every file of its build in `noldovaDesktop.unpacked`, by its exact path from the package with `/` between folders, so Noldova Desktop's packaging keeps them outside the app's archive, where Git can run them.
The build writes that list from the build it unpacked, sorted, and refuses a committed manifest whose list differs.

The Git packages are not under the MIT License.
Each keeps the licences of the components its build ships, as one SPDX expression in its `package.json`'s `license` field:

- macOS, `darwin-x64` and `darwin-arm64`: `GPL-2.0-only`.
- Linux, `linux-x64` and `linux-arm64`: `GPL-2.0-only AND (Artistic-1.0-Perl OR GPL-1.0-or-later)`.
- Windows, `win32-x64` and `win32-arm64`: Git's `GPL-2.0-only` with the licences of the MSYS2 and MinGW components MinGit ships, among them `GPL-3.0-or-later`, `LGPL-2.1-or-later`, `GFDL-1.3-or-later`, `MIT`, `BSD-3-Clause`, `Apache-2.0`, `curl` and `Zlib`; the committed manifest in `src/noldova.checkpoints.git/packages/<target>/package.json` gives the whole expression.

Each package holds its components' licence texts in its `licenses` folder, a `README.md` that lists each component with its version and licence, and a `LICENSE` that gives the expression and points to both.
The build takes a licence text from the build's archive where it holds one, as MinGit's `usr/share/licenses/` folders do; otherwise it takes the text pinned in [`src/noldova.checkpoints.git/licenses/`](src/noldova.checkpoints.git/licenses), whose `sources.json` names the upstream file and Git blob of each.
`src/noldova.checkpoints.git/components/<target>.json` lists each target's components with their versions and licences.
Where the build holds a package list, as MinGit's `etc/package-versions.txt` does, the build refuses a components file that lists a different set of names and versions, naming each difference; dugite-native's archives hold no such list.
A package whose every file `dropped/` leaves out isn't a component: `dropped-components/<target>.txt` names it with its version, as the package list writes it, and the build refuses a name there that the package list doesn't hold.
The `license` field gives each licence term once, so a term several components share appears once in the expression.

## Building from source

```bash
npm run build
npm test
```

`npm run build` first installs the exact versions the root's lockfile records with `npm ci` when `node_modules` is missing, then builds and packs the packages into `_packages`, and `npm test` runs every check.
The build downloads every target's Git build, about 300 MB, so it needs a network connection the first time; it keeps the archives in `_build/git-archives` and downloads one again only when the cached copy's SHA-256 no longer matches.

## Checks

Every pull request into `main` must pass "Check / Linked issue" and "Build and test / All targets".

- `npm run build` refuses to build when `version.json` and the root `package.json` hold different versions.
  Once `npm ci`, when it runs, and the check of the packages' names have passed, it removes `_packages` and the repository's own packages it installed before under `node_modules/@noldova`, before its other checks, so a build that fails after that leaves no earlier build for the tests.
  For every target `src/noldova.checkpoints.git/builds.json` pins, it downloads the Git build, checks its SHA-256 and that its entries match `src/noldova.checkpoints.git/listings/`, gathers its components' licences, writes a `LICENSE` that gives them as one SPDX expression and points to the `licenses` folder and the README's table, since the release refuses a package without one.
  It refuses a committed manifest of its Git package that differs from the one it writes but for `gitHead`, naming the manifest it must hold, and packs it with the protocol's and the module's packages into `_packages`, refusing, unread, an archive of 256,000,000 bytes or more.
  A release, which sets `RELEASE_VERSION`, records `RELEASE_COMMIT`, which it refuses unless it's a full commit hash, as each package's `gitHead`; any other build records HEAD's commit when the working tree has no change, and none otherwise, so the shared workflow's archive check passes on a pull request's build.
  It installs the packed protocol and the host's Git package at the root, without saving them, for the tests, and names in the same install the version `node_modules` holds of each `@noldova/` package the root `package.json` pins, since an install otherwise takes the lockfile's version back: a run that moved one, as the Module range run does, keeps it.
- `npm test` type-checks the scripts, the handwritten declarations, every `@example` of the two `index.d.ts` files and each package's sources and tests, then runs the packages' tests with Node's test runner, holding the packages' sources to full line, branch and function coverage.
  The same run takes the scripts' own tests, under `scripts/tests`, which the coverage gates don't hold: `PeerMove`, which the Module range workflow's `npm run peers:newest` runs, moving every context pin to the newest version each context package has published inside the parts' peer ranges, so a run during a context release takes the older version they all have.
  It type-checks the examples as an outside project's code, in `_build/consumer`, a project of its own with its own `package.json`.
  There it installs the packed `@noldova/checkpoints` and `@noldova/checkpoints.protocol` from `_packages`, without the optional Git packages, beside Noldova Desktop's packages, the context packages, `@types/node` and `undici-types`, packed from the root's `node_modules` at the versions installed there: those the root `package.json` pins or its lockfile locks, or those the Module range run moved to.
  It writes each example as a file of its own under `_build/consumer/examples`, named by its line in the declarations, beside `scripts/consumer/declarations.ts`, which checks that `getService` takes the published `CheckpointsService` and that no module can construct it.
  It type-checks them all against the installed packages' own `exports` and declarations, so an example that names a missing member or passes the wrong arguments, or a published declaration that doesn't resolve, fails the run.
  `npm test -- <test files>` type-checks every project the same way but the examples, then runs those files alone, without the coverage gates: it installs no consumer project, since a filtered run checks tests, as a flake proof's loop does, and the whole run checks the examples.
  It also takes the shared workflow's `--skip-test-details` and `--skip-coverage-details`, and runs as it would without them.
  Each test may take 5 minutes before Node's runner fails it, naming the test; that is the suite's one hang limit, over three times the slowest test measured in one whole run on each of Windows x64, Linux x64, macOS x64 and macOS ARM64: a stopped rollback's recovery on a volume without hard links at 99 seconds on a loaded macOS x64 machine, where the slowest on the others took 46 seconds on Windows, 23 on Linux and 20 on macOS ARM64; Windows and Linux on ARM64 have no machine to measure on before CI; no test passes or fails by a clock: each limit and delay that picks a path runs on a `ManualClock`, the clock below, or on node:test's mock timers.
  What still reads the system's time decides no result: `clock.test.ts`, which checks the system clock itself; the one activation through `RuntimePart`, which takes no clock, in `runtime-part.test.ts`, which checks only the sweep of what a delete left; and the file-system times: the harness starts its `ManualClock` from one reading of the system's time, so the index start a capture records, which `checkpoint-capture.test.ts` checks exactly, can be compared with the times the system gives the files, and a test that needs the index to vouch for a file sets the start from the times the index records for its files; the object files `store-housekeeping.test.ts` sets days back are aged from the system's time, since Git prunes them by it.
  The run has no limit of its own, and Node's runner gives a test file's process none, so a file whose tests have ended but whose process doesn't exit, held by a handle or a child process it left, would keep the run going unnamed.
  The run's reporter, `scripts/services/test-record-reporter.ts`, therefore names each test file still running once no test event has come for those 5 minutes, whether a test of it reached its limit without ending or the file's process is held, and then stops Node's runner with its test files' processes and their descendants, as a tree on Windows and as a process group elsewhere, so the run ends and fails.
  A type-check may take 5 minutes and `npm ci` 10.
  A process past its time is stopped with its descendants, and the run fails when it hasn't ended 10 seconds later.
  The tests write their temporary folders under `_build/test-temp`, which the run gives them as `TMPDIR`, `TEMP` and `TMP`.
  Each test file that creates symbolic links first tries one, through `tests/fixtures/link.fixture.ts`; where the system won't let the process create them, as on Windows without Developer Mode, the tests that create one are skipped, saying so, and those that check the module's answer without links run, such as a restore keeping a link as `LinkUnsupported`.
  Every CI target allows links, and the path a system without links takes is also reached there, through a folder the system refuses the link in; a whole run without links leaves the code that places links uncovered, so its coverage check needs a system that allows them.
  Beside the console's report, the run writes each test's file, name, time and skip to `_build/test-results.jsonl`, the name after its suites' names, each followed by ` > `, and it fails when a test is skipped without a reason or when a file holds two tests of the same name in the same suite.
  After the tests, a whole run reads `documents/ARCHITECTURE.md`'s "Tests:" lines beside those results, through `scripts/services/test-citation-check.ts`, and fails naming each line not written on one line as double-quoted names joined by `; ` and ending in a full stop, and each cited name that is no test's name after its last ` > `; a filtered run skips it, since its results hold only the tests it ran.
  It names each test file whose tests took over 1 second together, the budget for a unit test file, but doesn't fail for it, since one run's time is too noisy to gate on; a file's time is the sum of its top-level tests' and suites' times.
- `npm run test:timing -- [test files]` is the time check: it runs the tests 5 times, measuring coverage as `npm test` does but without its gates, and without the type-check, prints each file's median, and fails for a file whose median is over 1 second by more than a 10% margin.
  The maintainer accepted the files below, which are over the budget because they run real Git on real folders or, for two of them, only from the load of a whole run: each is in `acceptedSlowTestFiles` in `scripts/resources.ts` as `src/noldova.checkpoints/tests/` followed by its path below, so a run doesn't name it and the time check passes for it.
  Another file over the budget joins that list only once the maintainer accepts it.
  Each time is the file's time in one whole `npm test` run on each platform; "< 1 s" is within the budget there.
  "not measured" marks a file accepted after CI last printed its macOS (ARM64) time: no test machine runs macOS on ARM64, and CI prints no accepted file's time.

  | File, under `src/noldova.checkpoints/tests/` | Windows (x64) | Linux (x64) | macOS (x64) | macOS (ARM64) | Why |
  |---|---|---|---|---|---|
  | `services/checkpoints-host.test.ts` | 25.8 s | 11.7 s | 123.2 s | 23.7 s | Runs the whole service on the build's real Git, one store per test: captures, compares, restores and deletes, some with 64 MiB files. |
  | `services/checkpoints-host.delete.test.ts` | 16.6 s | 8.0 s | 116.5 s | 21.9 s | Deletes stores while real Git commands and housekeeping passes run on them, and waits for each command to exit before it checks the folder. |
  | `services/restore-runner.interrupted.test.ts` | 33.5 s | 22.7 s | 98.8 s | 19.9 s | Stops a restore in a child Node process at each journal record, then recovers the folder with real Git, one child and store per stop. |
  | `services/restore-runner.test.ts` | 28.0 s | 20.2 s | 87.3 s | 16.6 s | 38 whole restores on real Git stores and real folders, each staging, placing, checking and flushing files, links and folders, and rolling back. |
  | `services/store-housekeeping.test.ts` | 45.8 s | 12.4 s | 85.2 s | 17.2 s | Runs Git's housekeeping, its counts, repacks and prunes, on real stores filled through real captures. |
  | `services/checkpoint-file.reader.test.ts` | 21.3 s | 8.9 s | 51.0 s | 8.2 s | Reads files from real checkpoints, some of them over 32 MiB and up to 64 MiB, through real Git. |
  | `services/checkpoint-capture.test.ts` | 15.9 s | 7.0 s | 46.2 s | 8.0 s | Captures real folders through the build's fast-import, some with 64 and 65 MiB files. |
  | `services/git-runner.test.ts` | 13.0 s | 3.3 s | 32.4 s | 5.5 s | Starts and stops real Git commands, among them the long-lived cat-file and fast-import. |
  | `services/module-activation.test.ts` | 8.3 s | 3.0 s | 28.9 s | 4.8 s | Activates the module in each test, starting the build's Git, and runs every method through it in its wire form, captures and a restore among them. |
  | `services/checkpoint-comparer.test.ts` | 9.7 s | 3.3 s | 26.8 s | 4.3 s | Compares checkpoints captured through real Git in a store of their own per test. |
  | `services/restore-planner.test.ts` | 8.2 s | 2.4 s | 24.0 s | 3.8 s | Plans restores of checkpoints captured through real Git. |
  | `services/checkpoint-lister.test.ts` | 6.7 s | 2.1 s | 22.4 s | 2.6 s | Lists checkpoints captured through real Git in a store of their own per test. |
  | `services/restore-rollback.test.ts` | 7.6 s | 1.6 s | 20.9 s | 3.4 s | Rolls back restores on real folders, staging the checkpoint's files through real Git. |
  | `services/object.reader.test.ts` | 5.6 s | 2.4 s | 18.9 s | 3.2 s | Reads objects, a large one among them, from real stores through cat-file. |
  | `services/restore-scope.test.ts` | 8.6 s | 2.6 s | 16.4 s | 2.3 s | Plans restores limited to listed paths, from checkpoints captured through real Git. |
  | `services/checkpoints-host.cancel-journal.test.ts` | 5.6 s | 1.5 s | 10.5 s | not measured | Cancels restores through the whole service on the build's real Git, before and after their journal, in a process of its own for the cancel fixture's spies. |
  | `services/restore-runner.aside-changed.test.ts` | 4.1 s | 1.2 s | 10.0 s | not measured | A whole restore on a real Git store whose moved-aside folder gains a file while it is walked again, in a process of its own for its `readdir` mock. |
  | `services/restore-runner.aside-gone.test.ts` | 4.3 s | 1.5 s | 9.7 s | not measured | A whole restore on a real Git store whose moved-aside folder is gone when it is walked again, in a process of its own for its `readdir` mock. |
  | `services/checkpoints-host.cancel-walk.test.ts` | 5.5 s | 1.8 s | 9.0 s | not measured | Cancels compares, previews and restores through the whole service on the build's real Git mid-walk, in a process of its own for the cancel fixture's spies. |
  | `services/side-loader.test.ts` | 4.9 s | 1.4 s | 8.8 s | 1.6 s | Reads both sides of changes from real stores and real folders. |
  | `services/restore-runner.held-staging.test.ts` | 2.4 s | < 1 s | 8.5 s | 1.1 s | Fails a whole restore's stage on a real Git store with a folder another program holds in its staging folder, in a process of its own for its `BlobStager.prototype.stageAsync` mock. |
  | `services/restore-applier.test.ts` | < 1 s | < 1 s | 8.0 s | 1.0 s | Moves, places and removes real files and folders, flushing each journal record to disk. |
  | `services/restore-runner.retries.test.ts` | 3.9 s | < 1 s | 6.9 s | 1.6 s | A whole restore on a real Git store, in a process of its own for its mock timers. |
  | `services/tree-lister.test.ts` | 3.8 s | < 1 s | 6.8 s | 1.0 s | Lists checkpoint trees with diff-tree on real stores. |
  | `services/blob-stager.test.ts` | 2.4 s | < 1 s | 6.7 s | < 1 s | Stages a checkpoint's files from real stores through cat-file. |
  | `services/checkpoints-host.cancel-git.test.ts` | 4.5 s | 1.2 s | 6.5 s | not measured | Cancels lists, compares, reads and previews through the whole service while the build's real Git runs, in a process of its own for the cancel fixture's spies. |
  | `services/checkpoints-host.cancel-before.test.ts` | 4.0 s | 1.8 s | 6.2 s | not measured | Cancels a restore through the whole service on the build's real Git once its checkpoint before is taken, in a process of its own for the cancel fixture's spies. |
  | `services/store-housekeeping.cancel.test.ts` | 4.9 s | 1.3 s | 5.9 s | not measured | Cancels Git's housekeeping during its repack on a real store filled through real captures, in a process of its own for the cancel fixture's spies. |
  | `services/checkpoints-host.cancel-capture.test.ts` | 4.6 s | 1.6 s | 5.9 s | not measured | Cancels captures through the whole service on the build's real Git mid-walk and while content streams, in a process of its own for the cancel fixture's spies. |
  | `services/checkpoints-host.cancel-reads.test.ts` | 2.3 s | < 1 s | 5.2 s | not measured | Cancels compares and previews through the whole service on the build's real Git between two file reads, in a process of its own for the cancel fixture's spies. |
  | `services/checkpoints-host.cancel-describe.test.ts` | 2.3 s | < 1 s | 5.0 s | not measured | Cancels a compare through the whole service on the build's real Git while it describes its changes, in a process of its own for the cancel fixture's spies. |
  | `services/restore-planner.deleted.test.ts` | 1.7 s | < 1 s | 4.7 s | not measured | Plans a restore of a checkpoint captured through real Git while a folder is deleted during the walk, in a process of its own for its `readdir` mock. |
  | `services/restore-runner.link-swapped.test.ts` | 3.0 s | 1.8 s | 4.5 s | not measured | A whole restore on a real Git store with a planned link swapped under it, in a process of its own for its `RestorePaths.lstatAsync` mock. |
  | `services/blob-batch.writer.test.ts` | 2.3 s | < 1 s | 4.4 s | < 1 s | Writes real files, executables and links from cat-file's output. |
  | `services/store-opener.test.ts` | 2.0 s | < 1 s | 4.2 s | < 1 s | Creates real bare repositories with the build's Git and writes their configuration. |
  | `services/change-describer.test.ts` | 1.5 s | < 1 s | 3.9 s | < 1 s | Describes changes by reading a real store's objects through cat-file. |
  | `services/checkpoint-file.reader.grown.test.ts` | 3.4 s | 1.3 s | 3.3 s | not measured | Reads a real checkpoint's text file grown past 32 MiB through real Git, in a process of its own for its `FolderFileReader.readAsync` spy. |
  | `resources.test.ts` | < 1 s | < 1 s | 2.9 s | < 1 s | Reads a store's configuration back through the build's Git. |
  | `services/checkpoint-comparer.deleted.test.ts` | 1.6 s | < 1 s | 2.5 s | not measured | Compares a checkpoint captured through real Git while a folder is deleted during the walk, in a process of its own for its `readdir` mock. |
  | `services/restore-paths.test.ts` | < 1 s | < 1 s | 2.3 s | < 1 s | Places and rolls back real files, hard links and links. |
  | `services/folder-deleter.tries.test.ts` | < 1 s | < 1 s | 2.2 s | < 1 s | Removes real folders between tries, in a process of its own for its mock timers. |
  | `services/folder-walker.test.ts` | < 1 s | < 1 s | 2.1 s | < 1 s | Walks real folders with links, file modes and names the file system holds. |
  | `services/restore-journal.test.ts` | < 1 s | < 1 s | 1.8 s | < 1 s | Writes the journal to a real file and flushes it and its folder to disk. |
  | `services/ignore-file.reader.test.ts` | < 1 s | < 1 s | 1.8 s | < 1 s | Reads real `.gitignore` files, three of them just under, at and over Git's 100 MiB limit, on macOS's slower file system only. |
  | `services/folder-file.reader.test.ts` | < 1 s | < 1 s | 1.4 s | < 1 s | Reads real files, one of them read 64 KiB at a time under a spy. |
  | `services/git-build.locator.test.ts` | < 1 s | < 1 s | 1.2 s | < 1 s | About 1.2 s only in a whole run on macOS x64, waiting while the Git-heavy files share the machine; alone it takes 45 ms. |
  | `services/storage-reader.test.ts` | < 1 s | < 1 s | 1.2 s | < 1 s | About 1.2 s only in a whole run on macOS x64, waiting while the Git-heavy files share the machine; alone it takes 33 ms. |
  | `services/folder-deleter.test.ts` | < 1 s | < 1 s | 1.1 s | < 1 s | Renames and removes real folder trees. |
  | `services/store-file.test.ts` | < 1 s | < 1 s | 1.0 s | < 1 s | Writes real store files, syncing each file and its folder, on macOS's slower file system only. |
  | `services/git-process.test.ts` | 3.9 s | < 1 s | < 1 s | < 1 s | Starts real child processes and stops them. |

- Coverage leaves out only the handwritten declarations, `*.d.ts`, which hold no code; test code pauses for a fixed time only in the one wait listed below, and every test runs beside the others of its file but those whose spy, mock or timers reach the whole process, which run in a process nothing concurrent shares.
  A test that patches what its whole process shares, such as a Node built-in, a prototype, a class's static method or the timers, is written in a spec file named after its source and its case, `<source>.<case>.test.ts` beside `<source>.test.ts`, that holds that one test alone, so it runs in a process of its own, which the runner gives each file; never beside another test, not even one after another in a describe without `concurrency`, and never in its source's file, whose concurrent suite shares the process.
  `folder-file.reader.reads.test.ts`, `store-file.syncs.test.ts`, `ignore-file.reader.grown.test.ts`, `ignore-file.reader.replaced.test.ts`, `folder-walker.socket.test.ts`, `checkpoint-file.reader.grown.test.ts`, `restore-runner.link-swapped.test.ts`, `restore-runner.held-staging.test.ts`, `restore-journal.torn-append.test.ts`, `restore-journal.short-append.test.ts` and `restore-journal.short-create.test.ts` each hold one such test, as the spies and mocks below say, and `checkpoints-host.cancel-capture.test.ts`, `checkpoints-host.cancel-git.test.ts`, `checkpoints-host.cancel-walk.test.ts`, `checkpoints-host.cancel-reads.test.ts`, `checkpoints-host.cancel-describe.test.ts`, `checkpoints-host.cancel-journal.test.ts`, `checkpoints-host.cancel-before.test.ts`, `folder-walker.cancel.test.ts` and `store-housekeeping.cancel.test.ts` each hold a test that cancels through `tests/fixtures/cancel.fixture.ts`.
  `restore-paths.retries.test.ts`, `restore-runner.retries.test.ts`, `folder-deleter.tries.test.ts`, `folder-deleter.cancel-held.test.ts` and `folder-deleter.let-go.test.ts` each hold one test that sets Node's timers with node:test's mock timers, which replace `setTimeout` for the whole process: the retry delays they check are the module's own `timers/promises` waits, which the clock below doesn't hold; the three `folder-deleter` files share `tests/fixtures/held-rename.fixture.ts`, whose `HeldRename` refuses a store's rename with the codes it's given.
  The one fixed pause is `CheckpointsHarness.appearedAsync`, in `tests/fixtures/checkpoints-harness.fixture.ts`: it checks for a file every 10 ms until the file appears, with no limit of its own, so work that a busy disk slows, such as a pass's real repack, still passes; Node's 5-minute limit on a test, above, fails a wait that never would, and the wait ends with its test, since it waits on the test's signal, which Node aborts then, so the file's process exits.
  `checkpoints-host.delete.test.ts` waits on it for `deleted/`, which a delete makes just before it waits for a read of the space used, and `checkpoints-host.test.ts`'s housekeeping tests wait on it for `housekeeping.json`, which a pass writes as it ends.
  No event marks either moment: neither step goes through a seam, and a seam added for these tests alone would be a test-only one.
  `fs.watch` loses events on macOS when FSEvents falls behind under load, and a check on every turn of the event loop would hold a core through the real repacks and prunes the housekeeping tests wait on.
  Two more files mirror no source file of their own: `checkpoints-host.delete.test.ts` holds `CheckpointsHost`'s storage listing and delete, whose tests write files of up to 64 MiB, and `restore-runner.interrupted.test.ts` holds `RestoreRunner`'s crash recovery, whose tests each stop a restore in a Node process of its own; each sits apart from its source's other tests so the runner runs it in a process of its own beside them.
  Nine files patch `readdir`, through the mock below, so each holds one test in a file and process of its own: `folder-walker.listing.test.ts`, `folder-walker.walked.test.ts`, `folder-walker.deleted.test.ts` and `folder-walker.deleted-subfolder.test.ts` for the walk's folder times and a folder deleted during it, `checkpoint-capture.deleted.test.ts`, `checkpoint-comparer.deleted.test.ts` and `restore-planner.deleted.test.ts` for a folder deleted while a capture, a compare or a preview walks it, and `restore-runner.aside-gone.test.ts` and `restore-runner.aside-changed.test.ts` for a moved-aside folder gone, or changed, while a restore walks it again.
- On Windows, `npm test` runs the tests through `scripts/without-backup-privileges.ps1`, which disables the backup and restore privileges on its own process token wherever the token holds them, then starts Node with the tests.
  An elevated account, as GitHub's Windows runners use, has those privileges enabled, and Node opens every file with backup semantics, so a test that denies the module a file or a folder would see it read anyway, as no person's app run without them would.
  Only the test run's own token changes: the machine, the account and the module's code stay as they are.
- Ten internal constructor parameters, none in the published API, let the tests reach what no real run can be made to do at a chosen moment.
  The module's activation, `src/services/module-activation.ts`, gives the service each one's production value, and the classes below it default to the same:
  - the platform, `process.platform`, which decides a file's kind, whether letter case is ignored, how a Windows link is recorded and the flags a folder is opened with to flush it; it reaches `FolderWalker`, `EntryReader`, `EntryKind`, `CaseProbe` and `FolderSync`, whose journal and store writes pass `process.platform` themselves.
    Coverage holds each target's job to every branch, so a test gives another platform's value to reach that platform's branch: the decisions on what the system gave, a file's mode or a name's case, are checked on every target, and `FolderSync`'s test checks there only that the other platform's flag fails, while each target's own flag is proven by its own job.
  - the folder the Git build's package is found from, the activation's own, so a test plants a Git package in a temporary folder of its own, never in the repository's `node_modules`;
  - the restore's journal, so a test can stop or change the folder at an exact journal record and check crash recovery and rollback;
  - the free-space check before a restore and the free-space reading during a capture and housekeeping, since a test can't fill a disk at a chosen moment;
  - the hard link a restore places and rolls back, and the link a placement creates, since the copy fallback needs a volume without hard links;
  - the folder rename and removal of a delete, and the file size reads of the storage listing, so a test can hold one mid-flight to check ordering, or make an entry vanish during a read;
  - the clock, `src/services/clock.ts`, which gives the time a checkpoint and a housekeeping pass record, the start the index records, through `fileTime()`, the time Git's first start takes, and the timers of Git's commands and of housekeeping: a command's time limit, cat-file's idle limit, the idle stop of the long-lived commands and the wait for their end, the wait for a command's error output to close after it ends, and housekeeping's delay, so a test moves time itself and checks each limit at its edge, where a real clock would race the run.
    In production that start is the system's time, which the index compares with the times the system gives the files; in the tests it is the harness's clock, frozen before the files are written, so it vouches for no file, and a test that needs the index to vouch sets the start itself, 2 seconds and 1 nanosecond past the newest time the index records for its files.
    A test waits for a timer the code schedules after settled promises alone, with no I/O before it, through `ManualClock.scheduledWithoutIoAsync`, which checks once on each turn of the event loop.
    After 100 turns with none it fails, naming the call it waited for; the wait for a command's error output to close is scheduled after 1 turn on Linux, macOS and Windows.
    Its bound counts turns, not time, so it fits no timer the code schedules after a read, a write or a process, whose I/O can take any number of turns; a test waits for such a timer on the event that comes before it.
- Four spies on Node's own API, through node:test's `mock.method`, which calls the real method or does exactly what it does, check what no result shows; they change no production code:
  - the `write` of each started Git's input, in `tests/fixtures/checkpoints-context.fixture.ts`, hands a test what the module writes to Git, so it can act at a chosen blob or cat-file line, or count them, then writes it as it came.
  - `FileHandle`'s `read`, reached through an open handle's class, in `folder-file.reader.reads.test.ts`, proves that a file's object id is read 64 KiB at a time: the id is the same for any read size, so only the reads show it.
  - `FileHandle`'s `sync`, reached through an open handle's class, in `store-file.syncs.test.ts`, proves that a store file's write syncs the temporary file and then its folder: the file reads back the same without either, so only the syncs show it.
  - `AbortSignal.prototype.throwIfAborted` and `AbortSignal.any`, in `tests/fixtures/cancel.fixture.ts`, make a request's signal abort at a chosen check of it, counting from 1, so a test can cancel between two entries of a walk or two files read, where no timing could put a cancel.
    By default it aborts only when the test cancels it, and it counts the checks, so a test can tell where the work stopped.
    A signal the service joins from it through `AbortSignal.any` counts as it.
    Its tests are in the nine cancel files the paragraph on spec files lists, since the spies see every signal of their process.
- Five spies on the module's own methods, through `mock.method`, which each call the real method, give a test what no real run can show or make; they change no production code:
  - `FolderFileReader.readAsync`, in `checkpoint-file.reader.grown.test.ts`, records how much of a file grown past 32 MiB the reader keeps, which its result doesn't show.
  - `RestorePaths.lstatAsync`, in `restore-runner.link-swapped.test.ts`, gives a link another program put in place of a planned link the file id of the one it replaced, since no system lets a program rewrite a link in place, as the tests for a file do.
  - `BlobStager.prototype.stageAsync`, in `restore-runner.held-staging.test.ts`, stages a restore's files, then puts in its staging folder a folder another program holds and fails as a full disk does, so the restore can't remove what it staged; nothing else makes a stage fail after it wrote a file.
  - `FolderFileReader.objectIdOfAsync`, in `restore-runner.retries.test.ts`, fails once with EBUSY, which only Windows gives while another program holds the file without sharing it, and Node can't open a file that way.
  - a `FolderWalker`'s `walkAsync`, in `side-loader.test.ts`, walks the folder with a second walker, then replaces a file the walk found, as another program can between the walk and the reading, a gap the module does nothing in that a test could wait on; it reaches only the walker that test builds.
- One mock of `FileHandle`'s `stat`, reached through an open handle's class, in `ignore-file.reader.grown.test.ts` and `ignore-file.reader.replaced.test.ts`, gives the reader, for one `.gitignore` only, its stats while the file then grows, or another file's stats, as another program can change the file between the reader's open and its checks, a gap the module does nothing in that a test could wait on; every other handle gets its real stats.
  It changes no production code.
- One mock of `FileHandle`'s `write`, reached through an open handle's class, writes part of one journal record and then, in `restore-journal.torn-append.test.ts`, fails with ENOSPC, as a full disk can, or, in `restore-journal.short-append.test.ts` and `restore-journal.short-create.test.ts`, gives the count of bytes it wrote, as a nearly full disk can; no test can make either on demand, and every other write is real.
  It changes no production code.
- One mock of `isFile` on Node's bigint stats, reached through a stats object's class, in `folder-walker.socket.test.ts`, tells the walker, for one file only, that it is no file, as a socket or a named pipe is, which Windows can't make in a folder; every other item gets its real kind, from its mode.
  It changes no production code.
- One mock of `readdir` on `node:fs`'s `promises`, in `tests/fixtures/listing.fixture.ts`, which `syncBuiltinESMExports` passes to the module's import from `node:fs/promises`, changes the folder just before the module lists a chosen folder, deleting it, a file in it or the folder above, or adding to it, then lists it for real, as another program can while the module walks, a gap the module does nothing in that a test could wait on; each moment acts once, the test fails when one never comes, and every other listing is the real one.
  Each test that uses it is in a file of its own, since the mock sees every listing of its process; it changes no production code.
- One spy on Noldova Desktop's `OwnedProcess.stopAsync`, through `mock.method` with no implementation of its own, so the real method runs, in `git-runner.test.ts` and `git-process.test.ts`, counts the stops that cat-file's idle limit and the wait for a command's end ask for: asking for the stop is what the limit changes at once, while the process exits later, so a test checks the count a millisecond before the limit and at it; it changes no production code.
- One test gives a rollback, through the stager `RestoreRollback`'s constructor takes, a `BlobStager` that stages for real and then removes the staged files, `RemovedOnceStaged` in `restore-rollback.test.ts`: it stands in for another program that removes them between the staging and the rollback, a gap the module does nothing in that a test could wait on.
- `.github/workflows/build-and-test.yml` calls the organization's shared `build-and-test.yml`, v2.34.0, with `publishes: true`, on GitHub-hosted runners, as the `.github` repository's README describes it.
  Each target's job builds, checks the toolchain, Node.js 26.13.1 with npm 11.20.0, and the line endings, `* text=auto eol=lf` in `.gitattributes` and LF only with exactly one final newline in every tracked text file, then runs `npm run test -- --skip-test-details --skip-coverage-details` and checks that the build and the tests changed no tracked file.
  On Linux x64 it also builds a second time and checks that the archives are the same, byte for byte, and on every target it checks the archives as the release does, with `pipelines archive`: each archive's name, version, `gitHead`, scope and licence, and a byte-for-byte copy of every file `--list-copies` lists.
- Every pull request, draft or ready, runs Linux and Windows x64 and macOS arm64, and every push to `main` and every run started by hand every target: Linux, Windows and macOS, each on x64 and ARM64.
  On each, a test runs the installed Git build's `git --version` and expects the version `builds.json` pins for that system.
  A release downloads and checks every target's pinned build.
- `.github/workflows/module-range.yml` calls Noldova Desktop's "Module range" workflow, pinned to Noldova Desktop 0.0.1's commit, with `src/noldova.checkpoints`, on every pull request, every night and by hand.
  It builds and tests the module against the newest published Noldova Desktop inside `module.json`'s `noldovaDesktop` range, which Desktop Build's range check, at the Noldova Desktop version the root `package.json` pins, chooses, and a failing nightly run opens or updates an issue, so it holds only `contents: read` and `issues: write`.
  Its build step first runs `npm run peers:newest`, `scripts/move-peers.ts`, which installs at the root, without saving it, the newest published version of each `@noldova/context.` package inside the packages' peer ranges, and that same version of each other `@noldova/context.` package the root `package.json` pins, since the context packages are released together at one version, so one copy of each is installed, naming in the same install the version `node_modules` holds of each other `@noldova/` package the root `package.json` pins, as the build does, so the Noldova Desktop version the run moved to stays, and checks that `node_modules` holds it, so the build, the tests and the consumer project run on it, and the newest context package inside the range is tested every night too.

### Running CI's other steps locally

`npm test` covers the tests; the shared workflow's other steps run from the organization's pipelines tool, `@noldova/tools.pipelines.github`, at the version the pinned `build-and-test.yml` names in `PIPELINES_TOOL`.
Install it outside the checkout, then run it from the checkout's root after a clean `npm run build`:

```bash
npm install --prefix ../pipelines-tool --no-audit --no-fund @noldova/tools.pipelines.github@<version>
export PATH="$PWD/../pipelines-tool/node_modules/.bin:$PATH"
pipelines toolchain 26.13.1 11.20.0
pipelines line-endings
npm test
pipelines unchanged
pipelines reproducible _packages
pipelines archive _packages "$(node -p 'require("./version.json").version')" "$(git rev-parse HEAD)" @noldova
```

`reproducible` builds a second time and compares the archives, as CI does on Linux x64 alone.
`archive` checks the archives as the release does; while the repository is private, the shared workflow's publish scope is `@noldova-com`, so only the public repository's run passes it with `@noldova`.

## Updating the Git builds

A weekly workflow, `.github/workflows/git-builds.yml`, files an issue labelled `git-build` for each newer MinGit or dugite-native release, as [documents/ARCHITECTURE.md](documents/ARCHITECTURE.md#the-git-builds) says.
A PR that moves `builds.json` to newer builds takes each archive's address, size and SHA-256 from its release, then runs `node scripts/list-git-builds.ts`.
It installs nothing and builds nothing, and downloads every target's archive, about 300 MB, checking each one's size and SHA-256 against `builds.json` as the build does.
Into `_build/git-lists` it writes each archive's entries as `listings/<target>.txt` lists them, and MinGit's `etc/package-versions.txt`, under `package-versions/<target>.txt`.
- The PR also pins in `builds.json`'s `sources` the upstream pages of the new builds' source and the source file of each component they hold, by its address, size and SHA-256, or by its commit's page alone for an archive GitHub generates, so the packages name them.
- The new listings replace `src/noldova.checkpoints.git/listings/`; an entry they no longer hold leaves `dropped/` too, and a new program of Git LFS or the credential manager joins it.
  The CA certificate bundles stay in `dropped/` too: the release refuses them as files that may hold credentials, and the module never reaches a server, since its stores have no remote.
- `components/<target>.json` takes each Windows component's name and version from the package list, which the build then holds it to, and each dugite-native component's from the release and its `dependencies.json`; a licence text the build now holds replaces the one pinned in `licenses/`, and a pinned text whose component moved is checked against its upstream file.

## Flake proof

The "Flake proof" workflow, `.github/workflows/flake-proof.yml`, calls the organization's shared flake proof, which the `.github` repository's README describes under "Proving flakes", pinned to a full commit SHA.
It runs `npm test` many times on GitHub-hosted Linux, Windows and macOS runners, as "Build and test" does, to show that a fix holds a flaky test steady.
A maintainer starts it by hand, and each job builds once and then runs the tests in a loop:

```bash
gh workflow run flake-proof.yml --ref <branch> -f "filter=<test files>" -f runs=10 -f jobs=2 -f "targets=linux-x64 windows-x64"
```

| Input | What it takes | Default |
|---|---|---|
| `ref` | The branch, tag or commit to test. | The branch the run starts on. |
| `filter` | The test files `npm test` takes, separated by spaces, which it runs without the coverage gates; empty runs the whole suite. | Empty. |
| `runs` | The runs per target, 1 to 200, shared among the jobs, each of which stops after 120 minutes. | 10 |
| `jobs` | The parallel jobs per target, 1 to 4. | 2 |
| `targets` | The targets, separated by spaces, from `linux-x64`, `linux-arm64`, `windows-x64`, `windows-arm64`, `macos-x64` and `macos-arm64`. | `linux-x64 windows-x64` |

The run's summary gives each job's runs, passes and failures; a failed run's last 60 log lines are in the job's log, and its whole log in the job's artifact for the days the shared settings name.

The flake-proof job's concurrency group is named by `ref` and the first 16 hex digits of the filter's SHA-256, which a first job, "Concurrency group", works out, since GitHub refuses a run whose group is over 400 characters before it starts.
Runs of different filters go side by side; a second run of the same `ref` and `filter` shows its first job done and waits at its flake-proof job until the first run ends.

## Releases

The packages, `@noldova/checkpoints`, `@noldova/checkpoints.protocol` and the Git packages, `@noldova/checkpoints.git.<platform>-<arch>` for each target in `src/noldova.checkpoints.git/builds.json`, are published to npm by the "Release npm packages" workflow, `.github/workflows/release-npm.yml`, through npm's trusted publishing, so no token is stored, and a release never deletes a published version.
A maintainer starts it by hand with the version, which `version.json` and the root `package.json` hold, and the full hash of the commit on `main` to release; the version changes in a pull request before its release, in the Git packages' committed manifests too.
It calls the organization's shared npm release workflow, pinned to a full commit SHA, whose README says what each job does, in the `release` environment; after the release, its dependents job calls the organization's shared `update-dependents.yml` with the version and the commit.
The shared workflow reads the version from `version.json`, checks that the commit is on `main` and holds it, tags the commit, runs `npm ci` and `npm run build`, checks the archives in `_packages` with its pipelines tool, which lists the packages from the `package.json` files committed under `src`, so each Git package's manifest is committed as `src/noldova.checkpoints.git/packages/<target>/package.json`, and publishes them.
Its build job runs `npm run build` with `RELEASE_VERSION`, `RELEASE_COMMIT` and `RELEASE_SCOPE` set, which packs every target's Git package, ARM64 included, as every build does, each from its pinned build, downloaded and checked as [Checks](#checks) says, records the commit as each package's `gitHead`, and then runs the `check` step below on `_packages`, failing the build on any finding.
`npm run build --silent -- --list-copies` builds nothing and prints each file the build copies into a package unchanged, which the release's `pipelines archive` compares with the archives: each line holds the source from the root, the package's name and the path inside the package, separated by tabs, and the last line is `end of copies`.
The copies are `LICENSE` and each package folder's `README.md`, which the build refuses to go without, in the protocol's and the module's packages, the module's own JSON files at the module package's root, and any scripts beside the sources or `native` folder a package's folder holds; the compiled scripts, the declarations, whose imports the build rewrites, and the Git packages' files, which come from the pinned builds, aren't copies.
Any other option beside `--list-copies` fails the build.

The `check` step, in `scripts/services/release.ts`, which uses only Node.js's own modules, refuses a checkout that is not at the commit, and a folder that doesn't hold exactly one archive for each package at the version.
Each archive must be smaller than 256,000,000 bytes, and is read only then; its `package.json` must have the package's name in the scope and the version, must not be marked private, must record the commit as its `gitHead`, must name the version exactly for every one of these packages among its dependencies and optional dependencies, must take every other dependency at one exact version, and must have exports the archive holds.
  Its peers on the organization's `@noldova/` packages are each a range `>=<lowest version> <first version refused>`, the first refused being the next minor of a 0.x lowest version, such as `<0.1.0` for any 0.0.x, or the next major from 1.0.0, that holds the exact version the root `package.json` pins for the same package, the version the build and the tests used.
The module's archive must hold `module.json` at the version.
Its `noldovaDesktop`, the range of Noldova Desktop versions it accepts, must be `>=<lowest version> <first version refused>` with the first refused found the same way, and its peers on Noldova Desktop's `@noldova/desktop.` packages must name that same range.
Each Git package must name a single target in `os` and `cpu` and hold the Git program its `package.json` names, and its `noldovaDesktop.sourcePages` and `noldovaDesktop.sources` must be the pages and files `builds.json` pins for its build, entry by entry.

A failed release runs again whole, as a new run, which builds and checks the archives again.

## License

Checkpoints, `@noldova/checkpoints` and `@noldova/checkpoints.protocol` are licensed under the [MIT License](LICENSE).
The Git packages keep their upstream licences, as [The Git builds](#the-git-builds) says, and the other third-party packages keep their own licenses, which their packages carry.

Git, Git for Windows, MinGit, Git LFS, dugite-native, MSYS2, MinGW, GitHub, Linux, macOS, Node.js, npm, SPDX and Windows are names of their owners.

## Trademarks

The code is under the MIT License, while the name "Noldova" and its logo are not: the MIT License grants no right to them.
A build from this code that is published by anyone but Noldova uses another name and its own logo.
