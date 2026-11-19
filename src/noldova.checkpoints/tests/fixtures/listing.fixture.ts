/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { promises } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import type { TestContext } from "node:test";

export class ListingFixture {
  public static beforeListing(t: TestContext, ...moments: readonly (readonly [() => string | null, (folder: string) => Promise<void>])[]): void {
    const readdir = promises.readdir;
    const pending = [...moments];
    const listing = t.mock.method(promises, "readdir", async (...args: Parameters<typeof readdir>) => {
      const folder = path.resolve(String(args[0]));
      for (const moment of pending.filter(([u]) => u() === folder)) {
        pending.splice(pending.indexOf(moment), 1);
        await moment[1](folder);
      }
      return await readdir(...args);
    });
    syncBuiltinESMExports();
    t.after(() => {
      listing.mock.restore();
      syncBuiltinESMExports();
      assert.equal(pending.length, 0, "a listing the test changes never came");
    });
  }
}
