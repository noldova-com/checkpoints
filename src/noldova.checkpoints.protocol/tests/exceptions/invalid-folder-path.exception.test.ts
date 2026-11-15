/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidFolderPathException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidFolderPathException", { concurrency: true }, () => {
  it("names the path it refuses", () => {
    const exception = new InvalidFolderPathException("project");

    assert.equal(exception.name, "InvalidFolderPathException");
    assert.equal(exception.message, "\"project\" is not an absolute folder path.");
    assert.equal(exception.path, "project");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
