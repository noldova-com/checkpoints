/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, ReadOutcome, ReadOutcomeMismatchException } from "@noldova/checkpoints.protocol";

describe("ReadOutcomeMismatchException", { concurrency: true }, () => {
  it("names the outcome the content disagrees with", () => {
    const exception = new ReadOutcomeMismatchException(ReadOutcome.PathMissing);

    assert.equal(exception.name, "ReadOutcomeMismatchException");
    assert.equal(exception.message, "A read result holds content and a size only when its outcome is Read; the outcome is PathMissing.");
    assert.equal(exception.outcome, ReadOutcome.PathMissing);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
