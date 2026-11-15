/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomBytes } from "node:crypto";

import { Resources } from "../resources.ts";
import { Clock } from "./clock.ts";

export class CheckpointIdSource {
  private readonly clock: Clock;
  private last: bigint = 0n;

  public constructor(clock: Clock = Clock.system) {
    this.clock = clock;
  }

  public next(): string {
    const now = BigInt(this.clock.now()) << Resources.checkpointIdCounterBits;
    this.last = now > this.last ? now : this.last + 1n;
    const random = randomBytes(Resources.checkpointIdRandomBytes);
    const time = this.last >> Resources.checkpointIdCounterBits;
    const counter = this.last & Resources.checkpointIdCounterMask;
    const variant = (random.readUInt8(0) & Resources.uuidVariantMask) | Resources.uuidVariantBits;
    return Resources.formatCheckpointId(time, counter, variant, random.subarray(1).toString(Resources.hexEncoding));
  }
}
