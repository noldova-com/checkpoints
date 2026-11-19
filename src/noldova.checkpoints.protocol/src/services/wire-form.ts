/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonException, JsonReader, type JsonValue } from "@noldova/context.json";

import { InvalidTimeException } from "../exceptions/invalid-time.exception.ts";
import { Resources } from "../resources.ts";

export class WireForm {
  public static read(value: unknown, model: string, fields: readonly string[]): JsonReader {
    const names = typeof value === "object" && value !== null ? Object.keys(value) : [];
    const reader = JsonReader.fromValue(value, model);
    const unknown = names.find(t => !fields.includes(t));
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

  public static readNullableTime(reader: JsonReader, field: string): Date | null {
    return reader.readValue(field) === null ? null : WireForm.readTime(reader, field);
  }

  public static readTime(reader: JsonReader, field: string): Date {
    const time = reader.readString(field);
    if (!Resources.timePattern.test(time) || Number.isNaN(Date.parse(time)) || new Date(time).toISOString() !== time)
      throw new InvalidTimeException(time);
    return new Date(time);
  }

  public static readNullableStringArray(reader: JsonReader, field: string): readonly string[] | null {
    return reader.readValue(field) === null ? null : reader.readStringArray(field);
  }
}
