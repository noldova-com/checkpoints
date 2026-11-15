/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";

export class StorageRequest {
  public static readonly method: string = Resources.storageMethod;

  public static fromJson(value: unknown): StorageRequest {
    WireForm.read(value, Resources.storageRequestModel, []);
    return new StorageRequest();
  }

  public toJson(): JsonObject {
    return {};
  }
}
