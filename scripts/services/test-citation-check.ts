/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ArchitectureDocumentMissingException } from "../exceptions/architecture-document-missing.exception.ts";
import type { TestRecord } from "../models/test-record.ts";
import { TestsLine } from "../models/tests-line.ts";
import { Resources } from "../resources.ts";

export class TestCitationCheck {
  private readonly document: string;

  public constructor(root: string) {
    this.document = path.join(root, ...Resources.architectureFile.split(Resources.pathSeparator));
  }

  public async findingsAsync(records: readonly TestRecord[]): Promise<readonly string[]> {
    const lines = await this.readTestsLinesAsync();
    if (lines.length === 0)
      return [Resources.formatTestsLinesMissing(Resources.architectureFile)];
    const names = new Set(records.map(t => t.name.split(Resources.testNameSeparator).at(-1) ?? t.name));
    return [
      ...lines.filter(t => !t.isWellFormed).map(t => Resources.formatTestsLineMalformed(Resources.architectureFile, t.line)),
      ...lines.flatMap(t => t.names.filter(u => !names.has(u)).map(u => Resources.formatCitedTestMissing(Resources.architectureFile, t.line, u)))
    ];
  }

  private async readTestsLinesAsync(): Promise<readonly TestsLine[]> {
    if (!existsSync(this.document))
      throw new ArchitectureDocumentMissingException(this.document);
    const lines: TestsLine[] = [];
    for (const [index, text] of (await readFile(this.document, Resources.utf8Encoding)).split(Resources.lineBreakPattern).entries())
      if (text.trimStart().startsWith(Resources.testsLinePrefix))
        lines.push(TestsLine.parse(index + 1, text));
    return lines;
  }
}
