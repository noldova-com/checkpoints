/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";
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
    const reader = StoreFormat.read(value, Resources.linkRecordModel, LinkRecord.FIELDS);
    return new LinkRecord(reader.readString(Resources.pathField), LinkKind.fromJson(reader.readValue(Resources.linkKindField)));
  }

  public toJson(): JsonObject {
    return { [Resources.pathField]: this.path, [Resources.linkKindField]: this.linkKind.toJson() };
  }
}
