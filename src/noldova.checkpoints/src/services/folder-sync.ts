/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { open } from "node:fs/promises";

import { Resources } from "../resources.ts";

export class FolderSync {
  private readonly flags: string;

  public constructor(platform: string) {
    this.flags = platform === Resources.windowsPlatform ? Resources.readWriteFlag : Resources.readFlag;
  }

  public async syncAsync(folder: string): Promise<void> {
    const handle = await open(folder, this.flags);
    try {
      await handle.sync();
    }
    finally {
      await handle.close();
    }
  }
}
