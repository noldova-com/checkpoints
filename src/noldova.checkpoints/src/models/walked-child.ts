/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";

export class WalkedChild {
  public readonly names: readonly Buffer[] | null;
  public readonly stats: BigIntStats;

  public constructor(stats: BigIntStats, names: readonly Buffer[] | null) {
    this.names = names;
    this.stats = stats;
  }
}
