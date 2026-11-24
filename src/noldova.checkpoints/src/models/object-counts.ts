/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { StoreCountMissingException } from "../exceptions/store-count-missing.exception.ts";
import { Resources } from "../resources.ts";

export class ObjectCounts {
  public readonly loose: number;
  public readonly looseSize: number;
  public readonly packs: number;
  public readonly packSize: number;

  public constructor(loose: number, looseSize: number, packs: number, packSize: number) {
    this.loose = loose;
    this.looseSize = looseSize;
    this.packs = packs;
    this.packSize = packSize;
  }

  public static parse(output: string): ObjectCounts {
    const counts = new Map(output.split(Resources.lineFeed).filter(t => t.includes(Resources.countObjectsSeparator)).map(t => {
      const [name = "", value = ""] = t.split(Resources.countObjectsSeparator);
      return [name, Resources.countValuePattern.test(value) ? Number(value) : undefined] as const;
    }));
    const read = (name: string): number => {
      const value = counts.get(name);
      if (Object.isUndefined(value))
        throw new StoreCountMissingException(name);
      return value;
    };
    return new ObjectCounts(read(Resources.looseCount), read(Resources.looseSizeCount), read(Resources.packCount), read(Resources.packSizeCount));
  }
}
