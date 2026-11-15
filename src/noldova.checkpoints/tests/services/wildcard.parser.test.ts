/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WildcardParser } from "../../src/services/wildcard.parser.ts";

describe("WildcardParser", { concurrency: true }, () => {
  const parse = (pattern: string, ignoresCase: boolean = false): string | null => new WildcardParser(pattern, ignoresCase).parse();

  it("reads each byte as the set of bytes it matches, anchored at both ends", () => {
    assert.equal(parse("ab"), "^[\\x61][\\x62]$");
    assert.equal(parse("a", true), "^[\\x41\\x61]$");
    assert.equal(parse(""), "^$");
  });

  it("reads stars within a name, across folders, or as any folders at all", () => {
    assert.equal(parse("*"), "^[^/]*$");
    assert.equal(parse("**"), "^[\\s\\S]*$");
    assert.equal(parse("**/"), "^(?:[\\s\\S]*/)?$");
    assert.equal(parse("a**"), "^[\\x61][^/]*$");
  });

  it("reads \"?\" as any byte but \"/\"", () => {
    assert.equal(parse("?"), "^[\\x01-\\x2e\\x30-\\xff]$");
  });

  it("gives null for a pattern Git finds malformed", () => {
    assert.deepEqual(["a\\", "[a", "[", "[!", "[a-", "[a-\\", "[\\", "[[:alpha:", "[[:nothing:]]"].map(t => parse(t)),
      [null, null, null, null, null, null, null, null, null]);
  });
});
