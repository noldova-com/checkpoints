/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CaptureRequest, CompareRequest, DeleteFolderRequest, ListRequest, PreviewRequest, ReadRequest, RestoredEvent, RestoreHeldUpEvent, RestoreRequest, StorageRequest, UnreadPath,
  UnreadReason
} from "@noldova/checkpoints.protocol";

describe("Resources", { concurrency: true }, () => {
  it("names the checkpoints methods", () => {
    assert.deepEqual([CaptureRequest.method, ListRequest.method, CompareRequest.method, ReadRequest.method, PreviewRequest.method, RestoreRequest.method, StorageRequest.method,
      DeleteFolderRequest.method], ["checkpoints.capture", "checkpoints.list", "checkpoints.compare", "checkpoints.read", "checkpoints.previewRestore", "checkpoints.restore",
      "checkpoints.storage", "checkpoints.deleteFolder"]);
  });

  it("names the checkpoints events", () => {
    assert.deepEqual([RestoredEvent.event, RestoreHeldUpEvent.event], ["checkpoints.restored", "checkpoints.restoreHeldUp"]);
  });

  it("formats a relative path it refuses", () => {
    assert.throws(() => new UnreadPath("a//b", UnreadReason.Denied, null), {
      name: "InvalidRelativePathException",
      message: "\"a//b\" is not a path inside a folder: its names must be non-empty, never \".\" or \"..\", and joined by \"/\"."
    });
  });
});
