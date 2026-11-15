/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, StoreFieldNotABooleanException } from "../../src/api/index.ts";

describe("StoreFieldNotABooleanException", { concurrency: true }, () => {
  it("names the field that isn't true or false", () => {
    const error = new StoreFieldNotABooleanException("ignoresCase");

    assert.equal(error.name, "StoreFieldNotABooleanException");
    assert.equal(error.message, "ignoresCase holds something other than true or false.");
    assert.equal(error.field, "ignoresCase");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
