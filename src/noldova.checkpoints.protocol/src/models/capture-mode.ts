/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownCaptureModeException } from "../exceptions/unknown-capture-mode.exception.ts";

export class CaptureMode {
  public static readonly EveryFile: CaptureMode = new CaptureMode("EveryFile");
  public static readonly IgnoreFiles: CaptureMode = new CaptureMode("IgnoreFiles");
  private static readonly ALL: readonly CaptureMode[] = [CaptureMode.EveryFile, CaptureMode.IgnoreFiles];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): CaptureMode {
    const mode = CaptureMode.ALL.find(t => t.value === value);
    if (Object.isUndefined(mode))
      throw new UnknownCaptureModeException(String(value));
    return mode;
  }

  public toJson(): string {
    return this.value;
  }
}
