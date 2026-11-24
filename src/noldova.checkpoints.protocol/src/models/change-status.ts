/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownChangeStatusException } from "../exceptions/unknown-change-status.exception.ts";

export class ChangeStatus {
  public static readonly Added: ChangeStatus = new ChangeStatus("Added");
  public static readonly Deleted: ChangeStatus = new ChangeStatus("Deleted");
  public static readonly Modified: ChangeStatus = new ChangeStatus("Modified");
  public static readonly KindChanged: ChangeStatus = new ChangeStatus("KindChanged");
  public static readonly Unknown: ChangeStatus = new ChangeStatus("Unknown");
  private static readonly ALL: readonly ChangeStatus[] = [
    ChangeStatus.Added, ChangeStatus.Deleted, ChangeStatus.Modified, ChangeStatus.KindChanged, ChangeStatus.Unknown
  ];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): ChangeStatus {
    const status = ChangeStatus.ALL.find(t => t.value === value);
    if (Object.isUndefined(status))
      throw new UnknownChangeStatusException(String(value));
    return status;
  }

  public toJson(): string {
    return this.value;
  }
}
