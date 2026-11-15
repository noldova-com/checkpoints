/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RestoreAction, UnknownRestoreActionException } from "@noldova/checkpoints.protocol";

describe("RestoreAction", { concurrency: true }, () => {
  it("writes and reads each action by its name", () => {
    const actions = [RestoreAction.Write, RestoreAction.Replace, RestoreAction.Delete];
    assert.deepEqual(actions.map(t => t.toJson()), ["Write", "Replace", "Delete"]);
    for (const action of actions)
      assert.equal(RestoreAction.fromJson(action.toJson()), action);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => RestoreAction.fromJson("Move"), new UnknownRestoreActionException("Move"));
  });
});
