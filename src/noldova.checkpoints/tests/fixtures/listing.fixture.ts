/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { promises } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import type { TestContext } from "node:test";

export class ListingFixture {
  public static beforeListing(t: TestContext, folder: () => string | null, actAsync: () => Promise<void>): void {
    const readdir = promises.readdir;
    let acted = false;
    const listing = t.mock.method(promises, "readdir", async (...args: Parameters<typeof readdir>) => {
      if (!acted && path.resolve(String(args[0])) === folder()) {
        acted = true;
        await actAsync();
      }
      return await readdir(...args);
    });
    syncBuiltinESMExports();
    t.after(() => {
      listing.mock.restore();
      syncBuiltinESMExports();
    });
  }
}
