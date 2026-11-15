/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { ReadFailure } from "../../src/models/read-failure.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

describe("ReadFailure", { concurrency: true }, () => {
  const failing = (code: string | undefined): FailureFixture => new FailureFixture("failed", code);
  const systemFailing = (code: string): FailureFixture => new FailureFixture("failed", code, -1);

  it("takes a path that went away as gone, so the capture leaves it out", () => {
    assert.equal(ReadFailure.of(failing("ENOENT")), ReadFailure.Gone);
    assert.equal(ReadFailure.of(failing("ENOTDIR")), ReadFailure.Gone);
    assert.equal(ReadFailure.Gone.reason, null);
  });

  it("takes a path the system won't let the module read, or holds for another program, as denied", () => {
    for (const code of ["EACCES", "EPERM", "EBUSY"])
      assert.equal(ReadFailure.of(failing(code)), ReadFailure.Denied);
    assert.equal(ReadFailure.Denied.reason, UnreadReason.Denied);
  });

  it("gives a link found where a file was opened without following links as Changing", () => {
    assert.equal(ReadFailure.of(failing("ELOOP")), ReadFailure.Changing);
    assert.equal(ReadFailure.Changing.reason, UnreadReason.Changing);
  });

  it("takes any other system error as one path the module couldn't read, and records its code", () => {
    for (const code of ["ENAMETOOLONG", "EINVAL", "ETIMEDOUT", "ESTALE", "EUNKNOWN"]) {
      const failure = ReadFailure.of(systemFailing(code));

      assert.equal(failure.reason, UnreadReason.Unreadable);
      assert.equal(failure.code, code);
      assert.deepEqual(failure.unreadOf("docs/report.pdf"), new UnreadPath("docs/report.pdf", UnreadReason.Unreadable, code));
    }
  });

  it("lists a denied or changing path with no code, and leaves out one that went away", () => {
    assert.deepEqual(ReadFailure.Denied.unreadOf("a"), new UnreadPath("a", UnreadReason.Denied, null));
    assert.deepEqual(ReadFailure.Changing.unreadOf("a"), new UnreadPath("a", UnreadReason.Changing, null));
    assert.equal(ReadFailure.Gone.unreadOf("a"), null);
  });

  it("lets a disk error, running out of handles, an error that isn't the system's, and anything else through as it is, so the capture fails with it", () => {
    for (const error of [systemFailing("EIO"), systemFailing("EMFILE"), systemFailing("ENFILE"), failing("ENAMETOOLONG"), failing(undefined), "not an error"])
      assert.throws(() => ReadFailure.of(error), (thrown: unknown) => thrown === error);
  });
});
