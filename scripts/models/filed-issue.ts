/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class FiledIssue {
  public readonly isOpen: boolean;
  public readonly number: number;
  public readonly source: string;
  public readonly tag: string;
  public readonly url: string;

  public constructor(number: number, url: string, isOpen: boolean, source: string, tag: string) {
    this.isOpen = isOpen;
    this.number = number;
    this.source = source;
    this.tag = tag;
    this.url = url;
  }
}
