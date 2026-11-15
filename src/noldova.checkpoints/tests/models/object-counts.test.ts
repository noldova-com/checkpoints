/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StoreCountMissingException } from "../../src/exceptions/store-count-missing.exception.ts";
import { ObjectCounts } from "../../src/models/object-counts.ts";

describe("ObjectCounts", { concurrency: true }, () => {
  const output = "count: 3\nsize: 12\nin-pack: 40\npacks: 2\nsize-pack: 96\nprune-packable: 0\ngarbage: 0\nsize-garbage: 0\n";

  it("reads the loose objects, their size, the packs and their size from what count-objects -v gives", () => {
    const counts = ObjectCounts.parse(output);

    assert.deepEqual([counts.loose, counts.looseSize, counts.packs, counts.packSize], [3, 12, 2, 96]);
  });

  it("refuses an output that gives no count it reads, naming that count", () => {
    for (const name of ["count", "size", "packs", "size-pack"]) {
      const missing = output.split("\n").filter(u => !u.startsWith(`${name}: `)).join("\n");

      assert.throws(() => ObjectCounts.parse(missing), (error: unknown) => error instanceof StoreCountMissingException && error.count === name);
    }
  });

  it("refuses a count with no value or one that isn't a whole number, naming that count", () => {
    for (const value of ["", "many", "1.5", "-2"]) {
      const invalid = output.replace("count: 3", `count: ${value}`);

      assert.throws(() => ObjectCounts.parse(invalid), (error: unknown) => error instanceof StoreCountMissingException && error.count === "count", value);
    }
  });
});
