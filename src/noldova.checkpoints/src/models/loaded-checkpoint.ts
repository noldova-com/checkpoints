/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CheckpointRecord } from "./checkpoint-record.ts";
import type { SideListing } from "./side-listing.ts";

export class LoadedCheckpoint {
  public readonly listing: SideListing;
  public readonly record: CheckpointRecord;

  public constructor(record: CheckpointRecord, listing: SideListing) {
    this.listing = listing;
    this.record = record;
  }
}
