/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { TestContext } from "node:test";

import { CaptureRequest } from "@noldova/checkpoints.protocol";

import { FolderStore } from "../../src/models/folder-store.ts";
import { HousekeepingRecord } from "../../src/models/housekeeping-record.ts";
import type { GitRunner } from "../../src/services/git-runner.ts";
import { StoreFile } from "../../src/services/store-file.ts";
import { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";
import { LeftObject } from "./left-object.fixture.ts";
import { ServiceSeams } from "./service-seams.fixture.ts";

export class HousekeepingStore {
  public readonly git: GitRunner;
  public readonly harness: CheckpointsHarness;
  public readonly store: FolderStore;

  private constructor(harness: CheckpointsHarness, git: GitRunner) {
    this.git = git;
    this.harness = harness;
    this.store = new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity);
  }

  public get packFolder(): string {
    return path.join(this.store.gitFolder, "objects", "pack");
  }

  public static async startAsync(t: TestContext): Promise<HousekeepingStore> {
    const harness = await CheckpointsHarness.startAsync(t);
    const service = await harness.createServiceAsync(ServiceSeams.system);
    await harness.writeAsync("a.txt", "a.txt 1");
    await service.captureAsync(new CaptureRequest(harness.reference, "first"));
    await harness.writeAsync("a.txt", "a.txt 2");
    await service.captureAsync(new CaptureRequest(harness.reference, "second"));
    await service.stopAsync();
    return new HousekeepingStore(harness, await harness.createGitRunnerAsync());
  }

  public async leaveAsync(text: string, packed: boolean): Promise<LeftObject> {
    const id = (await this.harness.gitAsync(["hash-object", "--stdin"], text)).toString("utf8").trim();
    if (!packed) {
      await this.harness.gitAsync(["hash-object", "-w", "--stdin"], text);
      return new LeftObject(id, [path.join(this.store.gitFolder, "objects", id.slice(0, 2), id.slice(2))]);
    }
    const before = new Set(await readdir(this.packFolder));
    await this.harness.gitAsync(["-c", "fastimport.unpackLimit=0", "fast-import", "--quiet"], `blob\ndata ${Buffer.byteLength(text)}\n${text}\n`);
    return new LeftObject(id, (await readdir(this.packFolder)).filter(t => !before.has(t)).map(t => path.join(this.packFolder, t)));
  }

  public async fillAsync(count: number, packed: boolean): Promise<void> {
    if (!packed) {
      const blobs = Array.from({ length: count }, (_, i) => `blob\ndata ${String(i).length}\n${i}\n`).join("");
      await this.harness.gitAsync(["-c", `fastimport.unpackLimit=${count + 1}`, "fast-import", "--quiet"], blobs);
      return;
    }
    for (let i = 0; i < count; i++)
      await this.leaveAsync(`pack ${i}`, true);
  }

  public async countAsync(): Promise<ReadonlyMap<string, number>> {
    const output = (await this.harness.gitAsync(["count-objects", "-v"])).toString("utf8");
    return new Map(output.split("\n").filter(t => t.includes(": ")).map(t => [t.split(": ")[0] ?? "", Number(t.split(": ")[1])] as const));
  }

  public async existsAsync(id: string): Promise<boolean> {
    const code = await this.harness.exitCodeAsync(["cat-file", "-e", id]);
    if (code !== 0 && code !== 1)
      throw new Error(`git cat-file -e ${id} ended with ${code}.`);
    return code === 0;
  }

  public async checkWholeAsync(): Promise<void> {
    await this.harness.gitAsync(["fsck", "--connectivity-only", "--no-dangling"]);
    const listed = await this.harness.listAsync();
    assert.deepEqual(listed.map(t => t.label), ["second", "first"]);
    assert.deepEqual(await Promise.all(listed.map(async t => (await this.harness.contentAsync(t, "files/a.txt")).toString())), ["a.txt 2", "a.txt 1"]);
  }

  public async writeRecordAsync(fullPass: number): Promise<void> {
    await StoreFile.writeAsync(this.store.housekeepingFile, new HousekeepingRecord(fullPass).toJson());
  }

  public async readRecordAsync(): Promise<HousekeepingRecord | null> {
    return await StoreFile.readAsync(this.store.housekeepingFile, t => HousekeepingRecord.fromJson(t));
  }
}
