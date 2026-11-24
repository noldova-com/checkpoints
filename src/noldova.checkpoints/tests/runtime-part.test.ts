/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import "@noldova/context.core";

import { RuntimePart } from "../src/api/index.ts";
import { CheckpointsContext } from "./fixtures/checkpoints-context.fixture.ts";
import { JsonFixture, type JsonFields } from "./fixtures/json.fixture.ts";

const CONTEXT_PEERS: readonly string[] = ["@noldova/context.core", "@noldova/context.exceptions", "@noldova/context.json"];

async function readObjectAsync(file: string): Promise<JsonFields> {
  return JsonFixture.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
}

function textsOf(value: unknown): Readonly<Record<string, string>> {
  const texts: Record<string, string> = {};
  for (const [name, text] of Object.entries(JsonFixture.objectOf(value)))
    texts[name] = JsonFixture.textOf(text);
  return texts;
}

function rangeFrom(lowest: string): string {
  const [major, minor] = lowest.split(".");
  return `>=${lowest} <${major === "0" ? `0.${String(Number(minor) + 1)}.0` : `${String(Number(major) + 1)}.0.0`}`;
}

function lowestOf(range: string): string {
  const lowest = /^>=(\d+\.\d+\.\d+) /.exec(range)?.[1];
  if (Object.isUndefined(lowest))
    throw new TypeError(`${range} is not a range of versions from its lowest.`);
  return lowest;
}

function numbersOf(version: string): readonly number[] {
  return version.split(".").map(t => Number(t));
}

function compare(left: string, right: string): number {
  const [a, b] = [numbersOf(left), numbersOf(right)];
  return a.map((t, i) => t - (b[i] ?? 0)).find(t => t !== 0) ?? 0;
}

function isInside(version: string, range: string): boolean {
  const upper = range.split(" <")[1] ?? "";
  return compare(version, lowestOf(range)) >= 0 && compare(version, upper) < 0;
}

describe("RuntimePart", { concurrency: true }, () => {
  it("accepts the Noldova Desktop versions from its lowest to the next that may break modules, builds against Noldova Desktop inside that range, and takes Noldova Desktop's packages as peers in that range", async () => {
    const range = JsonFixture.textOf((await readObjectAsync("module.json"))["noldovaDesktop"]);
    const peers = textsOf((await readObjectAsync("package.json"))["peerDependencies"]);
    const devDependencies = textsOf((await readObjectAsync("../../package.json"))["devDependencies"]);
    const pins = Object.entries(devDependencies).filter(t => t[0].startsWith("@noldova/desktop."));
    const contextPeers = Object.fromEntries(CONTEXT_PEERS.map(t => [t, rangeFrom(lowestOf(peers[t] ?? `no range for ${t}`))]));

    assert.equal(range, rangeFrom(lowestOf(range)));
    assert.deepEqual(pins.map(t => t[0]), ["@noldova/desktop.protocol", "@noldova/desktop.runtime"]);
    assert.deepEqual(pins.filter(t => !isInside(t[1], range)), []);
    assert.deepEqual(peers, {
      "@noldova/desktop.protocol": range, "@noldova/desktop.runtime": range, ...contextPeers
    });
    assert.deepEqual(Object.entries(contextPeers).filter(t => !isInside(devDependencies[t[0]] ?? "", t[1])), []);
  });

  it("declares in settings.json each setting the module contributes, following the ignore files off by default and shared by every device", async () => {
    const declared = JsonFixture.objectOf(JsonFixture.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"))["contributes"]);
    const settings = JsonFixture.objectsOf(JsonFixture.parse(await readFile(new URL("../settings.json", import.meta.url), "utf8"))["settings"]);

    assert.deepEqual(settings.map(t => t["name"]), declared["settings"]);
    assert.deepEqual(settings.map(t => [t["name"], JsonFixture.objectOf(t["type"])["kind"], t["default"], t["locality"]]), [["checkpoints.followIgnoreFiles", "Boolean", false, "Shared"]]);
  });

  it("removes as it activates what a delete left in deleted/, and ends its deactivation once that has ended", async t => {
    const root = await mkdtemp(path.join(tmpdir(), "checkpoints-swept-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const left = path.join(root, "module", "deleted", "project-1-left");
    await mkdir(path.join(left, "git", "objects"), { recursive: true });
    const part = new RuntimePart();

    await part.activateAsync(new CheckpointsContext(t, path.join(root, "module")));
    await part.deactivateAsync();

    assert.equal(existsSync(left), false);
  });

  it("deactivates with nothing left open", async () => {
    await assert.doesNotReject(new RuntimePart().deactivateAsync());
  });
});
