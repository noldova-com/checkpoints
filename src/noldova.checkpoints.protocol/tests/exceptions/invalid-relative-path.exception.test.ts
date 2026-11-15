/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidRelativePathException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidRelativePathException", { concurrency: true }, () => {
  it("names the path it refuses", () => {
    const exception = new InvalidRelativePathException("a//b");

    assert.equal(exception.name, "InvalidRelativePathException");
    assert.equal(exception.message, "\"a//b\" is not a path inside a folder: its names must be non-empty, never \".\" or \"..\", and joined by \"/\".");
    assert.equal(exception.path, "a//b");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });

  it("names the backslash rule for a path that breaks only that rule, and the name rules for one that breaks them too", () => {
    assert.equal(new InvalidRelativePathException("a\\b").message,
      "\"a\\b\" is not a path in a restore's scope: its names never hold \"\\\", which Windows reads as a separator between folders.");
    assert.equal(new InvalidRelativePathException("a\\/").message,
      "\"a\\/\" is not a path inside a folder: its names must be non-empty, never \".\" or \"..\", and joined by \"/\".");
  });
});
