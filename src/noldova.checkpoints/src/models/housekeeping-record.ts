/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, type JsonObject } from "@noldova/checkpoints.protocol";

import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";

export class HousekeepingRecord {
  private static readonly FIELDS: readonly string[] = [Resources.formatVersionField, Resources.fullPassField];
  public readonly fullPass: number;

  public constructor(fullPass: number) {
    this.fullPass = fullPass;
  }

  public static fromJson(value: unknown): HousekeepingRecord {
    const reader = new JsonObjectReader(value, Resources.housekeepingRecordModel);
    reader.refuseOtherFields(HousekeepingRecord.FIELDS);
    StoreFormat.check(reader);
    return new HousekeepingRecord(reader.readNumber(Resources.fullPassField));
  }

  public toJson(): JsonObject {
    return { [Resources.formatVersionField]: Resources.formatVersion, [Resources.fullPassField]: this.fullPass };
  }
}
