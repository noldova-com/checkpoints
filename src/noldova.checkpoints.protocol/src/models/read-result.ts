/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { ContentTooLongException } from "../exceptions/content-too-long.exception.ts";
import { ReadCutMismatchException } from "../exceptions/read-cut-mismatch.exception.ts";
import { ReadOutcomeMismatchException } from "../exceptions/read-outcome-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { Base64 } from "../services/base64.ts";
import { ByteSize } from "../services/byte-size.ts";
import { WireForm } from "../services/wire-form.ts";
import { ReadOutcome } from "./read-outcome.ts";

export class ReadResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField, Resources.contentField, Resources.isCutField, Resources.sizeField];
  public readonly content: Uint8Array;
  public readonly outcome: ReadOutcome;
  public readonly size: number;

  public constructor(outcome: ReadOutcome, content: Uint8Array, size: number) {
    if (!outcome.isRead && (content.length > 0 || size > 0))
      throw new ReadOutcomeMismatchException(outcome);
    ByteSize.check(size);
    if (content.length > size)
      throw new ContentTooLongException(content.length, size);

    this.content = new Uint8Array(content);
    this.outcome = outcome;
    this.size = size;
  }

  public get isCut(): boolean {
    return this.content.length < this.size;
  }

  public static fromJson(value: unknown): ReadResult {
    const reader = WireForm.read(value, Resources.readResultModel, ReadResult.FIELDS);
    const result = new ReadResult(ReadOutcome.fromJson(reader.readValue(Resources.outcomeField)), Base64.decode(reader.readString(Resources.contentField)),
      reader.readNumber(Resources.sizeField));
    const isCut = reader.readBoolean(Resources.isCutField);
    if (isCut !== result.isCut)
      throw new ReadCutMismatchException(isCut);
    return result;
  }

  public toJson(): JsonObject {
    return {
      [Resources.outcomeField]: this.outcome.toJson(),
      [Resources.contentField]: Base64.encode(this.content),
      [Resources.isCutField]: this.isCut,
      [Resources.sizeField]: this.size
    };
  }
}
