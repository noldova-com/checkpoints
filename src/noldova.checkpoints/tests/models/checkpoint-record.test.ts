/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, Checkpoint, UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

import { IgnoreRulesMismatchException, UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { CheckpointRecord } from "../../src/models/checkpoint-record.ts";
import { IgnoreRecord } from "../../src/models/ignore-record.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { LinkRecord } from "../../src/models/link-record.ts";

describe("CheckpointRecord", { concurrency: true }, () => {
  const checkpoint = new Checkpoint("019a0b6c-7d1e-7f00-8abc-0123456789ab", new Date("2026-10-18T12:00:00.000Z"), CaptureMode.EveryFile, "Turn 3",
    [new UnreadPath("locked.db", UnreadReason.Denied, null)]);
  const json = {
    formatVersion: 2,
    checkpoint: checkpoint.toJson(),
    emptyFolders: ["logs"],
    links: [{ path: "out", linkKind: "Folder" }],
    ignoreRules: null
  };

  it("writes the checkpoint with its empty folders and its links' kinds, and reads them back", () => {
    const record = new CheckpointRecord(checkpoint, ["logs"], [new LinkRecord("out", LinkKind.Folder)], null);
    const read = CheckpointRecord.fromJson(record.toJson());

    assert.deepEqual(record.toJson(), json);
    assert.deepEqual(read.checkpoint.toJson(), checkpoint.toJson());
    assert.deepEqual(read.emptyFolders, ["logs"]);
    assert.equal(read.links[0]?.linkKind, LinkKind.Folder);
    assert.equal(read.ignoreRules, null);
  });

  it("gives the kind of the link it keeps at a path, and none for a path it keeps no link at", () => {
    const record = new CheckpointRecord(checkpoint, [], [new LinkRecord("out", LinkKind.Folder), new LinkRecord("a.lnk", LinkKind.File)], null);

    assert.equal(record.linkKindOf("a.lnk"), LinkKind.File);
    assert.equal(record.linkKindOf("out"), LinkKind.Folder);
    assert.equal(record.linkKindOf("out/a.txt"), null);
  });

  it("writes how a checkpoint that followed the ignore files matched them, and reads it back", () => {
    const ignoring = new Checkpoint(checkpoint.id, checkpoint.time, CaptureMode.IgnoreFiles, null, []);
    const record = new CheckpointRecord(ignoring, [], [], new IgnoreRecord(true, ["vendor/lib"]));
    const read = CheckpointRecord.fromJson(record.toJson());

    assert.deepEqual(record.toJson()["ignoreRules"], { ignoresCase: true, repositoryFolders: ["vendor/lib"] });
    assert.deepEqual([read.ignoreRules?.ignoresCase, read.ignoreRules?.repositoryFolders], [true, ["vendor/lib"]]);
  });

  it("refuses ignore rules on a checkpoint of every file, and none on one that followed the ignore files", () => {
    const ignoring = new Checkpoint(checkpoint.id, checkpoint.time, CaptureMode.IgnoreFiles, null, []);

    assert.throws(() => new CheckpointRecord(checkpoint, [], [], new IgnoreRecord(false, [])),
      new IgnoreRulesMismatchException(CaptureMode.EveryFile));
    assert.throws(() => CheckpointRecord.fromJson({ ...json, checkpoint: ignoring.toJson() }),
      new IgnoreRulesMismatchException(CaptureMode.IgnoreFiles));
  });

  it("refuses a record whose empty folders aren't all text", () => {
    assert.throws(() => CheckpointRecord.fromJson({ ...json, emptyFolders: ["logs", 7] }), new JsonException("Expected a string.", "CheckpointRecord.emptyFolders.1"));
  });

  it("refuses a record of a format version it doesn't read", () => {
    assert.throws(() => CheckpointRecord.fromJson({ ...json, formatVersion: 0 }), new UnsupportedStoreFormatException("0"));
  });

  it("reads a record of format version 1, whose unread paths kept no code, as paths with none", () => {
    const read = CheckpointRecord.fromJson(JSON.parse("{\"formatVersion\":1,\"checkpoint\":{\"id\":\"019a0b6c-7d1e-7f00-8abc-0123456789ab\","
      + "\"time\":\"2026-10-18T12:00:00.000Z\",\"mode\":\"EveryFile\",\"label\":\"Turn 3\",\"unreadPaths\":[{\"path\":\"locked.db\",\"reason\":\"Denied\"}]},"
      + "\"emptyFolders\":[\"logs\"],\"links\":[{\"path\":\"out\",\"linkKind\":\"Folder\"}],\"ignoreRules\":null}"));

    assert.deepEqual(read.checkpoint.toJson(), checkpoint.toJson());
    assert.equal(read.checkpoint.unreadPaths[0]?.code, null);
    assert.deepEqual(read.emptyFolders, ["logs"]);
    assert.equal(read.links[0]?.linkKind, LinkKind.Folder);
    assert.deepEqual(read.toJson(), json);
  });

  it("refuses a record of format version 1 whose checkpoint, unread paths or an unread path isn't the shape it reads, as the checkpoint's own reading refuses it", () => {
    const readAsVersion1 = (written: unknown): CheckpointRecord => CheckpointRecord.fromJson({ ...json, formatVersion: 1, checkpoint: written });

    assert.throws(() => readAsVersion1([]), new JsonException("Expected a JSON object.", "Checkpoint"));
    assert.throws(() => readAsVersion1({ ...checkpoint.toJson(), unreadPaths: "locked.db" }), new JsonException("Expected an array.", "Checkpoint.unreadPaths"));
    assert.throws(() => readAsVersion1({ ...checkpoint.toJson(), unreadPaths: ["locked.db"] }), new JsonException("Expected a JSON object.", "UnreadPath"));
  });

  it("refuses a record of format version 1 whose unread path holds a code, a field that version never wrote", () => {
    const written = { ...checkpoint.toJson(), unreadPaths: [{ path: "locked.db", reason: "Unreadable", code: "EIO" }] };

    assert.throws(() => CheckpointRecord.fromJson({ ...json, formatVersion: 1, checkpoint: written }), new JsonException("The field is not part of this record, which accepts no unknown fields.", "UnreadPath.code"));
  });

  it("refuses a record of format version 2 whose unread path has no code", () => {
    const written = { ...checkpoint.toJson(), unreadPaths: [{ path: "locked.db", reason: "Denied" }] };

    assert.throws(() => CheckpointRecord.fromJson({ ...json, checkpoint: written }), new JsonException("The field is required.", "UnreadPath.code"));
  });

  it("refuses a record of a format version newer than the one it writes, naming it", () => {
    assert.throws(() => CheckpointRecord.fromJson({ ...json, formatVersion: 3 }), new UnsupportedStoreFormatException("3"));
  });
});
