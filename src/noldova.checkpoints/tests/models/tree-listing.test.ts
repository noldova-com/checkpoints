/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TreeLineMalformedException } from "../../src/exceptions/tree-line-malformed.exception.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { TreeListing } from "../../src/models/tree-listing.ts";

describe("TreeListing", { concurrency: true }, () => {
  const zeros = "0".repeat(40);
  const lineOf = (mode: string, objectId: string): string => `:000000 ${mode} ${zeros} ${objectId} A`;

  it("reads diff-tree's lines into the files by their paths in the folder and the .gitignore files by their folders, skipping any other path", () => {
    const output = [
      lineOf("100644", "a".repeat(40)), "files/a.txt",
      lineOf("120000", "b".repeat(40)), "files/out",
      lineOf("100644", "c".repeat(40)), "rules/.gitignore",
      lineOf("100644", "d".repeat(40)), "rules/sub/.gitignore",
      lineOf("100644", "e".repeat(40)), "checkpoint.json",
      ""
    ].join("\0");

    const listing = TreeListing.parse(output);

    assert.deepEqual(listing.files, new Map([["a.txt", new TreeFile(EntryKind.File, "a".repeat(40))], ["out", new TreeFile(EntryKind.Link, "b".repeat(40))]]));
    assert.deepEqual(listing.rules, new Map([["", "c".repeat(40)], ["sub", "d".repeat(40)]]));
  });

  it("reads an empty diff-tree as no files and no rules", () => {
    const listing = TreeListing.parse("");

    assert.deepEqual([listing.files.size, listing.rules.size], [0, 0]);
  });

  it("refuses a line that gives no mode or no object id, naming the line", () => {
    for (const line of [":000000", `:000000 100644 ${zeros}`])
      assert.throws(() => TreeListing.parse(`${line}\0files/a.txt\0`), new TreeLineMalformedException(line));
  });
});
