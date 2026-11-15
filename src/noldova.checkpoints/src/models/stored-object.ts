/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class StoredObject {
  public static readonly Missing: StoredObject = new StoredObject(Resources.missingType, 0, Buffer.alloc(0));
  public readonly head: Buffer;
  public readonly size: number;
  public readonly type: string;

  public constructor(type: string, size: number, head: Buffer) {
    this.head = head;
    this.size = size;
    this.type = type;
  }

  public get isBlob(): boolean {
    return this.type === Resources.blobType;
  }

  public get isWhole(): boolean {
    return this.head.length === this.size;
  }
}
