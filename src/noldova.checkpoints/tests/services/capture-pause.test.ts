/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, CaptureOutcome, CaptureResult, Checkpoint } from "@noldova/checkpoints.protocol";
import type { JsonValue } from "@noldova/context.json";
import { EventChannel } from "@noldova/desktop.runtime";

import { CapturePause } from "../../src/services/capture-pause.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";

describe("CapturePause", () => {
  const checkpoint = new Checkpoint("01890a5d-ac96-774b-bcce-b302099a8057", new Date("2026-01-02T03:04:05.000Z"), CaptureMode.EveryFile, null, []);
  const captured = new CaptureResult(CaptureOutcome.Captured, checkpoint, null, null);
  const short = (free: number): CaptureResult => new CaptureResult(CaptureOutcome.LowDiskSpace, null, free, 3 * 1024 * 1024 * 1024);

  it("raises the paused event at each capture without the space, and the resumed event once, at the next one taken, for that folder alone", t => {
    const context = new CheckpointsContext(t, "module");
    const paused: JsonValue[] = [];
    const resumed: JsonValue[] = [];
    const pause = new CapturePause(context, new EventChannel(t => paused.push(t), () => undefined), new EventChannel(t => resumed.push(t), () => undefined));

    pause.report("project-1", captured);
    pause.report("project-1", short(1024));
    pause.report("project-1", short(512));
    pause.report("project-1", new CaptureResult(CaptureOutcome.FolderMissing, null, null, null));
    pause.report("project-2", captured);
    const beforeResumed = [...resumed];
    pause.report("project-1", captured);
    pause.report("project-1", captured);

    assert.deepEqual(paused, [
      { identity: "project-1", spaceFree: 1024, spaceNeeded: 3 * 1024 * 1024 * 1024 },
      { identity: "project-1", spaceFree: 512, spaceNeeded: 3 * 1024 * 1024 * 1024 }
    ]);
    assert.deepEqual(beforeResumed, []);
    assert.deepEqual(resumed, [{ identity: "project-1" }]);
    assert.deepEqual(context.notifications, []);
  });
});
