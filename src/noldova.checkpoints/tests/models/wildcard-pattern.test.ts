/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WildcardPattern } from "../../src/models/wildcard-pattern.ts";

describe("WildcardPattern", { concurrency: true }, () => {
  const bytes = (text: string): string => Buffer.from(text, "utf8").toString("latin1");

  const matching = (pattern: string, texts: readonly string[], ignoresCase: boolean = false): readonly string[] => {
    const wildcard = new WildcardPattern(bytes(pattern), ignoresCase);
    return texts.filter(t => wildcard.matches(bytes(t)));
  };

  it("matches a name exactly, letter case included", () => {
    assert.deepEqual(matching("foo", ["foo", "foobar", "xfoo", "Foo", "a/foo"]), ["foo"]);
  });

  it("matches \"*\" and \"?\" within one name, never across \"/\"", () => {
    assert.deepEqual(matching("f*o", ["fo", "fxo", "fxyzo", "f/o"]), ["fo", "fxo", "fxyzo"]);
    assert.deepEqual(matching("*", ["foo", "foo/bar"]), ["foo"]);
    assert.deepEqual(matching("doc/*.txt", ["doc/a.txt", "doc/sub/a.txt"]), ["doc/a.txt"]);
    assert.deepEqual(matching("?", ["a", "/", "ab"]), ["a"]);
  });

  it("matches a byte at a time, as Git does, so \"?\" never matches a character of two bytes", () => {
    assert.deepEqual(matching("caf?", ["café", "cafe"]), ["cafe"]);
    assert.deepEqual(matching("caf??", ["café"]), ["café"]);
    assert.deepEqual(matching("café*", ["café.txt", "cafe.txt"]), ["café.txt"]);
    assert.deepEqual(matching("[é]", ["é"]), []);
  });

  it("matches \"**\" between slashes or at an end across folders, and \"**/\" also as no folder", () => {
    assert.deepEqual(matching("**", ["a", "a/b/c"]), ["a", "a/b/c"]);
    assert.deepEqual(matching("**/foo", ["foo", "a/foo", "a/b/foo", "afoo"]), ["foo", "a/foo", "a/b/foo"]);
    assert.deepEqual(matching("a/**/b", ["a/b", "a/x/b", "a/x/y/b", "ab", "a/xb"]), ["a/b", "a/x/b", "a/x/y/b"]);
    assert.deepEqual(matching("a/**", ["a", "a/x", "a/x/y"]), ["a/x", "a/x/y"]);
    assert.deepEqual(matching("***/b", ["b", "x/y/b"]), ["b", "x/y/b"]);
    assert.deepEqual(matching("**\\/b", ["b", "/b", "x/y/b"]), ["/b", "x/y/b"]);
  });

  it("matches any other \"**\" as one \"*\", within one name", () => {
    assert.deepEqual(matching("a**b", ["ab", "axb", "a/b"]), ["ab", "axb"]);
    assert.deepEqual(matching("**a", ["xa", "x/a"]), ["xa"]);
    assert.deepEqual(matching("**\\a", ["xa", "x/a"]), ["xa"]);
    assert.deepEqual(matching("a/**b", ["a/xb", "a/x/b"]), ["a/xb"]);
  });

  it("matches one byte of a set, \"!\" or \"^\" negating it, never \"/\"", () => {
    assert.deepEqual(matching("[abc]", ["a", "c", "d"]), ["a", "c"]);
    assert.deepEqual(matching("[!abc]", ["a", "d"]), ["d"]);
    assert.deepEqual(matching("[^abc]", ["a", "d"]), ["d"]);
    assert.deepEqual(matching("[a-c]x", ["bx", "dx"]), ["bx"]);
    assert.deepEqual(matching("a[/]b", ["a/b"]), []);
    assert.deepEqual(matching("a[!x]b", ["a/b", "ayb"]), ["ayb"]);
  });

  it("reads a set's first \"]\" as a member, a \"-\" at either end as itself, and \"\\\" as an escape", () => {
    assert.deepEqual(matching("[]]", ["]", "a"]), ["]"]);
    assert.deepEqual(matching("[!]]", ["]", "a"]), ["a"]);
    assert.deepEqual(matching("[a-]", ["a", "-", "b"]), ["a", "-"]);
    assert.deepEqual(matching("[-a]", ["-", "a"]), ["-", "a"]);
    assert.deepEqual(matching("[\\]]", ["]", "\\"]), ["]"]);
    assert.deepEqual(matching("[a-c-e]", ["b", "-", "e", "d"]), ["b", "-", "e"]);
    assert.deepEqual(matching("[\\a-\\c]", ["b", "d"]), ["b"]);
    assert.deepEqual(matching("[[]", ["[", "a"]), ["["]);
  });

  it("reads the named classes as Git's ASCII classes, and \"[:\" without its \":]\" as bytes of the set", () => {
    assert.deepEqual(matching("[[:digit:]]", ["5", "a"]), ["5"]);
    assert.deepEqual(matching("[[:alpha:][:digit:]_]", ["a", "Z", "7", "_", "-"]), ["a", "Z", "7", "_"]);
    assert.deepEqual(matching("[[:alnum:]]", ["a", "7", "-"]), ["a", "7"]);
    assert.deepEqual(matching("[[:space:]]", [" ", "\t", "\n", "\r", "\v", "\f"]), [" ", "\t", "\n", "\r"]);
    assert.deepEqual(matching("[[:blank:]]", [" ", "\t", "\n"]), [" ", "\t"]);
    assert.deepEqual(matching("[[:punct:]]", ["!", "~", "a", " "]), ["!", "~"]);
    assert.deepEqual(matching("[[:xdigit:]]", ["F", "f", "9", "g"]), ["F", "f", "9"]);
    assert.deepEqual(matching("[[:lower:]]", ["a", "A"]), ["a"]);
    assert.deepEqual(matching("[[:upper:]]", ["a", "A"]), ["A"]);
    assert.deepEqual(matching("[[:graph:]]", ["a", " "]), ["a"]);
    assert.deepEqual(matching("[[:print:]]", ["a", " ", "\u007f"]), ["a", " "]);
    assert.deepEqual(matching("[[:cntrl:]]", ["\u0001", "\u007f", "a"]), ["\u0001", "\u007f"]);
    assert.deepEqual(matching("[[:a]", ["[", ":", "a", "b"]), ["[", ":", "a"]);
    assert.deepEqual(matching("[[:]]", ["[]", ":]", "["]), ["[]", ":]"]);
  });

  it("takes the byte after \"\\\" as it is", () => {
    assert.deepEqual(matching("a\\*", ["a*", "ab"]), ["a*"]);
    assert.deepEqual(matching("\\[a]", ["[a]", "a"]), ["[a]"]);
    assert.deepEqual(matching("\\#a", ["#a"]), ["#a"]);
  });

  it("matches nothing for a pattern Git finds malformed", () => {
    assert.deepEqual(matching("a\\", ["a", "a\\"]), []);
    assert.deepEqual(matching("[a", ["a", "[a"]), []);
    assert.deepEqual(matching("[[:bogus:]]", ["b", "["]), []);
  });

  it("ignores the case of ASCII letters when asked, where Git does: plain bytes, ranges and the upper class", () => {
    assert.deepEqual(matching("FOO", ["foo", "FOO", "fOo"], true), ["foo", "FOO", "fOo"]);
    assert.deepEqual(matching("[a-z]", ["Q", "q"], true), ["Q", "q"]);
    assert.deepEqual(matching("[A-Z]", ["Q", "q"], true), ["Q", "q"]);
    assert.deepEqual(matching("[[:upper:]]", ["a", "A"], true), ["a", "A"]);
    assert.deepEqual(matching("É", ["é", "É"], true), ["É"]);
  });

  it("keeps Git's letter case where it doesn't fold: an escaped capital, or a capital alone in a set, matches no letter", () => {
    assert.deepEqual(matching("\\A", ["a", "A"], true), []);
    assert.deepEqual(matching("[A]", ["a", "A"], true), []);
    assert.deepEqual(matching("[a]", ["a", "A"], true), ["a", "A"]);
  });
});
