/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IgnoreFile } from "../../src/models/ignore-file.ts";
import { IgnoreRules } from "../../src/models/ignore-rules.ts";

describe("IgnoreRules", { concurrency: true }, () => {
  const rulesOf = (files: Readonly<Record<string, string>>, repositoryFolders: readonly string[] = []): IgnoreRules => {
    const rules = new IgnoreRules(false);
    for (const folder of repositoryFolders)
      rules.addRepositoryFolder(folder);
    for (const [folder, text] of Object.entries(files))
      rules.addFile(new IgnoreFile(folder, Buffer.from(text), false));
    return rules;
  };

  it("ignores nothing without a file that matches", () => {
    assert.equal(new IgnoreRules(false).isIgnored("a.txt", false), false);
    assert.equal(rulesOf({ "": "*.log\n" }).isIgnored("src/a.txt", false), false);
  });

  it("applies a folder's file to the paths below it, at any depth", () => {
    const rules = rulesOf({ "": "*.log\n", "src": "/gen/\n" });

    assert.equal(rules.isIgnored("a.log", false), true);
    assert.equal(rules.isIgnored("src/deep/a.log", false), true);
    assert.equal(rules.isIgnored("src/gen", true), true);
    assert.equal(rules.isIgnored("gen", true), false);
  });

  it("lets the deepest file that matches a path decide it", () => {
    const rules = rulesOf({ "": "*.log\n", "src": "!keep.log\n", "src/deep": "keep.log\n" });

    assert.equal(rules.isIgnored("src/keep.log", false), false);
    assert.equal(rules.isIgnored("src/other.log", false), true);
    assert.equal(rules.isIgnored("src/deep/keep.log", false), true);
    assert.equal(rules.isIgnored("keep.log", false), true);
  });

  it("stops at a nested repository's folder, whose own files alone apply inside it, while the folders above decide the folder itself", () => {
    const rules = rulesOf({ "": "*.log\nvendor/other/\n", "vendor/lib": "*.tmp\n" }, ["vendor/lib", "vendor/other"]);

    assert.equal(rules.isIgnored("vendor/lib/a.log", false), false);
    assert.equal(rules.isIgnored("vendor/lib/a.tmp", false), true);
    assert.equal(rules.isIgnored("vendor/lib/deep/a.log", false), false);
    assert.equal(rules.isIgnored("vendor/lib", true), false);
    assert.equal(rules.isIgnored("vendor/other", true), true);
    assert.equal(rules.isIgnored("vendor/a.log", false), true);
  });

  it("lists its files in the order added, one per folder, and its repositories' folders", () => {
    const rules = rulesOf({ "": "a\n", "src": "b\n" }, ["vendor/lib"]);
    rules.addFile(new IgnoreFile("src", Buffer.from("c\n"), false));

    assert.deepEqual(rules.files.map(t => [t.folderPath, t.content.toString()]), [["", "a\n"], ["src", "c\n"]]);
    assert.deepEqual(rules.repositoryFolders, ["vendor/lib"]);
    assert.equal(rules.ignoresCase, false);
    assert.equal(new IgnoreRules(true).ignoresCase, true);
  });

  it("leaves out a path by its path alone when it, or a folder above it, is ignored, so nothing under an ignored folder comes back", () => {
    const rules = rulesOf({ "": "build/\n!build/keep.txt\n*.log\n" });

    assert.equal(rules.excludes("build/keep.txt", false), true);
    assert.equal(rules.excludes("build/deep/a.txt", false), true);
    assert.equal(rules.excludes("src/a.log", false), true);
    assert.equal(rules.excludes("src/a.txt", false), false);
    assert.equal(rules.excludes("build", false), false);
    assert.equal(rules.excludes("build", true), true);
  });

  it("matches the bytes of names that aren't ASCII", () => {
    const rules = rulesOf({ "données": "caf?\nnaïve/\n" });

    assert.equal(rules.isIgnored("données/cafe", false), true);
    assert.equal(rules.isIgnored("données/café", false), false);
    assert.equal(rules.isIgnored("données/naïve", true), true);
  });
});
