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

import { FolderStore } from "../../src/models/folder-store.ts";

describe("FolderStore", { concurrency: true }, () => {
  it("keeps a folder's store under folders/<identity>/, beside the module's shared empty file and hooks folder", () => {
    const module = path.join(path.sep, "data", "modules", "checkpoints");
    const store = new FolderStore(module, "project-1");
    const folder = path.join(module, "folders", "project-1");

    assert.equal(store.moduleFolder, module);
    assert.equal(store.folder, folder);
    assert.equal(store.gitFolder, path.join(folder, "git"));
    assert.equal(store.configFile, path.join(folder, "git", "config"));
    assert.equal(store.headFile, path.join(folder, "git", "HEAD"));
    assert.equal(store.attributesFile, path.join(folder, "git", "info", "attributes"));
    assert.equal(store.indexFile, path.join(folder, "index"));
    assert.equal(store.folderFile, path.join(folder, "folder.json"));
    assert.equal(store.housekeepingFile, path.join(folder, "housekeeping.json"));
    assert.equal(store.emptyFile, path.join(module, "empty"));
    assert.equal(store.hooksFolder, path.join(module, "hooks"));
  });
});
