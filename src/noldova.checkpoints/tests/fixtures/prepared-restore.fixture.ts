/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import type { Checkpoint } from "@noldova/checkpoints.protocol";

import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";

export class PreparedRestore {
  public readonly checkpoint: Checkpoint;
  public readonly saved: Awaited<ReturnType<CheckpointsHarness["snapshotAsync"]>>;

  public constructor(checkpoint: Checkpoint, saved: Awaited<ReturnType<CheckpointsHarness["snapshotAsync"]>>) {
    this.checkpoint = checkpoint;
    this.saved = saved;
  }

  public static async prepareAsync(harness: CheckpointsHarness): Promise<PreparedRestore> {
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("b.txt", "b");
    await harness.writeAsync("c/d.txt", "d");
    await harness.writeAsync("e/f.txt", "f");
    await harness.writeAsync("g", "g");
    await harness.writeAsync("é/ü.txt", "ü");
    const checkpoint = await harness.checkpointAsync(null);
    const saved = await harness.snapshotAsync();
    await harness.writeAsync("a.txt", "a, changed");
    await rm(path.join(harness.folder, "b.txt"));
    await rm(path.join(harness.folder, "c"), { recursive: true });
    await rm(path.join(harness.folder, "e"), { recursive: true });
    await harness.writeAsync("e", "e as a file");
    await rm(path.join(harness.folder, "g"));
    await harness.writeAsync("g/x.txt", "x");
    await mkdir(path.join(harness.folder, "h"));
    await harness.writeAsync("i.txt", "i");
    await harness.writeAsync("k/l.txt", "l");
    await harness.writeAsync("é/ü.txt", "ü, changed");
    return new PreparedRestore(checkpoint, saved);
  }
}
