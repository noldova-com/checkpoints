/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidBase64Exception, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidBase64Exception", { concurrency: true }, () => {
  it("says the content is not base64 text", () => {
    const exception = new InvalidBase64Exception();

    assert.equal(exception.name, "InvalidBase64Exception");
    assert.equal(exception.message, "The content is not base64 text.");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
