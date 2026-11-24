/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FileHandle } from "node:fs/promises";

import "@noldova/context.core";
import { PathKind } from "@noldova/checkpoints.protocol";

import { StoreObjectMissingException } from "../exceptions/store-object-missing.exception.ts";
import { StoreObjectNotABlobException } from "../exceptions/store-object-not-a-blob.exception.ts";
import { UnexpectedStoreObjectException } from "../exceptions/unexpected-store-object.exception.ts";
import type { StagedBlob } from "../models/staged-blob.ts";
import { Resources } from "../resources.ts";
import { BlobStager } from "./blob-stager.ts";

export class BlobBatchWriter {
  private readonly blobs: readonly StagedBlob[];
  private blob: StagedBlob | null = null;
  private handle: FileHandle | null = null;
  private header: Buffer[] = [];
  private index: number = 0;
  private link: Buffer[] = [];
  private remaining: number = 0;

  public constructor(blobs: readonly StagedBlob[]) {
    this.blobs = blobs;
  }

  public async closeAsync(): Promise<void> {
    await this.handle?.close();
    this.handle = null;
  }

  public end(): void {
    const missing = this.blobs[this.index];
    if (!Object.isUndefined(missing))
      throw new StoreObjectMissingException(missing.objectId);
  }

  public async pushAsync(chunk: Buffer): Promise<void> {
    let offset = 0;
    while (offset < chunk.length)
      offset = Object.isNull(this.blob) ? await this.readHeaderAsync(chunk, offset) : await this.readContentAsync(this.blob, chunk, offset);
  }

  private async readContentAsync(blob: StagedBlob, chunk: Buffer, offset: number): Promise<number> {
    const piece = chunk.subarray(offset, offset + this.remaining);
    const content = piece.subarray(0, Math.min(piece.length, this.remaining - 1));
    if (!Object.isNull(this.handle))
      await this.handle.write(content);
    else
      this.link.push(content);
    this.remaining -= piece.length;
    if (this.remaining === 0)
      await this.finishAsync(blob);
    return offset + piece.length;
  }

  private async finishAsync(blob: StagedBlob): Promise<void> {
    if (!Object.isNull(this.handle)) {
      await this.handle.sync();
      await this.handle.close();
      this.handle = null;
    }
    else
      await BlobStager.linkAsync(blob, Buffer.concat(this.link));
    this.blob = null;
    this.index++;
  }

  private async readHeaderAsync(chunk: Buffer, offset: number): Promise<number> {
    const end = chunk.indexOf(Resources.lineFeedByte, offset);
    if (end < 0) {
      this.header.push(chunk.subarray(offset));
      return chunk.length;
    }

    this.header.push(chunk.subarray(offset, end));
    const header = Buffer.concat(this.header).toString(Resources.utf8Encoding);
    const [name, type, size] = header.split(Resources.batchHeaderSeparator);
    this.header = [];
    const blob = this.blobs[this.index];
    if (Object.isUndefined(blob) || name !== blob.objectId)
      throw new UnexpectedStoreObjectException(header);
    if (type === Resources.missingType)
      throw new StoreObjectMissingException(blob.objectId);
    if (type !== Resources.blobType || Object.isUndefined(size))
      throw new StoreObjectNotABlobException(blob.objectId, header);
    this.blob = blob;
    this.remaining = Number(size) + 1;
    this.link = [];
    this.handle = blob.kind === PathKind.Link ? null : await BlobStager.createAsync(blob);
    return end + 1;
  }
}
