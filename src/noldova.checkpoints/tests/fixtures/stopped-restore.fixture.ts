/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { RestoreRequest, type JsonObject, type RestorePlan } from "@noldova/checkpoints.protocol";
import { UpdateProcess } from "@noldova/desktop.protocol";
import { type OwnedProcess, ProcessRequest } from "@noldova/desktop.runtime";

import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";
import { DesktopProcesses } from "./desktop-processes.fixture.ts";
import { JsonFixture, type JsonFields } from "./json.fixture.ts";
import { ScriptedJournal } from "./scripted-journal.fixture.ts";
import { StopPoint } from "./stop-point.fixture.ts";

export class StoppedRestore {
  public static readonly recordedLine: string = "recorded ";

  private static readonly CHILD: string = path.join(import.meta.dirname, "stopped-restore.child.ts");

  public readonly action: string;
  public readonly folder: string;
  public readonly moduleFolder: string;
  public readonly noHardLinks: boolean;
  public readonly request: RestoreRequest;
  public readonly stop: StopPoint;
  public readonly store: string;
  public readonly time: number;

  public constructor(moduleFolder: string, folder: string, store: string, request: RestoreRequest, stop: StopPoint, action: string, noHardLinks: boolean, time: number) {
    this.action = action;
    this.folder = folder;
    this.moduleFolder = moduleFolder;
    this.noHardLinks = noHardLinks;
    this.request = request;
    this.stop = stop;
    this.store = store;
    this.time = time;
  }

  public static fromJson(fields: JsonFields): StoppedRestore {
    return new StoppedRestore(JsonFixture.textOf(fields["moduleFolder"]), JsonFixture.textOf(fields["folder"]), JsonFixture.textOf(fields["store"]),
      RestoreRequest.fromJson(fields["request"]), StopPoint.fromJson(JsonFixture.objectOf(fields["stop"])), JsonFixture.textOf(fields["action"]),
      JsonFixture.booleanOf(fields["noHardLinks"]), JsonFixture.numberOf(fields["time"]));
  }

  public static async stopAsync(harness: CheckpointsHarness, plan: RestorePlan, stop: StopPoint, action: string = "none", noHardLinks: boolean = false): Promise<readonly UpdateProcess[]> {
    harness.clock.tick(1);
    const restore = new StoppedRestore(harness.context.moduleFolder, harness.folder, harness.store, new RestoreRequest(harness.reference, plan), stop, action, noHardLinks,
      harness.clock.now());
    const input = path.join(harness.root, "stopped-restore.json");
    const temporary = path.join(harness.root, "stopped-restore-temp");
    await writeFile(input, JSON.stringify(restore.toJson()));
    await mkdir(temporary, { recursive: true });
    const child = await harness.context.startProcessAsync(new ProcessRequest(process.execPath, [StoppedRestore.CHILD, input], harness.root,
      { TMPDIR: temporary, TEMP: temporary, TMP: temporary }, ["NODE_V8_COVERAGE"]));
    const written = await StoppedRestore.stoppedAsync(child);
    process.kill(child.processId, "SIGKILL");
    await child.exited;
    harness.clock.tick(1);
    await DesktopProcesses.endLeftoversAsync(temporary);
    return StoppedRestore.recordedOf(written);
  }

  public toJson(): JsonObject {
    return {
      moduleFolder: this.moduleFolder,
      folder: this.folder,
      store: this.store,
      request: this.request.toJson(),
      stop: this.stop.toJson(),
      action: this.action,
      noHardLinks: this.noHardLinks,
      time: this.time
    };
  }

  private static recordedOf(written: string): readonly UpdateProcess[] {
    const recorded = new Map<number, UpdateProcess>();
    for (const line of written.split("\n").filter(t => t.startsWith(StoppedRestore.recordedLine)))
      for (const value of JsonFixture.listOf(JSON.parse(line.slice(StoppedRestore.recordedLine.length))))
        recorded.set(JsonFixture.numberOf(JsonFixture.objectOf(value)["processId"]), UpdateProcess.fromJson(value));
    return [...recorded.values()];
  }

  private static async stoppedAsync(child: OwnedProcess): Promise<string> {
    const output: string[] = [];
    const errors: string[] = [];
    const { promise: stopped, resolve } = Promise.withResolvers<void>();
    child.output.setEncoding("utf8");
    child.errors.setEncoding("utf8");
    child.output.on("data", (chunk: string) => {
      output.push(chunk);
      if (output.join("").split("\n").includes(ScriptedJournal.stoppedLine))
        resolve();
    });
    child.errors.on("data", (chunk: string) => errors.push(chunk));
    const ended = child.exited.then(exit => {
      throw new Error(`The restore ended with code ${String(exit.code)} before it stopped, writing: ${output.join("")}${errors.join("")}`);
    });
    await Promise.race([stopped, ended]);
    return output.join("");
  }
}
