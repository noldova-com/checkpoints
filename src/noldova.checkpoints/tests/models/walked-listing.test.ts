/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SideListing } from "../../src/models/side-listing.ts";
import { WalkResult } from "../../src/models/walk-result.ts";
import { WalkedListing } from "../../src/models/walked-listing.ts";

describe("WalkedListing", { concurrency: true }, () => {
  it("holds what a folder holds now and the walk that found it", () => {
    const listing = new SideListing(new Map(), [], [], null);
    const walk = new WalkResult(null);

    const walked = new WalkedListing(listing, walk);

    assert.deepEqual([walked.listing, walked.walk], [listing, walk]);
  });
});
