/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomUUID } from "node:crypto";
import { rm, symlink } from "node:fs/promises";
import path from "node:path";

import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";

export class LinkProbe {
  public static async canCreateLinksAsync(folder: string): Promise<boolean> {
    const location = path.join(folder, `${Resources.linkProbePrefix}${randomUUID()}`);
    const created = await Failures.recoverAsync(symlink(Resources.linkProbeTarget, location, Resources.fileLinkType).then(() => true),
      t => Failures.hasCode(t, Resources.linkRefusedCodes), false);
    if (created)
      await rm(location, { force: true });
    return created;
  }
}
