/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { StoredObject } from "../models/stored-object.ts";
import { Resources } from "../resources.ts";

export class BatchOutputParser {
  private readonly hasContent: boolean;
  private readonly keep: number;
  private readonly objectList: StoredObject[] = [];
  private header: Buffer[] = [];
  private kept: Buffer[] = [];
  private keptLength: number = 0;
  private remaining: number = 0;
  private size: number = 0;
  private type: string = "";

  public constructor(keep: number, hasContent: boolean) {
    this.hasContent = hasContent;
    this.keep = keep;
  }

  public get objects(): readonly StoredObject[] {
    return this.objectList;
  }

  public push(chunk: Buffer): void {
    let offset = 0;
    while (offset < chunk.length)
      offset = this.remaining === 0 ? this.readHeader(chunk, offset) : this.readContent(chunk, offset);
  }

  private readContent(chunk: Buffer, offset: number): number {
    const piece = chunk.subarray(offset, offset + this.remaining);
    const content = piece.subarray(0, Math.min(this.remaining - 1, this.keep - this.keptLength));
    this.kept.push(content);
    this.keptLength += content.length;
    this.remaining -= piece.length;
    if (this.remaining === 0)
      this.objectList.push(new StoredObject(this.type, this.size, Buffer.concat(this.kept)));
    return offset + piece.length;
  }

  private readHeader(chunk: Buffer, offset: number): number {
    const end = chunk.indexOf(Resources.lineFeedByte, offset);
    if (end < 0) {
      this.header.push(chunk.subarray(offset));
      return chunk.length;
    }

    this.header.push(chunk.subarray(offset, end));
    const fields = Buffer.concat(this.header).toString(Resources.utf8Encoding).split(Resources.batchHeaderSeparator);
    this.header = [];
    if (fields.length !== Resources.batchHeaderFieldCount || fields[Resources.batchHeaderSizeIndex] === Resources.missingType)
      this.objectList.push(StoredObject.Missing);
    else if (!this.hasContent)
      this.objectList.push(new StoredObject(String(fields[Resources.batchHeaderTypeIndex]), Number(fields[Resources.batchHeaderSizeIndex]), Buffer.alloc(0)));
    else {
      this.type = String(fields[Resources.batchHeaderTypeIndex]);
      this.size = Number(fields[Resources.batchHeaderSizeIndex]);
      this.kept = [];
      this.keptLength = 0;
      this.remaining = this.size + 1;
    }
    return end + 1;
  }
}
