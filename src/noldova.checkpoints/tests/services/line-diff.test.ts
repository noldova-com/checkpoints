/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LineDiff } from "../../src/services/line-diff.ts";

describe("LineDiff", { concurrency: true }, () => {
  const NO_LINE_FEED = "\\ No newline at end of file\n";

  it("takes Git's diff from its first hunk, without the lines that name the objects, and none when there's no hunk", () => {
    const output = Buffer.from("diff --git a/1 b/2\nindex 1..2 100644\n--- a/1\n+++ b/2\n@@ -1 +1 @@\n-a\n+b\n");

    assert.equal(LineDiff.bodyOf(output).toString(), "@@ -1 +1 @@\n-a\n+b\n");
    assert.equal(LineDiff.bodyOf(Buffer.alloc(0)).length, 0);
  });

  it("cuts a diff at its last whole line within the limit, keeps one within it whole, and gives none of a longer first line", () => {
    const body = Buffer.from("@@ -1 +1 @@\n-a\n+b\n");

    assert.equal(LineDiff.cut(body, body.length).toString(), body.toString());
    assert.equal(LineDiff.cut(body, 15).toString(), "@@ -1 +1 @@\n-a\n");
    assert.equal(LineDiff.cut(body, 14).toString(), "@@ -1 +1 @@\n");
    assert.equal(LineDiff.cut(body, 5).length, 0);
  });

  it("writes a file one side holds as every line added, or deleted, as Git writes it", () => {
    assert.equal(LineDiff.ofOneSide(Buffer.from("x\ny\n"), true).toString(), "@@ -0,0 +1,2 @@\n+x\n+y\n");
    assert.equal(LineDiff.ofOneSide(Buffer.from("x\ny\n"), false).toString(), "@@ -1,2 +0,0 @@\n-x\n-y\n");
    assert.equal(LineDiff.ofOneSide(Buffer.from("only"), true).toString(), `@@ -0,0 +1 @@\n+only\n${NO_LINE_FEED}`);
    assert.equal(LineDiff.ofOneSide(Buffer.from("\n"), false).toString(), "@@ -1 +0,0 @@\n-\n");
  });

  it("keeps each byte of a line as it is, whatever its encoding, and gives an empty file no lines", () => {
    const content = Buffer.from([0xe6, 0x97, 0xa5, 0x0a, 0xff, 0x0a]);

    assert.deepEqual(LineDiff.ofOneSide(content, true), Buffer.concat([Buffer.from("@@ -0,0 +1,2 @@\n+"), content.subarray(0, 4), Buffer.from("+"), content.subarray(4)]));
    assert.equal(LineDiff.ofOneSide(Buffer.alloc(0), true).length, 0);
  });
});
