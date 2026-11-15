/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { ChangeSidesMismatchException } from "../exceptions/change-sides-mismatch.exception.ts";
import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { UnreadReasonMismatchException } from "../exceptions/unread-reason-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { RelativePath } from "../services/relative-path.ts";
import { WireForm } from "../services/wire-form.ts";
import { ChangeSide } from "./change-side.ts";
import { ChangeStatus } from "./change-status.ts";
import { UnreadReason } from "./unread-reason.ts";

export class Change {
  private static readonly FIELDS: readonly string[] = [
    Resources.pathField, Resources.statusField, Resources.beforeField, Resources.afterField, Resources.unreadReasonField
  ];
  public readonly after: ChangeSide | null;
  public readonly before: ChangeSide | null;
  public readonly path: string;
  public readonly status: ChangeStatus;
  public readonly unreadReason: UnreadReason | null;

  public constructor(path: string, status: ChangeStatus, before: ChangeSide | null, after: ChangeSide | null, unreadReason: UnreadReason | null) {
    if (!RelativePath.isValid(path))
      throw new InvalidRelativePathException(path);
    if (status !== ChangeStatus.Unknown && ((before === null) !== (status === ChangeStatus.Added) || (after === null) !== (status === ChangeStatus.Deleted)))
      throw new ChangeSidesMismatchException(status);
    if ((unreadReason !== null) !== (status === ChangeStatus.Unknown))
      throw new UnreadReasonMismatchException(status);

    this.after = after;
    this.before = before;
    this.path = path;
    this.status = status;
    this.unreadReason = unreadReason;
  }

  public static fromJson(value: unknown): Change {
    const reader = WireForm.read(value, Resources.changeModel, Change.FIELDS);
    const before = reader.readValue(Resources.beforeField);
    const after = reader.readValue(Resources.afterField);
    const unreadReason = reader.readValue(Resources.unreadReasonField);
    return new Change(
      reader.readString(Resources.pathField),
      ChangeStatus.fromJson(reader.readValue(Resources.statusField)),
      before === null ? null : ChangeSide.fromJson(before),
      after === null ? null : ChangeSide.fromJson(after),
      unreadReason === null ? null : UnreadReason.fromJson(unreadReason));
  }

  public toJson(): JsonObject {
    return {
      [Resources.pathField]: this.path,
      [Resources.statusField]: this.status.toJson(),
      [Resources.beforeField]: this.before === null ? null : this.before.toJson(),
      [Resources.afterField]: this.after === null ? null : this.after.toJson(),
      [Resources.unreadReasonField]: this.unreadReason === null ? null : this.unreadReason.toJson()
    };
  }
}
