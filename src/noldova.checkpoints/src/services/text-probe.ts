/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ChangeSide, PathKind } from "@noldova/checkpoints.protocol";

import type { FolderFile } from "../models/folder-file.ts";
import { ReadFailure } from "../models/read-failure.ts";
import type { StoredObject } from "../models/stored-object.ts";
import { Resources } from "../resources.ts";
import { FolderFileReader } from "./folder-file.reader.ts";

export class TextProbe {
  public static isText(size: number, head: Buffer): boolean {
    return size <= Resources.bigFileThreshold && !head.subarray(0, Resources.textProbeLength).includes(Resources.nulByte);
  }

  public static sideOfObject(kind: PathKind, object: StoredObject): ChangeSide {
    return new ChangeSide(kind, object.size, TextProbe.isText(object.size, object.head));
  }

  public static async sideOfFolderAsync(folder: string, file: FolderFile): Promise<ChangeSide> {
    const head = await FolderFileReader.readAsync(folder, file, Resources.textProbeLength);
    if (head instanceof ReadFailure)
      return new ChangeSide(file.kind, file.size, false);

    const size = file.kind === PathKind.Link ? head.length : file.size;
    return new ChangeSide(file.kind, size, TextProbe.isText(size, head));
  }
}
