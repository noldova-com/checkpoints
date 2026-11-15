/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, UnknownEntryKindException } from "../../src/api/index.ts";

describe("UnknownEntryKindException", { concurrency: true }, () => {
  it("names the kind of entry it doesn't know", () => {
    const error = new UnknownEntryKindException("Socket");

    assert.equal(error.name, "UnknownEntryKindException");
    assert.equal(error.message, "\"Socket\" is not a known kind of entry.");
    assert.equal(error.value, "Socket");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
