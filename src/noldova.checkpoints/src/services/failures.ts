/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { Resources } from "../resources.ts";

export class Failures {
  public static codeOf(error: unknown): string | null {
    return error instanceof Error && "code" in error && Object.isString(error.code) ? error.code : null;
  }

  public static systemCodeOf(error: unknown): string | null {
    return error instanceof Error && "errno" in error && Object.isNumber(error.errno) ? Failures.codeOf(error) : null;
  }

  public static hasErrno(error: unknown, errnos: readonly number[]): boolean {
    return error instanceof Error && "errno" in error && Object.isNumber(error.errno) && errnos.includes(error.errno);
  }

  public static hasCode(error: unknown, codes: readonly string[]): boolean {
    const code = Failures.codeOf(error);
    return !Object.isNull(code) && codes.includes(code);
  }

  public static isAbsent(error: unknown): boolean {
    return Failures.hasCode(error, Resources.absentCodes);
  }

  public static messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  public static handled<T>(error: unknown, handles: (error: unknown) => error is T): T {
    if (handles(error))
      return error;
    throw error;
  }

  public static recover<T, F>(run: () => T, handles: (error: unknown) => boolean, fallback: F): T | F {
    try {
      return run();
    }
    catch (error) {
      if (handles(error))
        return fallback;
      throw error;
    }
  }

  public static async recoverAsync<T, F>(running: Promise<T>, handles: (error: unknown) => boolean, fallback: F): Promise<T | F> {
    try {
      return await running;
    }
    catch (error) {
      if (handles(error))
        return fallback;
      throw error;
    }
  }
}
