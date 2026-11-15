/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FieldNotTextListException } from "../exceptions/field-not-text-list.exception.ts";
import { TargetAddressInvalidException } from "../exceptions/target-address-invalid.exception.ts";
import { TargetFieldNotTextException } from "../exceptions/target-field-not-text.exception.ts";
import { TargetHashInvalidException } from "../exceptions/target-hash-invalid.exception.ts";
import { TargetSizeInvalidException } from "../exceptions/target-size-invalid.exception.ts";
import { TargetUnknownException } from "../exceptions/target-unknown.exception.ts";
import { Resources } from "../resources.ts";

export class GitTarget {
  public readonly architecture: string;
  public readonly execPath: string;
  public readonly gitVersion: string;
  public readonly kind: "zip" | "tar.gz";
  public readonly path: readonly string[];
  public readonly platform: string;
  public readonly program: string;
  public readonly sha256: string;
  public readonly size: number;
  public readonly source: string;
  public readonly target: string;
  public readonly url: string;

  public constructor(target: string, fields: Readonly<Record<string, unknown>>, file: string) {
    const match = Resources.targetPattern.exec(target);
    const platform = match?.groups?.[Resources.platformGroup];
    const architecture = match?.groups?.[Resources.architectureGroup];
    if (platform === undefined || architecture === undefined)
      throw new TargetUnknownException(file, target);
    const text = (field: string): string => {
      const value = fields[field];
      if (typeof value !== "string" || value === "")
        throw new TargetFieldNotTextException(file, target, field);
      return value;
    };

    const execPath = text(Resources.execPathField);
    const gitVersion = text(Resources.gitVersionField);
    const searchPath = GitTarget.readTexts(fields[Resources.pathField], Resources.formatFieldPath(target, Resources.pathField), file);
    const program = text(Resources.programField);
    const sha256 = text(Resources.sha256Field);
    const source = text(Resources.sourceField);
    const url = text(Resources.urlField);
    const size = fields[Resources.sizeField];
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0)
      throw new TargetSizeInvalidException(file, target);
    if (!Resources.sha256Pattern.test(sha256))
      throw new TargetHashInvalidException(file, target);
    const kind = url.endsWith(Resources.zipExtension) ? Resources.zipKind : url.endsWith(Resources.tarGzExtension) ? Resources.tarGzKind : null;
    if (!url.startsWith(Resources.httpsPrefix) || kind === null)
      throw new TargetAddressInvalidException(file, target);

    this.architecture = architecture;
    this.execPath = execPath;
    this.gitVersion = gitVersion;
    this.kind = kind;
    this.path = searchPath;
    this.platform = platform;
    this.program = program;
    this.sha256 = sha256;
    this.size = size;
    this.source = source;
    this.target = target;
    this.url = url;
  }

  public static readTexts(value: unknown, field: string, file: string): readonly string[] {
    if (!Array.isArray(value))
      throw new FieldNotTextListException(file, field);
    const texts = value.filter((t: unknown): t is string => typeof t === "string" && t !== "");
    if (texts.length !== value.length)
      throw new FieldNotTextListException(file, field);
    return texts;
  }
}
