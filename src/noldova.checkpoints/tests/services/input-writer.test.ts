/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { buffer } from "node:stream/consumers";
import { describe, it } from "node:test";

import { InputWriter } from "../../src/services/input-writer.ts";

class PipeError extends Error {
  public readonly code: string = "EPIPE";
}

describe("InputWriter", { concurrency: true }, () => {
  it("writes what it's given and ends the input", async () => {
    const stream = new PassThrough();
    const writer = new InputWriter(stream);

    await writer.writeAsync("ab");
    await writer.writeAsync(Buffer.from("cd"));
    writer.end();

    assert.equal((await buffer(stream)).toString(), "abcd");
  });

  it("drops what it's given when made to discard, however much", async () => {
    const writer = InputWriter.discarding();

    await writer.writeAsync(Buffer.alloc(1024 * 1024));
    await assert.doesNotReject(writer.writeAsync("more"));
    writer.end();
  });

  it("waits while the program reads more slowly than the module writes", async () => {
    const stream = new PassThrough({ highWaterMark: 4 });
    const writer = new InputWriter(stream);
    let written = false;

    const writing = writer.writeAsync("more than four bytes").then(() => {
      written = true;
    });
    await Promise.resolve();
    assert.equal(written, false);
    stream.resume();
    await writing;

    assert.equal(written, true);
  });

  it("stops waiting when the program ends early and closes its input, and drops what is written after", async () => {
    const stream = new PassThrough({ highWaterMark: 4 });
    const writer = new InputWriter(stream);

    const writing = writer.writeAsync("more than four bytes");
    stream.destroy(new PipeError("write EPIPE"));
    await writing;
    await writer.writeAsync("after");
    writer.end();

    assert.equal(stream.destroyed, true);
  });

  it("fails the write it waits on, and each after, with an input error other than the program ending early", async () => {
    const stream = new PassThrough({ highWaterMark: 4 });
    const writer = new InputWriter(stream);

    const writing = writer.writeAsync("more than four bytes");
    stream.destroy(new Error("the disk failed"));

    await assert.rejects(writing, /the disk failed/);
    await assert.rejects(writer.writeAsync("after"), /the disk failed/);
  });

  it("runs its check each time the interval more has been written, with the bytes so far, and none once it stops metering", async () => {
    const writer = InputWriter.discarding();
    const checked: number[] = [];
    writer.meterEvery(4, async written => {
      checked.push(written);
      return true;
    });

    for (const chunk of ["ab", "cd", "e", "fghij", "k"])
      await writer.writeAsync(chunk);
    writer.stopMetering();
    await writer.writeAsync("lmnopqrs");

    assert.deepEqual(checked, [4, 10]);
  });

  it("counts a meter set again from the bytes written since, as each capture through a long-lived fast-import sets its own", async () => {
    const writer = InputWriter.discarding();
    const checked: number[] = [];
    await writer.writeAsync("abcdef");
    writer.meterEvery(4, async written => {
      checked.push(written);
      return true;
    });

    for (const chunk of ["ab", "cd", "efg"])
      await writer.writeAsync(chunk);
    writer.meterEvery(4, async written => {
      checked.push(-written);
      return true;
    });
    for (const chunk of ["abc", "defgh"])
      await writer.writeAsync(chunk);

    assert.deepEqual(checked, [4, -8]);
  });

  it("stops the writing when its check gives false, drops what is written after, and runs no more checks", async () => {
    const stream = new PassThrough();
    const writer = new InputWriter(stream);
    const checked: number[] = [];
    writer.meterEvery(4, async written => {
      checked.push(written);
      return false;
    });

    await writer.writeAsync("abcd");
    const stopped = writer.isStopped;
    await writer.writeAsync("efghijkl");
    writer.end();

    assert.deepEqual([stopped, checked, (await buffer(stream)).toString()], [true, [4], "abcd"]);
  });
});
