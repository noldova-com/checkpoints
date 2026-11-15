/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind } from "@noldova/checkpoints.protocol";

import { UnknownEntryKindException, UnknownGitModeException } from "../../src/api/index.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { StatsFixture } from "../fixtures/stats.fixture.ts";

describe("EntryKind", { concurrency: true }, () => {
  it("gives each kind the mode Git's tree holds it with", () => {
    assert.deepEqual([EntryKind.File.gitMode, EntryKind.Executable.gitMode, EntryKind.Link.gitMode], ["100644", "100755", "120000"]);
  });

  it("gives each kind the kind of path the protocol names it by", () => {
    assert.deepEqual([EntryKind.File.pathKind, EntryKind.Executable.pathKind, EntryKind.Link.pathKind], [PathKind.File, PathKind.Executable, PathKind.Link]);
  });

  it("keeps a link as a link, on any system", () => {
    assert.equal(EntryKind.ofStats("linux", StatsFixture.of("link", 0o120777n, 4n, 1n, 1n, 1n)), EntryKind.Link);
    assert.equal(EntryKind.ofStats("win32", StatsFixture.of("link", 0o120666n, 4n, 1n, 1n, 1n)), EntryKind.Link);
  });

  it("keeps a file its owner may run as executable, as Git reads the mode", () => {
    assert.equal(EntryKind.ofStats("linux", StatsFixture.of("file", 0o100744n, 4n, 1n, 1n, 1n)), EntryKind.Executable);
    assert.equal(EntryKind.ofStats("darwin", StatsFixture.of("file", 0o100654n, 4n, 1n, 1n, 1n)), EntryKind.File);
  });

  it("keeps every file on Windows as a plain file, since Windows keeps no executable bit", () => {
    assert.equal(EntryKind.ofStats("win32", StatsFixture.of("file", 0o100777n, 4n, 1n, 1n, 1n)), EntryKind.File);
  });

  it("keeps nothing of a socket, a pipe or a device", () => {
    assert.equal(EntryKind.ofStats("linux", StatsFixture.of("socket", 0o140755n, 0n, 1n, 1n, 1n)), null);
  });

  it("reads each kind back from the mode Git's tree holds it with", () => {
    for (const kind of [EntryKind.File, EntryKind.Executable, EntryKind.Link])
      assert.equal(EntryKind.ofGitMode(kind.gitMode), kind);
  });

  it("refuses a mode the module never writes, such as a submodule's", () => {
    assert.throws(() => EntryKind.ofGitMode("160000"),
      new UnknownGitModeException("160000"));
  });

  it("reads each kind back from its value", () => {
    for (const kind of [EntryKind.File, EntryKind.Executable, EntryKind.Link])
      assert.equal(EntryKind.fromJson(kind.toJson()), kind);
    assert.deepEqual([EntryKind.File.toJson(), EntryKind.Executable.toJson(), EntryKind.Link.toJson()], ["File", "Executable", "Link"]);
  });

  it("refuses a value that names no kind", () => {
    assert.throws(() => EntryKind.fromJson("Folder"), new UnknownEntryKindException("Folder"));
  });
});
