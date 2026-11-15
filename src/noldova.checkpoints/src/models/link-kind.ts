/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownLinkKindException } from "../exceptions/unknown-link-kind.exception.ts";

export class LinkKind {
  public static readonly File: LinkKind = new LinkKind("File");
  public static readonly Folder: LinkKind = new LinkKind("Folder");
  private static readonly ALL: readonly LinkKind[] = [LinkKind.File, LinkKind.Folder];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): LinkKind {
    const kind = LinkKind.ALL.find(t => t.value === value);
    if (kind === undefined)
      throw new UnknownLinkKindException(String(value));
    return kind;
  }

  public toJson(): string {
    return this.value;
  }
}
