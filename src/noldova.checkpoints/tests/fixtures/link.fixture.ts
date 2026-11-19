/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { FailureFixture } from "./failure.fixture.ts";

export class LinkFixture {
  public static readonly withoutLinks: string = "this process can't create symbolic links, as on Windows without Developer Mode";
  public static readonly withLinks: string = "this process creates symbolic links";

  public static async withoutLinksAsync(): Promise<string | false> {
    const folder = await mkdtemp(path.join(tmpdir(), "link-"));
    try {
      return await LinkFixture.symlinkAsync("target", path.join(folder, "link"), "file").then(() => false, (error: unknown) => {
        if (!(error instanceof Error) || error.message !== LinkFixture.withoutLinks)
          throw error;
        return LinkFixture.withoutLinks;
      });
    }
    finally {
      await rm(folder, { recursive: true, force: true });
    }
  }

  public static async symlinkAsync(target: string, location: string, type: "file" | "dir"): Promise<void> {
    try {
      await symlink(target, location, type);
    }
    catch (error) {
      if (FailureFixture.hasCode(error, "EPERM"))
        throw new Error(LinkFixture.withoutLinks, { cause: error });
      throw error;
    }
  }
}
