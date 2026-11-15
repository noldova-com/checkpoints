/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IgnoreFile } from "../../src/models/ignore-file.ts";

describe("IgnoreFile", { concurrency: true }, () => {
  const fileOf = (folderPath: string, text: string, ignoresCase: boolean = false): IgnoreFile =>
    new IgnoreFile(folderPath, Buffer.from(text, "utf8"), ignoresCase);

  it("keeps its folder and the bytes it held", () => {
    const content = Buffer.from("*.log\n");
    const file = new IgnoreFile("src", content, false);

    assert.equal(file.folderPath, "src");
    assert.equal(file.content, content);
  });

  it("lets the last pattern that matches a path decide it, and says nothing of a path none matches", () => {
    const file = fileOf("", "*.log\n!keep.log\nkeep.log.bak\n");

    assert.equal(file.decide("a.log", "a.log", false), true);
    assert.equal(file.decide("keep.log", "keep.log", false), false);
    assert.equal(file.decide("a.txt", "a.txt", false), null);
  });

  it("matches an anchored pattern from its own folder", () => {
    const file = fileOf("src", "/gen\nlib/*.js\n");

    assert.equal(file.decide("src/gen", "gen", true), true);
    assert.equal(file.decide("src/deep/gen", "gen", true), null);
    assert.equal(file.decide("src/lib/a.js", "a.js", false), true);
  });

  it("reads lines ending in a carriage return, a last line with no line feed, and passes over a leading byte order mark", () => {
    const file = new IgnoreFile("", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("a.txt\r\n# note\r\n\r\nb.txt")]), false);

    assert.equal(file.decide("a.txt", "a.txt", false), true);
    assert.equal(file.decide("b.txt", "b.txt", false), true);
    assert.equal(file.decide("# note", "# note", false), null);
  });

  it("matches the bytes of a name that isn't ASCII", () => {
    const file = fileOf("données", "*.é\n");

    assert.equal(file.decide(IgnoreFile.bytesOf("données/a.é"), IgnoreFile.bytesOf("a.é"), false), true);
  });

  it("ignores letter case when asked", () => {
    assert.equal(fileOf("", "*.LOG\n", true).decide("a.log", "a.log", false), true);
  });

  it("gives a text's bytes, one character per byte", () => {
    assert.equal(IgnoreFile.bytesOf("é"), "\u00c3\u00a9");
    assert.equal(IgnoreFile.bytesOf("a/b"), "a/b");
  });
});
