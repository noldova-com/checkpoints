/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind, ProtocolException, SideSizeMismatchException } from "@noldova/checkpoints.protocol";

describe("SideSizeMismatchException", { concurrency: true }, () => {
  it("names the kind the size disagrees with", () => {
    const exception = new SideSizeMismatchException(PathKind.Folder);

    assert.equal(exception.name, "SideSizeMismatchException");
    assert.equal(exception.message, "A side has a size exactly when it isn't a folder, and a folder is never text; the kind is Folder.");
    assert.equal(exception.kind, PathKind.Folder);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
