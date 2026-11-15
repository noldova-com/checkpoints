/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangeStatus, UnknownChangeStatusException } from "@noldova/checkpoints.protocol";

describe("ChangeStatus", { concurrency: true }, () => {
  it("writes and reads each status by its name", () => {
    const statuses = [ChangeStatus.Added, ChangeStatus.Deleted, ChangeStatus.Modified, ChangeStatus.KindChanged, ChangeStatus.Unknown];

    assert.deepEqual(statuses.map(t => t.toJson()), ["Added", "Deleted", "Modified", "KindChanged", "Unknown"]);
    assert.deepEqual(statuses.map(t => ChangeStatus.fromJson(t.value)), statuses);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => ChangeStatus.fromJson("Renamed"), new UnknownChangeStatusException("Renamed"));
  });
});
