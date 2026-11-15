/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import zlib from "node:zlib";

import { ArchiveEntryMalformedException } from "../exceptions/archive-entry-malformed.exception.ts";
import { ArchiveUnreadableException } from "../exceptions/archive-unreadable.exception.ts";
import { Resources } from "../resources.ts";
import { ErrorCode } from "./error-code.ts";

export class ArchiveReader {
  private static readonly FILE_TYPES: readonly string[] = [Resources.tarFileType, Resources.tarOldFileType];
  private static readonly GZIP_CODES: readonly (string | undefined)[] = [Resources.gzipInvalidCode, Resources.gzipTruncatedCode];

  public async readAsync(archive: string): Promise<ReadonlyMap<string, Buffer>> {
    const archived = await readFile(archive);
    let tar: Buffer;
    try {
      tar = zlib.gunzipSync(archived);
    }
    catch (error) {
      if (!ArchiveReader.GZIP_CODES.includes(ErrorCode.of(error)))
        throw error;
      throw new ArchiveUnreadableException(archive, error);
    }

    const files = new Map<string, Buffer>();
    let extendedName: string | null = null;
    for (let offset = 0; offset + Resources.tarBlockSize <= tar.length && tar[offset] !== 0;) {
      const header = tar.subarray(offset, offset + Resources.tarBlockSize);
      const size = Number.parseInt(ArchiveReader.readField(header, Resources.tarSizeStart, Resources.tarSizeEnd).trim(), Resources.tarNumberRadix);
      if (!Number.isInteger(size) || offset + Resources.tarBlockSize + size > tar.length)
        throw new ArchiveEntryMalformedException(archive, offset);
      const content = tar.subarray(offset + Resources.tarBlockSize, offset + Resources.tarBlockSize + size);
      const type = header.toString(Resources.latin1Encoding, Resources.tarTypeStart, Resources.tarTypeStart + 1);
      if (type === Resources.tarExtendedType)
        extendedName = Resources.paxPathPattern.exec(content.toString(Resources.utf8Encoding))?.groups?.[Resources.paxValueGroup] ?? null;
      else {
        if (ArchiveReader.FILE_TYPES.includes(type))
          files.set(extendedName ?? ArchiveReader.readName(header), Buffer.from(content));
        extendedName = null;
      }
      offset += Resources.tarBlockSize * (1 + Math.ceil(size / Resources.tarBlockSize));
    }
    return files;
  }

  private static readName(header: Buffer): string {
    const name = ArchiveReader.readField(header, 0, Resources.tarNameEnd);
    const prefix = ArchiveReader.readField(header, Resources.tarPrefixStart, Resources.tarPrefixEnd);
    return prefix.length > 0 ? Resources.formatTarPath(prefix, name) : name;
  }

  private static readField(header: Buffer, start: number, end: number): string {
    return header.toString(Resources.utf8Encoding, start, end).replace(Resources.tarFieldEndPattern, "");
  }
}
