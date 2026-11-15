/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { IndexEntry } from "../../src/models/index-entry.ts";
import { RestoreRun } from "../../src/models/restore-run.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { PathGuard } from "../../src/services/path-guard.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";

describe("RestoreRun", { concurrency: true }, () => {
  const folder = path.join(path.sep, "project");
  const store = new FolderStore(path.join(path.sep, "module"), "id");
  const script = new RestoreScript("r1", "01890a5d-ac96-774b-bcce-b302099a8057", "01890a5d-ac96-774b-bcce-b302099a8058", [], ["dir"], [], new Map());
  const journal = new RestoreJournal(store.restoreFile);
  const guard = new PathGuard(folder, new Map());
  const index = new Map([["a.txt", new IndexEntry("a.txt", EntryKind.File, 1, 2n, 3n, "1:2", "a".repeat(40))]]);
  const run = new RestoreRun(store, folder, script, journal, guard, index);

  it("holds the store, the folder, the script, the journal, the guard and the index of a restore", () => {
    assert.deepEqual([run.store, run.folder, run.script, run.journal, run.guard, run.index], [store, folder, script, journal, guard, index]);
  });

  it("gives the location of a path in the folder, each of its parts a part of the location", () => {
    assert.equal(run.locationOf("dir/sub/a.txt"), path.join(folder, "dir", "sub", "a.txt"));
  });

  it("gives the folder itself as the location of the empty path", () => {
    assert.equal(run.locationOf(""), folder);
  });
});
