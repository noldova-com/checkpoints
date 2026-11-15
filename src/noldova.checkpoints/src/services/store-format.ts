/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonException, JsonReader, type JsonValue } from "@noldova/context.json";

import { UnsupportedStoreFormatException } from "../exceptions/unsupported-store-format.exception.ts";
import { Resources } from "../resources.ts";

export class StoreFormat {
  public static read(value: unknown, model: string, fields: readonly string[]): JsonReader {
    const reader = JsonReader.fromValue(value, model);
    const unknown = Object.keys(reader.toJson()).find(t => !fields.includes(t));
    if (unknown !== undefined)
      throw new JsonException(Resources.unknownField, Resources.formatFieldPath(reader.path, unknown));
    return reader;
  }

  public static readArray(reader: JsonReader, field: string): readonly JsonValue[] {
    const value = reader.readValue(field);
    if (!Array.isArray(value))
      throw new JsonException(Resources.arrayExpected, Resources.formatFieldPath(reader.path, field));
    return value;
  }

  public static readNullableNumber(reader: JsonReader, field: string): number | null {
    return reader.readValue(field) === null ? null : reader.readNumber(field);
  }

  public static check(reader: JsonReader): void {
    StoreFormat.readVersion(reader, [Resources.formatVersion]);
  }

  public static readVersion(reader: JsonReader, versions: readonly number[]): number {
    const version = reader.readValue(Resources.formatVersionField);
    const known = versions.find(t => t === version);
    if (known === undefined)
      throw new UnsupportedStoreFormatException(String(version));
    return known;
  }
}
