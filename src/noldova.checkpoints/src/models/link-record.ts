/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, type JsonObject } from "@noldova/checkpoints.protocol";

import { Resources } from "../resources.ts";
import { LinkKind } from "./link-kind.ts";

export class LinkRecord {
  private static readonly FIELDS: readonly string[] = [Resources.pathField, Resources.linkKindField];
  public readonly linkKind: LinkKind;
  public readonly path: string;

  public constructor(path: string, linkKind: LinkKind) {
    this.linkKind = linkKind;
    this.path = path;
  }

  public static fromJson(value: unknown): LinkRecord {
    const reader = new JsonObjectReader(value, Resources.linkRecordModel);
    reader.refuseOtherFields(LinkRecord.FIELDS);
    return new LinkRecord(reader.readString(Resources.pathField), LinkKind.fromJson(reader.read(Resources.linkKindField)));
  }

  public toJson(): JsonObject {
    return { [Resources.pathField]: this.path, [Resources.linkKindField]: this.linkKind.toJson() };
  }
}
