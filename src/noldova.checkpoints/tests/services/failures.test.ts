/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Failures } from "../../src/services/failures.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

describe("Failures", { concurrency: true }, () => {
  const failing = (code: unknown): FailureFixture => new FailureFixture("failed", code);

  it("gives an error's code only where it is text", () => {
    assert.deepEqual([failing("ENOENT"), failing(5), new Error("plain"), "ENOENT", null].map(t => Failures.codeOf(t)), ["ENOENT", null, null, null, null]);
  });

  it("gives a code only for a system error, which carries its number", () => {
    const system = new FailureFixture("failed", "ETIMEDOUT", -110);

    assert.deepEqual([system, failing("ETIMEDOUT"), new FailureFixture("failed", "EIO", "5"), "EIO"].map(t => Failures.systemCodeOf(t)),
      ["ETIMEDOUT", null, null, null]);
  });

  it("tells an error by its code, and a path that isn't there by ENOENT or ENOTDIR", () => {
    assert.deepEqual([Failures.hasCode(failing("EPERM"), ["EACCES", "EPERM"]), Failures.hasCode(failing("EIO"), ["EPERM"]), Failures.hasCode("EPERM", ["EPERM"])],
      [true, false, false]);
    assert.deepEqual([failing("ENOENT"), failing("ENOTDIR"), failing("EACCES")].map(t => Failures.isAbsent(t)), [true, true, false]);
  });

  it("gives an error's message, and anything else as text", () => {
    assert.deepEqual([Failures.messageOf(new Error("broken")), Failures.messageOf("broken"), Failures.messageOf(5)], ["broken", "broken", "5"]);
  });

  it("gives back a failure it handles, and throws one it doesn't", () => {
    const handled = new TypeError("handled");
    const other = new RangeError("other");
    const isTypeError = (t: unknown): t is TypeError => t instanceof TypeError;

    assert.equal(Failures.handled(handled, isTypeError), handled);
    assert.throws(() => Failures.handled(other, isTypeError), (error: unknown) => error === other);
  });

  it("gives what a run gives, the fallback for a failure it handles, and throws one it doesn't", () => {
    const other = new RangeError("other");
    const isTypeError = (t: unknown): boolean => t instanceof TypeError;

    assert.equal(Failures.recover(() => "ran", isTypeError, null), "ran");
    assert.equal(Failures.recover(() => {
      throw new TypeError("handled");
    }, isTypeError, null), null);
    assert.throws(() => Failures.recover(() => {
      throw other;
    }, isTypeError, null), (error: unknown) => error === other);
  });

  it("gives what a promise gives, the fallback for a rejection it handles, and rejects with one it doesn't", async () => {
    const other = failing("EIO");

    assert.equal(await Failures.recoverAsync(Promise.resolve("ran"), t => Failures.isAbsent(t), false), "ran");
    assert.equal(await Failures.recoverAsync(Promise.reject(failing("ENOENT")), t => Failures.isAbsent(t), false), false);
    await assert.rejects(Failures.recoverAsync(Promise.reject(other), t => Failures.isAbsent(t), false), (error: unknown) => error === other);
  });
});
