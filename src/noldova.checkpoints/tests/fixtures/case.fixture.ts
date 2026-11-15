/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { FailureFixture } from "./failure.fixture.ts";

export class CaseFixture {
  public static async ignoresCaseAsync(): Promise<boolean> {
    const folder = await mkdtemp(path.join(tmpdir(), "case-"));
    try {
      await writeFile(path.join(folder, "probe.txt"), "");
      return await access(path.join(folder, "PROBE.TXT")).then(() => true, (error: unknown) => {
        if (!FailureFixture.hasCode(error, "ENOENT"))
          throw error;
        return false;
      });
    }
    finally {
      await rm(folder, { recursive: true, force: true });
    }
  }
}
