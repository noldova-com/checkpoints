/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "@noldova/context.core";

import { IgnorePattern } from "../../src/models/ignore-pattern.ts";

describe("IgnorePattern", { concurrency: true }, () => {
  const parse = (line: string): IgnorePattern => {
    const pattern = IgnorePattern.parse(line, false);
    if (Object.isNull(pattern))
      throw new Error(`The line ${JSON.stringify(line)} gave no pattern.`);
    return pattern;
  };

  it("gives no pattern for a blank line, a comment, or a pattern left empty", () => {
    assert.deepEqual(["", "#comment", "# a", "   ", "\r", "!", "/", "//", "!/", "\0a"].map(t => IgnorePattern.parse(t, false)),
      [null, null, null, null, null, null, null, null, null, null]);
  });

  it("matches a pattern with no \"/\" but at its end against the name, at any depth", () => {
    const pattern = parse("*.log");

    assert.equal(pattern.matches("a.log", "a.log", false), true);
    assert.equal(pattern.matches("src/deep/a.log", "a.log", false), true);
    assert.equal(pattern.matches("src/a.txt", "a.txt", false), false);
    assert.equal(pattern.isNegated, false);
  });

  it("anchors a pattern with a \"/\" at its start or within to the file's folder", () => {
    assert.equal(parse("/build").matches("build", "build", true), true);
    assert.equal(parse("/build").matches("src/build", "build", true), false);
    assert.equal(parse("doc/frotz").matches("doc/frotz", "frotz", false), true);
    assert.equal(parse("doc/frotz").matches("a/doc/frotz", "frotz", false), false);
  });

  it("matches a pattern with a trailing \"/\" only against folders, as a name at any depth when no other \"/\" is in it", () => {
    const pattern = parse("cache/");

    assert.equal(pattern.matches("cache", "cache", true), true);
    assert.equal(pattern.matches("a/b/cache", "cache", true), true);
    assert.equal(pattern.matches("cache", "cache", false), false);
    assert.equal(parse("a/cache/").matches("a/cache", "cache", true), true);
    assert.equal(parse("a/cache/").matches("b/a/cache", "cache", true), false);
  });

  it("reads a leading \"!\" as including again, and an escaped \"!\" or \"#\" as itself", () => {
    assert.equal(parse("!keep.log").isNegated, true);
    assert.equal(parse("!keep.log").matches("keep.log", "keep.log", false), true);
    assert.equal(parse("\\!keep").isNegated, false);
    assert.equal(parse("\\!keep").matches("!keep", "!keep", false), true);
    assert.equal(parse("\\#tag").matches("#tag", "#tag", false), true);
  });

  it("drops trailing spaces, but not those a \"\\\" escapes, and keeps them all on a line that ends in a lone \"\\\"", () => {
    assert.equal(parse("a.txt  ").matches("a.txt", "a.txt", false), true);
    assert.equal(parse("a\\ ").matches("a ", "a ", false), true);
    assert.equal(parse("a\\  ").matches("a ", "a ", false), true);
    assert.equal(parse("a  b").matches("a  b", "a  b", false), true);
    assert.equal(parse("a \\").matches("a ", "a ", false), false);
  });

  it("takes one carriage return off a line's end, and reads a line only up to a NUL", () => {
    assert.equal(parse("a.txt\r").matches("a.txt", "a.txt", false), true);
    assert.equal(parse("a.txt\r\r").matches("a.txt\r", "a.txt\r", false), true);
    assert.equal(parse("a.txt\0b").matches("a.txt", "a.txt", false), true);
  });

  it("ignores letter case when asked", () => {
    assert.equal(IgnorePattern.parse("*.LOG", true)?.matches("a.log", "a.log", false), true);
    assert.equal(IgnorePattern.parse("*.LOG", false)?.matches("a.log", "a.log", false), false);
  });
});
