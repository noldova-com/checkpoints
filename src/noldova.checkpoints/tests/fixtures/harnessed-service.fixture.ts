/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FolderStore } from "../../src/models/folder-store.ts";
import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";

export class HarnessedService<T> {
  public readonly harness: CheckpointsHarness;
  public readonly service: T;
  public readonly store: FolderStore;

  public constructor(service: T, store: FolderStore, harness: CheckpointsHarness) {
    this.harness = harness;
    this.service = service;
    this.store = store;
  }
}
