/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ContentTooLongException, InvalidBase64Exception, InvalidSizeException, MissingFieldException, ReadCutMismatchException, ReadOutcome, ReadOutcomeMismatchException,
  ReadResult, UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("ReadResult", { concurrency: true }, () => {
  const bytes = new Uint8Array([0x61, 0x00, 0xff]);

  it("writes and reads the whole content as base64 text, not cut", () => {
    const result = new ReadResult(ReadOutcome.Read, bytes, 3);

    assert.deepEqual(result.toJson(), { outcome: "Read", content: "YQD/", isCut: false, size: 3 });
    assert.deepEqual(ReadResult.fromJson(result.toJson()), result);
    assert.equal(result.isCut, false);
  });

  it("writes and reads content cut at the limit, with the size of the whole", () => {
    const result = new ReadResult(ReadOutcome.Read, bytes, 10);

    assert.equal(result.isCut, true);
    assert.deepEqual(ReadResult.fromJson({ outcome: "Read", content: "YQD/", isCut: true, size: 10 }), result);
  });

  it("keeps its own copy of the content", () => {
    const content = new Uint8Array([1]);
    const result = new ReadResult(ReadOutcome.Read, content, 1);
    content[0] = 2;

    assert.deepEqual(result.content, new Uint8Array([1]));
  });

  it("writes and reads an outcome that read nothing, with no content and no size", () => {
    assert.deepEqual(ReadResult.fromJson({ outcome: "Binary", content: "", isCut: false, size: 0 }), new ReadResult(ReadOutcome.Binary, new Uint8Array(), 0));
  });

  it("refuses content or a size when the outcome read nothing", () => {
    assert.throws(() => new ReadResult(ReadOutcome.PathMissing, bytes, 3),
      new ReadOutcomeMismatchException(ReadOutcome.PathMissing));
    assert.throws(() => new ReadResult(ReadOutcome.Unknown, new Uint8Array(), 1), new ReadOutcomeMismatchException(ReadOutcome.Unknown));
  });

  it("refuses a size that isn't a whole number of 0 or more, or that's shorter than the content", () => {
    assert.throws(() => new ReadResult(ReadOutcome.Read, new Uint8Array(), -1), new InvalidSizeException(-1));
    assert.throws(() => new ReadResult(ReadOutcome.Read, new Uint8Array(), 0.5), new InvalidSizeException(0.5));
    assert.throws(() => new ReadResult(ReadOutcome.Read, bytes, 2), new ContentTooLongException(3, 2));
  });

  it("refuses JSON whose isCut disagrees with its content and size, whose content isn't base64, or with another field", () => {
    assert.throws(() => ReadResult.fromJson({ outcome: "Read", content: "YQD/", isCut: true, size: 3 }),
      new ReadCutMismatchException(true));
    assert.throws(() => ReadResult.fromJson({ outcome: "Read", content: "YQ", isCut: false, size: 1 }), new InvalidBase64Exception());
    assert.throws(() => ReadResult.fromJson({ outcome: "Read", content: "", isCut: false, size: 0, text: "" }), new UnknownFieldException("ReadResult", "text"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { outcome: "Binary", content: "", isCut: false, size: 0 };

    for (const field of Object.keys(json))
      assert.throws(() => ReadResult.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("ReadResult", field));
  });
});
