/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { open, readFile, rename } from "node:fs/promises";
import path from "node:path";

import { ProtocolException } from "@noldova/checkpoints.protocol";
import { JsonException, type JsonValue } from "@noldova/context.json";

import { StoreException } from "../exceptions/store.exception.ts";
import { StoreFileUnreadableException } from "../exceptions/store-file-unreadable.exception.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import { FolderSync } from "./folder-sync.ts";

export class StoreFile {
  private static readonly FOLDERS: FolderSync = new FolderSync(process.platform);

  public static async readAsync<T>(file: string, read: (value: unknown) => T): Promise<T | null> {
    let text: string;
    try {
      text = await readFile(file, Resources.utf8Encoding);
    }
    catch (error) {
      if (Failures.codeOf(error) === Resources.missingCode)
        return null;
      throw error;
    }

    return StoreFile.parse(path.basename(file), text, read);
  }

  public static parse<T>(name: string, text: string, read: (value: unknown) => T): T {
    try {
      return read(JSON.parse(text));
    }
    catch (error) {
      if (!(error instanceof SyntaxError || error instanceof ProtocolException || error instanceof JsonException || error instanceof StoreException))
        throw error;
      throw new StoreFileUnreadableException(name, error);
    }
  }

  public static async writeAsync(file: string, value: JsonValue): Promise<void> {
    const temporary = `${file}${Resources.temporarySuffix}`;
    const handle = await open(temporary, Resources.writeFlag);
    try {
      await handle.writeFile(JSON.stringify(value));
      await handle.sync();
    }
    finally {
      await handle.close();
    }
    await rename(temporary, file);
    await StoreFile.FOLDERS.syncAsync(path.dirname(file));
  }
}
