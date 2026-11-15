/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FolderStore } from "../../src/models/folder-store.ts";
import type { GitRunner } from "../../src/services/git-runner.ts";
import type { CheckpointsContext } from "./checkpoints-context.fixture.ts";

export class ContextService<T> {
  public readonly context: CheckpointsContext;
  public readonly git: GitRunner;
  public readonly service: T;
  public readonly store: FolderStore;

  public constructor(service: T, store: FolderStore, context: CheckpointsContext, git: GitRunner) {
    this.context = context;
    this.git = git;
    this.service = service;
    this.store = store;
  }
}
