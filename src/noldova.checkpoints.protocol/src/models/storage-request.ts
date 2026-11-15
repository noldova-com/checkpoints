/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";

export class StorageRequest {
  public static readonly method: string = Resources.storageMethod;

  public static fromJson(value: unknown): StorageRequest {
    new JsonObjectReader(value, Resources.storageRequestModel).refuseOtherFields([]);
    return new StorageRequest();
  }

  public toJson(): JsonObject {
    return {};
  }
}
