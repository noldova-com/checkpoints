/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObjectReader } from "@noldova/checkpoints.protocol";

import { StoreFieldNotAStringListException } from "../exceptions/store-field-not-a-string-list.exception.ts";
import { UnsupportedStoreFormatException } from "../exceptions/unsupported-store-format.exception.ts";
import { Resources } from "../resources.ts";

export class StoreFormat {
  public static check(reader: JsonObjectReader): void {
    StoreFormat.readVersion(reader, [Resources.formatVersion]);
  }

  public static readVersion(reader: JsonObjectReader, versions: readonly number[]): number {
    const version = reader.read(Resources.formatVersionField);
    const known = versions.find(t => t === version);
    if (known === undefined)
      throw new UnsupportedStoreFormatException(String(version));
    return known;
  }

  public static readStringList(reader: JsonObjectReader, field: string): readonly string[] {
    return reader.readList(field).map(t => {
      if (typeof t !== "string")
        throw new StoreFieldNotAStringListException(field);
      return t;
    });
  }
}
