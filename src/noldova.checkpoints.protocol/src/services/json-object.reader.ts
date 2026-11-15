/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FieldNotABooleanException } from "../exceptions/field-not-a-boolean.exception.ts";
import { FieldNotAListException } from "../exceptions/field-not-a-list.exception.ts";
import { FieldNotANumberOrNullException } from "../exceptions/field-not-a-number-or-null.exception.ts";
import { FieldNotANumberException } from "../exceptions/field-not-a-number.exception.ts";
import { FieldNotAStringListException } from "../exceptions/field-not-a-string-list.exception.ts";
import { FieldNotAStringOrNullException } from "../exceptions/field-not-a-string-or-null.exception.ts";
import { FieldNotAStringException } from "../exceptions/field-not-a-string.exception.ts";
import { MissingFieldException } from "../exceptions/missing-field.exception.ts";
import { NotAnObjectException } from "../exceptions/not-an-object.exception.ts";
import { UnknownFieldException } from "../exceptions/unknown-field.exception.ts";

export class JsonObjectReader {
  private readonly fields: ReadonlyMap<string, unknown>;
  private readonly model: string;

  public constructor(value: unknown, model: string) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new NotAnObjectException(model);

    this.fields = new Map(Object.entries(value));
    this.model = model;
  }

  public read(field: string): unknown {
    if (!this.fields.has(field))
      throw new MissingFieldException(this.model, field);
    return this.fields.get(field);
  }

  public readBoolean(field: string): boolean {
    const value = this.read(field);
    if (typeof value !== "boolean")
      throw new FieldNotABooleanException(this.model, field);
    return value;
  }

  public readList(field: string): readonly unknown[] {
    const value = this.read(field);
    if (!Array.isArray(value))
      throw new FieldNotAListException(this.model, field);
    return value;
  }

  public readNumber(field: string): number {
    const value = this.read(field);
    if (typeof value !== "number")
      throw new FieldNotANumberException(this.model, field);
    return value;
  }

  public readNumberOrNull(field: string): number | null {
    const value = this.read(field);
    if (value !== null && typeof value !== "number")
      throw new FieldNotANumberOrNullException(this.model, field);
    return value;
  }

  public readString(field: string): string {
    const value = this.read(field);
    if (typeof value !== "string")
      throw new FieldNotAStringException(this.model, field);
    return value;
  }

  public readStringOrNull(field: string): string | null {
    const value = this.read(field);
    if (value !== null && typeof value !== "string")
      throw new FieldNotAStringOrNullException(this.model, field);
    return value;
  }

  public readStringList(field: string): readonly string[] {
    return this.stringListOf(field, this.read(field));
  }

  public readStringListOrNull(field: string): readonly string[] | null {
    const value = this.read(field);
    return value === null ? null : this.stringListOf(field, value);
  }

  public refuseOtherFields(known: readonly string[]): void {
    for (const field of this.fields.keys())
      if (!known.includes(field))
        throw new UnknownFieldException(this.model, field);
  }

  private stringListOf(field: string, value: unknown): readonly string[] {
    if (!Array.isArray(value))
      throw new FieldNotAStringListException(this.model, field);
    const strings = value.filter((t): t is string => typeof t === "string");
    if (strings.length !== value.length)
      throw new FieldNotAStringListException(this.model, field);
    return strings;
  }
}
