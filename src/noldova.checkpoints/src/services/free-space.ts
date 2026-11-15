/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { stat, statfs } from "node:fs/promises";

import { Resources } from "../resources.ts";

export class FreeSpace {
  public static async hasRoomAsync(folder: string, store: string, staged: number, kept: number): Promise<boolean> {
    const needs = new Map<bigint, [string, number]>();
    for (const [location, bytes] of [[folder, staged], [store, kept]] as const) {
      const device = await FreeSpace.deviceOfAsync(location);
      needs.set(device, [location, (needs.get(device)?.[1] ?? Resources.spaceMargin) + bytes]);
    }
    for (const [location, needed] of needs.values())
      if (await FreeSpace.readAsync(location) < needed)
        return false;
    return true;
  }

  public static async readAsync(location: string): Promise<number> {
    const stats = await statfs(location, { bigint: true });
    return Number(stats.bavail * stats.bsize);
  }

  private static async deviceOfAsync(location: string): Promise<bigint> {
    return (await stat(location, { bigint: true })).dev;
  }
}
