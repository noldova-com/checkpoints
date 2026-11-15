/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, UnknownLinkKindException } from "../../src/api/index.ts";

describe("UnknownLinkKindException", { concurrency: true }, () => {
  it("names the kind of link it doesn't know", () => {
    const error = new UnknownLinkKindException("Junction");

    assert.equal(error.name, "UnknownLinkKindException");
    assert.equal(error.message, "\"Junction\" is not a known kind of link.");
    assert.equal(error.value, "Junction");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
