/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomUUID } from "node:crypto";
import { rm, symlink } from "node:fs/promises";
import path from "node:path";

import { FailureFixture } from "./failure.fixture.ts";

export class LinkFixture {
  public static readonly refused: string = "this machine can't create symbolic links: on Windows, turn on Developer Mode";

  public static async symlinkAsync(target: string, location: string, type: "file" | "dir"): Promise<void> {
    try {
      await symlink(target, location, type);
    }
    catch (error) {
      if (FailureFixture.hasCode(error, "EPERM"))
        throw new Error(LinkFixture.refused, { cause: error });
      throw error;
    }
  }

  public static async requireAsync(folder: string): Promise<void> {
    const location = path.join(folder, `required-link-${randomUUID()}`);
    await LinkFixture.symlinkAsync("target", location, "file");
    await rm(location);
  }
}
