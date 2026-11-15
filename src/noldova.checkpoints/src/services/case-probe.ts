/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { lstat } from "node:fs/promises";
import path from "node:path";

import { ReadFailure } from "../models/read-failure.ts";
import { Resources } from "../resources.ts";
import { RepositoryName } from "./repository-name.ts";

export class CaseProbe {
  public static async ignoresCaseAsync(folder: string, names: readonly Buffer[], platform: string): Promise<boolean> {
    const prefix = Buffer.from(path.join(folder, path.sep));
    for (const name of names.filter(t => t.some(u => CaseProbe.isLetter(u)) && !RepositoryName.matches(t.toString(Resources.utf8Encoding)))) {
      const original = await CaseProbe.readIdAsync(Buffer.concat([prefix, name]));
      if (original instanceof ReadFailure)
        continue;
      return original === await CaseProbe.readIdAsync(Buffer.concat([prefix, name.map(t => CaseProbe.isLetter(t) ? t ^ Resources.asciiCaseOffset : t)]));
    }
    return Resources.caseIgnoringPlatforms.includes(platform);
  }

  private static isLetter(code: number): boolean {
    return code >= Resources.asciiUpperFirst && code <= Resources.asciiUpperLast || code >= Resources.asciiLowerFirst && code <= Resources.asciiLowerLast;
  }

  private static async readIdAsync(location: Buffer): Promise<string | ReadFailure> {
    const stats = await lstat(location, { bigint: true }).catch((t: unknown) => ReadFailure.of(t));
    return stats instanceof ReadFailure ? stats : Resources.formatFileId(stats.dev, stats.ino);
  }
}
