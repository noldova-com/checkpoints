/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";

export class ExampleWriter {
  private readonly root: string;

  public constructor(root: string) {
    this.root = root;
  }

  public async writeAsync(parts: readonly WorkspacePart[], consumer: string): Promise<string> {
    const folder = path.join(consumer, Resources.examplesFolder);
    for (const part of parts) {
      const declarations = path.join(this.root, part.folder, part.sources, ...Resources.declarationEntry);
      const lines = (await readFile(declarations, Resources.utf8Encoding)).split(Resources.lineFeed);
      const partFolder = path.join(folder, path.posix.basename(part.folder));
      await mkdir(partFolder, { recursive: true });
      let start = -1;
      for (const [index, text] of lines.entries()) {
        const line = text.replace(Resources.docLinePattern, "");
        if (start < 0 && line === Resources.exampleStart)
          start = index;
        else if (start >= 0 && line === Resources.exampleEnd) {
          const example = lines.slice(start + 1, index).map(t => t.replace(Resources.docLinePattern, ""));
          await writeFile(path.join(partFolder, Resources.formatExampleFile(start + 1)), Resources.formatLine(example.join(Resources.lineFeed)));
          start = -1;
        }
      }
    }
    const sources = path.join(this.root, ...Resources.consumerSources);
    for (const name of await readdir(sources))
      await copyFile(path.join(sources, name), path.join(consumer, name));
    const project = path.join(consumer, Resources.projectFile);
    await writeFile(project, Resources.formatLine(JSON.stringify({
      extends: Resources.examplesBaseProject,
      compilerOptions: {
        noUnusedLocals: false,
        types: [Resources.nodeTypes]
      },
      include: [Resources.examplesInclude]
    }, null, Resources.jsonIndent)));
    return project;
  }
}
