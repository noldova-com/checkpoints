/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { StoreFileUnreadableException, UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { GitLimits } from "../../src/models/git-limits.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { GitRunner } from "../../src/services/git-runner.ts";
import { ObjectReader } from "../../src/services/object.reader.ts";
import { StoreHousekeeping } from "../../src/services/store-housekeeping.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { HousekeepingStore } from "../fixtures/housekeeping-store.fixture.ts";

describe("StoreHousekeeping", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;
  const plentyAsync = async (): Promise<number> => Number.MAX_SAFE_INTEGER;
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;

  const ageAsync = async (files: readonly string[], days: number): Promise<void> => {
    const time = new Date(Date.now() - days * day);
    for (const file of files)
      await utimes(file, time, time);
  };

  it("makes no pass for a folder whose store isn't made yet", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const git = new GitRunner(harness.context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), new GitLimits(60_000, 60_000, 600_000, 10_000), harness.clock);

    assert.equal(await new StoreHousekeeping(git, plentyAsync, harness.clock).runAsync(new FolderStore(harness.context.moduleFolder, "project-2"), uncancelled), false);

    assert.equal(harness.context.requests.length, 0);
  });

  it("makes no pass without the margin free beyond the size of the store's objects, and makes one with it", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    const counts = await fixture.countAsync();
    const needed = 2 * 1024 ** 3 + ((counts.get("size") ?? 0) + (counts.get("size-pack") ?? 0)) * 1024;
    const start = fixture.harness.context.requests.length;

    assert.equal(await new StoreHousekeeping(fixture.git, async () => needed - 1, fixture.harness.clock).runAsync(fixture.store, uncancelled), false);
    assert.deepEqual(fixture.harness.commandsSince(start), ["count-objects"]);
    assert.equal(existsSync(fixture.store.housekeepingFile), false);

    assert.equal(await new StoreHousekeeping(fixture.git, async () => needed, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);
    assert.deepEqual(fixture.harness.commandsSince(start), ["count-objects", "count-objects", "pack-refs", "repack", "prune"]);
  });

  it("packs the references, and at its first full pass drops what a stopped capture left two weeks ago or longer, keeping every checkpoint and what's newer", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    const { id: oldPacked, files: oldPack } = await fixture.leaveAsync("old packed", true);
    const { id: oldLoose, files: oldObject } = await fixture.leaveAsync("old loose", false);
    const { id: newPacked } = await fixture.leaveAsync("new packed", true);
    const { id: newLoose } = await fixture.leaveAsync("new loose", false);
    const oldReport = path.join(fixture.store.gitFolder, "fast_import_crash_1");
    const newReport = path.join(fixture.store.gitFolder, "fast_import_crash_2");
    await writeFile(oldReport, "old");
    await writeFile(newReport, "new");
    await ageAsync([...oldPack, ...oldObject], 21);
    fixture.harness.clock.tick(1000 - fixture.harness.clock.now() % 1000);
    const oldTime = new Date(fixture.harness.clock.now() - 2 * week);
    const newTime = new Date(fixture.harness.clock.now() - 2 * week + 1);
    await utimes(oldReport, oldTime, oldTime);
    await utimes(newReport, newTime, newTime);
    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);

    assert.deepEqual(await Promise.all([oldPacked, oldLoose, newPacked, newLoose].map(t => fixture.existsAsync(t))), [false, false, true, true]);
    assert.equal(existsSync(oldReport), false);
    assert.equal(existsSync(newReport), true);
    const packed = (await readFile(path.join(fixture.store.gitFolder, "packed-refs"), "utf8")).split("\n");
    assert.equal(packed.filter(t => t.includes(" refs/checkpoints/")).length, 2);
    assert.deepEqual((await readdir(path.join(fixture.store.gitFolder, "refs"), { recursive: true, withFileTypes: true })).filter(t => t.isFile()), []);
    assert.equal((await fixture.countAsync()).get("count"), 0);
    assert.equal((await fixture.readRecordAsync())?.fullPass, fixture.harness.clock.now());
    await fixture.checkWholeAsync();
  });

  it("makes a full pass once a week has passed since the last, and only a light one before", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    const recent = fixture.harness.clock.now() - week + 1;
    await fixture.writeRecordAsync(recent);
    const start = fixture.harness.context.requests.length;

    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);
    assert.deepEqual(fixture.harness.commandsSince(start), ["count-objects", "pack-refs"]);
    assert.equal((await fixture.readRecordAsync())?.fullPass, recent);

    await fixture.writeRecordAsync(fixture.harness.clock.now() - week);
    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);
    assert.deepEqual(fixture.harness.commandsSince(start).slice(2), ["count-objects", "pack-refs", "repack", "prune"]);
    assert.equal((await fixture.readRecordAsync())?.fullPass, fixture.harness.clock.now());
    await fixture.checkWholeAsync();
  });

  it("ends the store's fast-import as a pass starts, and its cat-file too before a repack", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    const [checkpoint] = await fixture.harness.listAsync();
    const reader = new ObjectReader(fixture.git);
    const now = fixture.harness.clock.now();
    const housekeeping = new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock);
    const useBothAsync = async (): Promise<void> => {
      await reader.readOneAsync(fixture.store, `refs/checkpoints/${String(checkpoint?.id)}:checkpoint.json`, 0, 0, uncancelled);
      await fixture.git.importAsync(fixture.store, async u => await u.writeAsync("commit refs/probes/probe\nmark :1\ncommitter Probe <probe@host-1.example> 0 +0000\ndata 0\n"), uncancelled);
    };
    const runningCommands = (): readonly string[] => fixture.harness.context.running.map(u => u.command).sort();

    await fixture.writeRecordAsync(now);
    await useBothAsync();
    const beforeLight = runningCommands();
    assert.equal(await housekeeping.runAsync(fixture.store, uncancelled), true);
    const afterLight = runningCommands();
    await fixture.writeRecordAsync(now - week);
    await useBothAsync();
    assert.equal(await housekeeping.runAsync(fixture.store, uncancelled), true);

    assert.deepEqual([beforeLight, afterLight, runningCommands()], [["cat-file", "fast-import"], ["cat-file"], []]);
    await fixture.checkWholeAsync();
  });

  it("makes a full pass when its last is later than now, as after the clock went back", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    await fixture.writeRecordAsync(fixture.harness.clock.now() + day);
    const start = fixture.harness.context.requests.length;

    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);

    assert.deepEqual(fixture.harness.commandsSince(start), ["count-objects", "pack-refs", "repack", "prune"]);
    assert.equal((await fixture.readRecordAsync())?.fullPass, fixture.harness.clock.now());
  });

  it("rolls the packs together at a light pass once the store has 50, as git gc --auto does, and leaves 49 as they are", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    await fixture.writeRecordAsync(fixture.harness.clock.now());
    await fixture.fillAsync(49 - ((await fixture.countAsync()).get("packs") ?? 0), true);
    const housekeeping = new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock);

    assert.equal(await housekeeping.runAsync(fixture.store, uncancelled), true);
    assert.equal((await fixture.countAsync()).get("packs"), 49);
    await fixture.leaveAsync("one more pack", true);
    assert.equal(await housekeeping.runAsync(fixture.store, uncancelled), true);

    assert.equal((await fixture.countAsync()).get("packs"), 1);
    await fixture.checkWholeAsync();
  });

  it("rolls the loose objects into a pack at a light pass once the store has 6,700, as git gc --auto does, and leaves fewer as they are", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    await fixture.writeRecordAsync(fixture.harness.clock.now());
    await fixture.fillAsync(6_699 - ((await fixture.countAsync()).get("count") ?? 0), false);
    const housekeeping = new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock);

    assert.equal(await housekeeping.runAsync(fixture.store, uncancelled), true);
    assert.equal((await fixture.countAsync()).get("count"), 6_699);
    await fixture.leaveAsync("one more", false);
    assert.equal(await housekeeping.runAsync(fixture.store, uncancelled), true);

    assert.equal((await fixture.countAsync()).get("count"), 0);
    await fixture.checkWholeAsync();
  });

  it("refuses a housekeeping.json it can't read before any Git command", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    await writeFile(fixture.store.housekeepingFile, JSON.stringify({ formatVersion: 2, fullPass: 0 }));
    const start = fixture.harness.context.requests.length;

    await assert.rejects(new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), (error: unknown) =>
      error instanceof StoreFileUnreadableException && error.file === "housekeeping.json" && error.cause instanceof UnsupportedStoreFormatException);

    assert.deepEqual(fixture.harness.commandsSince(start), []);
  });

  it("removes at the start of a pass the temporary files a full pass stopped mid-repack left in the pack folder, leaving only packs", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    const left = ["tmp_pack_Ab12Cd", "tmp_idx_Ef34Gh", ".tmp-4120-pack-0123456789abcdef0123456789abcdef01234567.pack"];
    for (const name of left)
      await writeFile(path.join(fixture.packFolder, name), randomBytes(1024));
    const planted = (await readdir(fixture.packFolder)).filter(u => !u.startsWith("pack-")).sort();

    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);

    assert.deepEqual([planted, (await readdir(fixture.packFolder)).filter(u => !u.startsWith("pack-"))], [[...left].sort(), []]);
    await fixture.checkWholeAsync();
  });

  it("removes at the start of a pass the files a killed fast-import left keeping its packs out of a repack, and rolls those packs up", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    await fixture.writeRecordAsync(fixture.harness.clock.now());
    await fixture.fillAsync(50 - ((await fixture.countAsync()).get("packs") ?? 0), true);
    const packs = (await readdir(fixture.packFolder)).filter(u => u.endsWith(".pack"));
    for (const pack of packs)
      await writeFile(path.join(fixture.packFolder, pack.replace(/\.pack$/, ".keep")), "fast-import");

    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);

    assert.deepEqual((await readdir(fixture.packFolder)).filter(u => u.endsWith(".keep")), []);
    assert.equal((await fixture.countAsync()).get("packs"), 1);
    await fixture.checkWholeAsync();
  });

  it("removes at the start of a pass the reference locks a stopped Git command left, then packs the references and repacks", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    const refs = path.join(fixture.store.gitFolder, "refs");
    const loose = (await readdir(refs, { recursive: true, withFileTypes: true })).filter(u => u.isFile()).map(u => path.join(u.parentPath, u.name));
    const [reference] = loose;
    assert.ok(reference !== undefined);
    const locks = [path.join(fixture.store.gitFolder, "packed-refs.lock"), `${reference}.lock`];
    for (const lock of locks)
      await writeFile(lock, "");

    assert.equal(await new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, uncancelled), true);

    assert.deepEqual([loose.length, locks.map(u => existsSync(u))], [2, [false, false]]);
    const packed = (await readFile(path.join(fixture.store.gitFolder, "packed-refs"), "utf8")).split("\n");
    assert.equal(packed.filter(u => u.includes(" refs/checkpoints/")).length, 2);
    assert.deepEqual((await readdir(refs, { recursive: true, withFileTypes: true })).filter(u => u.isFile()), []);
    assert.equal((await fixture.countAsync()).get("count"), 0);
    assert.equal((await fixture.readRecordAsync())?.fullPass, fixture.harness.clock.now());
    await fixture.checkWholeAsync();
  });
});
