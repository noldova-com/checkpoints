/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PathGuard } from "../services/path-guard.ts";
import type { RestoreJournal } from "../services/restore-journal.ts";
import { RestorePaths } from "../services/restore-paths.ts";
import type { FolderStore } from "./folder-store.ts";
import type { IndexEntry } from "./index-entry.ts";
import type { RestoreScript } from "./restore-script.ts";

export class RestoreRun {
  public readonly folder: string;
  public readonly guard: PathGuard;
  public readonly index: ReadonlyMap<string, IndexEntry>;
  public readonly journal: RestoreJournal;
  public readonly script: RestoreScript;
  public readonly store: FolderStore;

  public constructor(store: FolderStore, folder: string, script: RestoreScript, journal: RestoreJournal, guard: PathGuard, index: ReadonlyMap<string, IndexEntry>) {
    this.folder = folder;
    this.guard = guard;
    this.index = index;
    this.journal = journal;
    this.script = script;
    this.store = store;
  }

  public locationOf(relativePath: string): string {
    return RestorePaths.locationOf(this.folder, relativePath);
  }
}
