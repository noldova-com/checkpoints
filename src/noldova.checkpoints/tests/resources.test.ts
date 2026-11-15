/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { CheckpointsHarness } from "./fixtures/checkpoints-harness.fixture.ts";

describe("Resources", { concurrency: true }, () => {
  it("gives the store's repository only the configuration it needs, with the module's own paths quoted", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.checkpointAsync(null);
    const quote = (value: string): string => `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
    const module = harness.context.moduleFolder;

    assert.equal(await readFile(path.join(harness.store, "git", "config"), "utf8"), [
      "[core]",
      "\trepositoryformatversion = 0",
      "\tbare = true",
      "\tlogAllRefUpdates = false",
      "\tautocrlf = false",
      "\tprecomposeUnicode = false",
      "\tprotectNTFS = true",
      "\tprotectHFS = true",
      `\thooksPath = ${quote(path.join(module, "hooks"))}`,
      `\tattributesFile = ${quote(path.join(module, "empty"))}`,
      `\texcludesFile = ${quote(path.join(module, "empty"))}`,
      "\tbigFileThreshold = 32m",
      "[gc]",
      "\tauto = 0",
      "[maintenance]",
      "\tauto = false",
      "[commit]",
      "\tgpgSign = false",
      ""
    ].join("\n"));
  });
});
