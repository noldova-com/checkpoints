/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FolderFile } from "./folder-file.ts";
import type { SideListing } from "./side-listing.ts";
import type { WalkResult } from "./walk-result.ts";

export class WalkedListing {
  public readonly listing: SideListing<FolderFile>;
  public readonly walk: WalkResult;

  public constructor(listing: SideListing<FolderFile>, walk: WalkResult) {
    this.listing = listing;
    this.walk = walk;
  }
}
