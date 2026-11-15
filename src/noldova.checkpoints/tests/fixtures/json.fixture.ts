/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject, JsonValue } from "@noldova/context.json";

export type JsonFields = Readonly<Record<string, unknown>>;

export class JsonFixture {
  public static fieldOf(value: JsonValue, name: string): JsonValue {
    const field = JsonFixture.isJsonObject(value) ? value[name] : undefined;
    if (field === undefined)
      throw new Error(`${JSON.stringify(value)} has no field ${name}.`);
    return field;
  }

  public static isJsonObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  public static isObject(value: unknown): value is JsonFields {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  public static objectOf(value: unknown): JsonFields {
    if (!JsonFixture.isObject(value))
      throw new Error(`${JSON.stringify(value)} isn't a JSON object.`);
    return value;
  }

  public static objectsOf(value: unknown): readonly JsonFields[] {
    return JsonFixture.listOf(value).map(t => JsonFixture.objectOf(t));
  }

  public static listOf(value: unknown): readonly unknown[] {
    if (!Array.isArray(value))
      throw new Error(`${JSON.stringify(value)} isn't a JSON list.`);
    return value;
  }

  public static parse(text: string): JsonFields {
    return JsonFixture.objectOf(JSON.parse(text));
  }

  public static booleanOf(value: unknown): boolean {
    if (typeof value !== "boolean")
      throw new Error(`${JSON.stringify(value)} isn't a JSON boolean.`);
    return value;
  }

  public static numberOf(value: unknown): number {
    if (typeof value !== "number")
      throw new Error(`${JSON.stringify(value)} isn't a JSON number.`);
    return value;
  }

  public static textOf(value: unknown): string {
    if (typeof value !== "string")
      throw new Error(`${JSON.stringify(value)} isn't a JSON string.`);
    return value;
  }
}
