/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { UnreadCodeMismatchException } from "../exceptions/unread-code-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import { RelativePath } from "../services/relative-path.ts";
import type { JsonObject } from "../types/json-object.ts";
import { UnreadReason } from "./unread-reason.ts";

export class UnreadPath {
  private static readonly FIELDS: readonly string[] = [Resources.pathField, Resources.reasonField, Resources.codeField];
  public readonly path: string;
  public readonly reason: UnreadReason;
  public readonly code: string | null;

  public constructor(path: string, reason: UnreadReason, code: string | null) {
    if (!RelativePath.isValid(path))
      throw new InvalidRelativePathException(path);
    if ((reason === UnreadReason.Unreadable) !== (code !== null))
      throw new UnreadCodeMismatchException(reason);

    this.path = path;
    this.reason = reason;
    this.code = code;
  }

  public static fromJson(value: unknown): UnreadPath {
    const reader = new JsonObjectReader(value, Resources.unreadPathModel);
    reader.refuseOtherFields(UnreadPath.FIELDS);
    return new UnreadPath(reader.readString(Resources.pathField), UnreadReason.fromJson(reader.read(Resources.reasonField)),
      reader.readStringOrNull(Resources.codeField));
  }

  public toJson(): JsonObject {
    return { [Resources.pathField]: this.path, [Resources.reasonField]: this.reason.toJson(), [Resources.codeField]: this.code };
  }
}
