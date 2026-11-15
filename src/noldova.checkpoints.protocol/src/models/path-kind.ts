/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownPathKindException } from "../exceptions/unknown-path-kind.exception.ts";

export class PathKind {
  public static readonly File: PathKind = new PathKind("File");
  public static readonly Executable: PathKind = new PathKind("Executable");
  public static readonly Link: PathKind = new PathKind("Link");
  public static readonly Folder: PathKind = new PathKind("Folder");
  private static readonly ALL: readonly PathKind[] = [PathKind.File, PathKind.Executable, PathKind.Link, PathKind.Folder];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): PathKind {
    const kind = PathKind.ALL.find(t => t.value === value);
    if (kind === undefined)
      throw new UnknownPathKindException(String(value));
    return kind;
  }

  public toJson(): string {
    return this.value;
  }
}
