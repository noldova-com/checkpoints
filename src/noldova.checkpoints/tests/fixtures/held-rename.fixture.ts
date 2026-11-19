/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";
import { setImmediate } from "node:timers/promises";

import { FailureFixture } from "./failure.fixture.ts";

export class HeldRename {
  private readonly calls: PromiseWithResolvers<void>[];
  private readonly refusals: readonly string[];

  public readonly tries: string[] = [];
  public readonly renameAsync = async (from: string, to: string): Promise<void> => {
    const attempt = this.tries.push(path.basename(from)) - 1;
    this.calls[attempt]?.resolve();
    const code = this.refusals[attempt];
    if (code !== undefined)
      throw new FailureFixture(`${code} for the test`, code);
    await rename(from, to);
  };

  public constructor(refusals: readonly string[]) {
    this.refusals = refusals;
    this.calls = Array.from({ length: refusals.length + 1 }, () => Promise.withResolvers<void>());
  }

  public static async storesAsync(t: TestContext): Promise<string> {
    const module = await mkdtemp(path.join(tmpdir(), "checkpoints-delete-"));
    t.after(() => rm(module, { recursive: true, force: true }));
    for (const identity of ["a", "b"]) {
      await mkdir(path.join(module, "folders", identity, "git", "objects"), { recursive: true });
      await writeFile(path.join(module, "folders", identity, "git", "objects", "pack"), "pack");
    }
    return module;
  }

  public async triedAsync(attempt: number): Promise<void> {
    await this.calls[attempt]?.promise;
    await setImmediate();
  }
}
