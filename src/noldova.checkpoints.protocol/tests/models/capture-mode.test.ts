/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, UnknownCaptureModeException } from "@noldova/checkpoints.protocol";

describe("CaptureMode", { concurrency: true }, () => {
  it("writes and reads each mode by its name", () => {
    assert.equal(CaptureMode.EveryFile.toJson(), "EveryFile");
    assert.equal(CaptureMode.IgnoreFiles.toJson(), "IgnoreFiles");
    assert.equal(CaptureMode.fromJson("EveryFile"), CaptureMode.EveryFile);
    assert.equal(CaptureMode.fromJson("IgnoreFiles"), CaptureMode.IgnoreFiles);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => CaptureMode.fromJson("everyFile"), new UnknownCaptureModeException("everyFile"));
    assert.throws(() => CaptureMode.fromJson(1), new UnknownCaptureModeException("1"));
  });
});
