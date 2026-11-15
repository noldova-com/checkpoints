/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonException, JsonReader, type JsonValue } from "@noldova/context.json";

import { Resources } from "../resources.ts";

export class WireForm {
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

  public static readNullableStringArray(reader: JsonReader, field: string): readonly string[] | null {
    return reader.readValue(field) === null ? null : reader.readStringArray(field);
  }
}
