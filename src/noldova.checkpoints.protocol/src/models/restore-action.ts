/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownRestoreActionException } from "../exceptions/unknown-restore-action.exception.ts";

export class RestoreAction {
  public static readonly Write: RestoreAction = new RestoreAction("Write");
  public static readonly Replace: RestoreAction = new RestoreAction("Replace");
  public static readonly Delete: RestoreAction = new RestoreAction("Delete");
  private static readonly ALL: readonly RestoreAction[] = [RestoreAction.Write, RestoreAction.Replace, RestoreAction.Delete];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): RestoreAction {
    const action = RestoreAction.ALL.find(t => t.value === value);
    if (action === undefined)
      throw new UnknownRestoreActionException(String(value));
    return action;
  }

  public toJson(): string {
    return this.value;
  }
}
