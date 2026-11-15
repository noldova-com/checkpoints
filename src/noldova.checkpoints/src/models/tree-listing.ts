/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { TreeLineMalformedException } from "../exceptions/tree-line-malformed.exception.ts";
import { Resources } from "../resources.ts";
import { EntryKind } from "./entry-kind.ts";
import { TreeFile } from "./tree-file.ts";

export class TreeListing {
  public readonly files: ReadonlyMap<string, TreeFile>;
  public readonly rules: ReadonlyMap<string, string>;

  public constructor(files: ReadonlyMap<string, TreeFile>, rules: ReadonlyMap<string, string>) {
    this.files = files;
    this.rules = rules;
  }

  public static parse(output: string): TreeListing {
    const fields = output.split(Resources.nulCharacter);
    const files = new Map<string, TreeFile>();
    const rules = new Map<string, string>();
    for (let line = fields.shift(), treePath = fields.shift(); line !== undefined && treePath !== undefined; line = fields.shift(), treePath = fields.shift()) {
      const [, mode, , objectId] = line.split(Resources.treeFieldSeparator);
      if (mode === undefined || objectId === undefined)
        throw new TreeLineMalformedException(line);
      if (treePath.startsWith(Resources.filesPrefix))
        files.set(treePath.slice(Resources.filesPrefix.length), new TreeFile(EntryKind.ofGitMode(mode), objectId));
      else if (treePath.startsWith(Resources.rulesPrefix))
        rules.set(TreeListing.ruleFolderOf(treePath), objectId);
    }
    return new TreeListing(files, rules);
  }

  private static ruleFolderOf(treePath: string): string {
    const inner = treePath.slice(Resources.rulesPrefix.length);
    return inner.slice(0, Math.max(inner.length - Resources.ignoreFileName.length - 1, 0));
  }
}
