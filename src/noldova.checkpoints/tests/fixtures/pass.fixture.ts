/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FolderStore } from "../../src/models/folder-store.ts";

export class PassFixture {
  public readonly signals: AbortSignal[] = [];
  public passAsync: (signal: AbortSignal) => Promise<boolean> = async () => true;

  public async runAsync(_store: FolderStore, signal: AbortSignal): Promise<boolean> {
    this.signals.push(signal);
    return await this.passAsync(signal);
  }
}
