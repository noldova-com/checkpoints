/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StoredObject } from "../../src/models/stored-object.ts";
import { BatchOutputParser } from "../../src/services/batch-output.parser.ts";

describe("BatchOutputParser", { concurrency: true }, () => {
  const ID_A = "2e65efe2a145dda7ee51d1741299f848e5bf752e";
  const ID_B = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  const OUTPUT = Buffer.from(`${ID_A} blob 5\nalpha\nrefs/checkpoints/x:checkpoint.json missing\n${ID_B} blob 0\n\n${ID_A} tree 3\n\0\n\0\n`, "latin1");

  const parse = (output: Buffer, chunkSize: number, keep: number, hasContent: boolean = true): readonly StoredObject[] => {
    const parser = new BatchOutputParser(keep, hasContent);
    for (let offset = 0; offset < output.length; offset += chunkSize)
      parser.push(output.subarray(offset, offset + chunkSize));
    return parser.objects;
  };

  it("reads each header and content, a missing name's header alone, and an empty content's line feed", () => {
    assert.deepEqual(parse(OUTPUT, OUTPUT.length, Number.POSITIVE_INFINITY), [
      new StoredObject("blob", 5, Buffer.from("alpha")),
      StoredObject.Missing,
      new StoredObject("blob", 0, Buffer.alloc(0)),
      new StoredObject("tree", 3, Buffer.from([0, 0x0a, 0]))
    ]);
  });

  it("reads the same from chunks cut anywhere, one byte at a time", () => {
    assert.deepEqual(parse(OUTPUT, 1, Number.POSITIVE_INFINITY), parse(OUTPUT, OUTPUT.length, Number.POSITIVE_INFINITY));
    assert.deepEqual(parse(OUTPUT, 7, Number.POSITIVE_INFINITY), parse(OUTPUT, OUTPUT.length, Number.POSITIVE_INFINITY));
  });

  it("keeps only the first bytes of each content, with its whole size, wherever the chunks are cut", () => {
    const expected = [
      new StoredObject("blob", 5, Buffer.from("al")),
      StoredObject.Missing,
      new StoredObject("blob", 0, Buffer.alloc(0)),
      new StoredObject("tree", 3, Buffer.from([0, 0x0a]))
    ];

    assert.deepEqual(parse(OUTPUT, OUTPUT.length, 2), expected);
    assert.deepEqual(parse(OUTPUT, 1, 2), expected);
    assert.deepEqual(parse(OUTPUT, 1, 0).map(u => [u.size, u.head.length]), [[5, 0], [0, 0], [0, 0], [3, 0]]);
  });

  it("reads --batch-check's headers alone, with no content", () => {
    const output = Buffer.from(`${ID_A} blob 5\nnone missing\n${ID_B} blob 0\n`);

    assert.deepEqual(parse(output, 3, 10, false), [new StoredObject("blob", 5, Buffer.alloc(0)), StoredObject.Missing, new StoredObject("blob", 0, Buffer.alloc(0))]);
  });

  it("takes any header without exactly an id, a type and a size as missing, and a missing name that holds a space", () => {
    const output = Buffer.from(`abc ambiguous\n${ID_A} blob 5 extra\nrefs/checkpoints/x:files/a b.txt missing\n${ID_B} blob 0\n\n`);

    assert.deepEqual(parse(output, output.length, 10), [StoredObject.Missing, StoredObject.Missing, StoredObject.Missing, new StoredObject("blob", 0, Buffer.alloc(0))]);
  });

  it("gives no object for a content the output ended in the middle of", () => {
    const output = Buffer.from(`${ID_B} blob 0\n\n${ID_A} blob 5\nalp`);

    assert.deepEqual(parse(output, 2, 10), [new StoredObject("blob", 0, Buffer.alloc(0))]);
  });
});
