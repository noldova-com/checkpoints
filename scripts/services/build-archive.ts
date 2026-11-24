/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { chmod, cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

import { BuildCentralEntryMalformedException } from "../exceptions/build-central-entry-malformed.exception.ts";
import { BuildCompressionException } from "../exceptions/build-compression.exception.ts";
import { BuildEntryMalformedException } from "../exceptions/build-entry-malformed.exception.ts";
import { BuildEntryTypeException } from "../exceptions/build-entry-type.exception.ts";
import { BuildLinkLoopException } from "../exceptions/build-link-loop.exception.ts";
import { BuildLinkOutsideException } from "../exceptions/build-link-outside.exception.ts";
import { BuildLinkTargetMissingException } from "../exceptions/build-link-target-missing.exception.ts";
import { BuildLocalEntryMalformedException } from "../exceptions/build-local-entry-malformed.exception.ts";
import { BuildNotZipException } from "../exceptions/build-not-zip.exception.ts";
import { BuildPathOutsideException } from "../exceptions/build-path-outside.exception.ts";
import { UnpackedBuild } from "../models/unpacked-build.ts";
import { Resources } from "../resources.ts";
import { ErrorCode } from "./error-code.ts";

export class BuildArchive {
  private static readonly ZIP_END: Buffer = Buffer.from(Resources.zipEndSignature);

  private readonly dropped: readonly string[];
  private readonly folder: string;
  private readonly links: Map<string, string> = new Map();
  private readonly program: string;
  private readonly execProgram: string;
  private readonly kept: readonly string[];

  public constructor(folder: string, dropped: readonly string[], program: string, execPath: string) {
    this.dropped = dropped;
    this.folder = folder;
    this.program = path.join(folder, ...program.split(Resources.pathSeparator));
    this.execProgram = path.join(folder, ...execPath.split(Resources.pathSeparator), path.posix.basename(program));
    this.kept = [this.program, this.execProgram, ...Resources.startedCommands.map(t => path.join(folder, ...execPath.split(Resources.pathSeparator), t))];
  }

  public async unpackAsync(archive: Buffer, kind: "zip" | "tar.gz"): Promise<UnpackedBuild> {
    const entries: string[] = [];
    const listing: string[] = [];
    const count = kind === Resources.zipKind ? await this.unpackZipAsync(archive, entries, listing) : await this.unpackTarAsync(zlib.gunzipSync(archive), entries, listing);
    return new UnpackedBuild(count + await this.copyLinksAsync(), entries, listing);
  }

  private static relativeOf(name: string, isFolder: boolean): string {
    const relative = name.replaceAll(Resources.windowsPathSeparator, Resources.pathSeparator).replace(Resources.leadingCurrentFolderPattern, "");
    return isFolder && relative !== "" && !relative.endsWith(Resources.pathSeparator) ? `${relative}${Resources.pathSeparator}` : relative;
  }

  private static kindOf(type: string): string {
    return type === Resources.tarFolderType ? Resources.folderKind
      : type === Resources.tarSymbolicLinkType ? Resources.symbolicLinkKind
        : type === Resources.tarHardLinkType ? Resources.hardLinkKind
          : Resources.fileKind;
  }

  private isDropped(relative: string): boolean {
    return this.dropped.some(t => relative === t || (t.endsWith(Resources.pathSeparator) && relative.startsWith(t)));
  }

  private locationOf(relative: string): string {
    const names = relative.split(Resources.pathSeparator).filter(t => t !== "");
    if (names.some(t => t === Resources.parentFolderName || t === Resources.currentFolderName) || relative.startsWith(Resources.pathSeparator) || Resources.drivePattern.test(relative))
      throw new BuildPathOutsideException(relative);
    return path.join(this.folder, ...names);
  }

  private async copyLinksAsync(): Promise<number> {
    const programs = [this.resolve(this.program), this.resolve(this.execProgram)];
    let count = 0;
    for (const location of this.links.keys()) {
      const target = this.resolve(location);
      if (programs.includes(target) && !this.kept.includes(location))
        continue;
      await cp(target, location, { recursive: true, errorOnExist: true, force: false }).catch((error: unknown) => {
        if (ErrorCode.of(error) !== Resources.missingCode)
          throw error;
        throw new BuildLinkTargetMissingException(path.relative(this.folder, location), path.relative(this.folder, target), error);
      });
      count++;
    }
    return count;
  }

  private resolve(location: string): string {
    let target = location;
    let next = this.links.get(target);
    for (let hops = 0; next !== undefined; hops++) {
      if (hops > this.links.size)
        throw new BuildLinkLoopException(path.relative(this.folder, location));
      target = next;
      next = this.links.get(target);
    }
    return target;
  }

  private async unpackTarAsync(tar: Buffer, entries: string[], listing: string[]): Promise<number> {
    let count = 0;
    let longName: string | null = null;
    let longLink: string | null = null;
    for (let offset = 0; offset + Resources.tarBlockSize <= tar.length && tar[offset] !== 0;) {
      const header = tar.subarray(offset, offset + Resources.tarBlockSize);
      const field = (start: number, end: number): string => header.toString(Resources.utf8Encoding, start, end).replace(Resources.tarFieldEndPattern, "");
      const size = Number.parseInt(field(Resources.tarSizeStart, Resources.tarSizeEnd).trim(), Resources.tarNumberRadix);
      const mode = Number.parseInt(field(Resources.tarNameEnd, Resources.tarModeEnd).trim(), Resources.tarNumberRadix) || 0;
      if (!Number.isSafeInteger(size) || offset + Resources.tarBlockSize + size > tar.length)
        throw new BuildEntryMalformedException(offset);
      const content = tar.subarray(offset + Resources.tarBlockSize, offset + Resources.tarBlockSize + size);
      const type = header.toString(Resources.latin1Encoding, Resources.tarTypeStart, Resources.tarTypeStart + 1);
      const prefix = header.toString(Resources.latin1Encoding, Resources.tarMagicStart, Resources.tarMagicEnd) === Resources.tarPosixMagic ? field(Resources.tarPrefixStart, Resources.tarPrefixEnd) : "";
      offset += Resources.tarBlockSize * (1 + Math.ceil(size / Resources.tarBlockSize));
      if (type === Resources.tarLongNameType) {
        longName = content.toString(Resources.utf8Encoding).replace(Resources.tarFieldEndPattern, "");
        continue;
      }
      if (type === Resources.tarLongLinkType) {
        longLink = content.toString(Resources.utf8Encoding).replace(Resources.tarFieldEndPattern, "");
        continue;
      }
      if (type === Resources.tarExtendedType) {
        const records = content.toString(Resources.utf8Encoding);
        longName = Resources.paxPathPattern.exec(records)?.groups?.[Resources.paxValueGroup] ?? longName;
        longLink = Resources.paxLinkPathPattern.exec(records)?.groups?.[Resources.paxValueGroup] ?? longLink;
        continue;
      }
      if (type === Resources.tarGlobalType)
        continue;
      const name = longName ?? (prefix.length > 0 ? Resources.formatTarPath(prefix, field(0, Resources.tarNameEnd)) : field(0, Resources.tarNameEnd));
      const linkName = longLink ?? field(Resources.tarTypeStart + 1, Resources.tarMagicStart);
      longName = null;
      longLink = null;

      const relative = BuildArchive.relativeOf(name, type === Resources.tarFolderType);
      if (relative === "")
        continue;
      entries.push(relative);
      const kind = BuildArchive.kindOf(type);
      listing.push([kind, String(size), relative, ...(kind.endsWith(Resources.linkKindSuffix) ? [Resources.formatLinkTarget(linkName)] : [])].join(Resources.columnSeparator));
      if (this.isDropped(relative))
        continue;
      const location = this.locationOf(relative);
      if (type === Resources.tarFolderType) {
        await mkdir(location, { recursive: true });
        continue;
      }
      await mkdir(path.dirname(location), { recursive: true });
      if (type === Resources.tarSymbolicLinkType || type === Resources.tarHardLinkType) {
        if (linkName.startsWith(Resources.pathSeparator))
          throw new BuildLinkOutsideException(relative, linkName);
        const target = BuildArchive.relativeOf(type === Resources.tarSymbolicLinkType ? path.posix.join(path.posix.dirname(relative), linkName) : linkName, false);
        if (!this.isDropped(target))
          this.links.set(location, this.locationOf(target));
        continue;
      }
      if (type !== Resources.tarFileType && type !== Resources.tarOldFileType)
        throw new BuildEntryTypeException(relative, type);
      await writeFile(location, content);
      await chmod(location, (mode & Resources.executableBits) !== 0 ? Resources.executableMode : Resources.regularMode);
      count++;
    }
    return count;
  }

  private async unpackZipAsync(zip: Buffer, entries: string[], listing: string[]): Promise<number> {
    const end = zip.lastIndexOf(BuildArchive.ZIP_END);
    if (end < 0)
      throw new BuildNotZipException();
    const total = zip.readUInt16LE(end + Resources.zipEndEntriesOffset);
    let offset = zip.readUInt32LE(end + Resources.zipEndCentralOffset);
    let count = 0;
    for (let index = 0; index < total; index++) {
      if (zip.readUInt32LE(offset) !== Resources.zipCentralSignature)
        throw new BuildCentralEntryMalformedException(offset);
      const method = zip.readUInt16LE(offset + Resources.zipCentralMethodOffset);
      const compressedSize = zip.readUInt32LE(offset + Resources.zipCentralCompressedSizeOffset);
      const size = zip.readUInt32LE(offset + Resources.zipCentralSizeOffset);
      const nameLength = zip.readUInt16LE(offset + Resources.zipCentralNameLengthOffset);
      const extraLength = zip.readUInt16LE(offset + Resources.zipCentralExtraLengthOffset);
      const commentLength = zip.readUInt16LE(offset + Resources.zipCentralCommentLengthOffset);
      const localOffset = zip.readUInt32LE(offset + Resources.zipCentralLocalOffset);
      const name = zip.toString(Resources.utf8Encoding, offset + Resources.zipCentralHeaderSize, offset + Resources.zipCentralHeaderSize + nameLength);
      offset += Resources.zipCentralHeaderSize + nameLength + extraLength + commentLength;

      const relative = BuildArchive.relativeOf(name, name.endsWith(Resources.pathSeparator));
      entries.push(relative);
      listing.push([relative.endsWith(Resources.pathSeparator) ? Resources.folderKind : Resources.fileKind, String(size), relative].join(Resources.columnSeparator));
      if (this.isDropped(relative))
        continue;
      const location = this.locationOf(relative);
      if (relative.endsWith(Resources.pathSeparator)) {
        await mkdir(location, { recursive: true });
        continue;
      }
      if (zip.readUInt32LE(localOffset) !== Resources.zipLocalSignature)
        throw new BuildLocalEntryMalformedException(relative);
      if (method !== Resources.zipStoredMethod && method !== Resources.zipDeflatedMethod)
        throw new BuildCompressionException(relative);
      const start = localOffset + Resources.zipLocalHeaderSize + zip.readUInt16LE(localOffset + Resources.zipLocalNameLengthOffset) + zip.readUInt16LE(localOffset + Resources.zipLocalExtraLengthOffset);
      const data = zip.subarray(start, start + compressedSize);
      await mkdir(path.dirname(location), { recursive: true });
      await writeFile(location, method === Resources.zipStoredMethod ? data : zlib.inflateRawSync(data));
      count++;
    }
    return count;
  }
}
