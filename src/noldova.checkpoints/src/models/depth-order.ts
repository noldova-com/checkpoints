/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class DepthOrder {
  public static readonly DeepestFirst: DepthOrder = new DepthOrder(-1);
  public static readonly ShallowestFirst: DepthOrder = new DepthOrder(1);
  private readonly sign: number;

  private constructor(sign: number) {
    this.sign = sign;
  }

  public sort(folders: readonly string[]): readonly string[] {
    return [...folders].sort((t, u) => this.sign * (DepthOrder.depthOf(t) - DepthOrder.depthOf(u)) || Buffer.compare(Buffer.from(t), Buffer.from(u)));
  }

  private static depthOf(folder: string): number {
    return folder.split(Resources.relativePathSeparator).length;
  }
}
