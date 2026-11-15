/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class StoreReads {
  private readonly moving: Set<string> = new Set();
  private readonly reading: Map<string, Set<Promise<unknown>>> = new Map();

  public async readAsync<T>(identity: string, read: () => Promise<T>): Promise<T | null> {
    if (this.moving.has(identity))
      return null;
    const running = read();
    const reads = this.reading.get(identity) ?? new Set();
    reads.add(running);
    this.reading.set(identity, reads);
    try {
      return await running;
    }
    finally {
      reads.delete(running);
      if (reads.size === 0)
        this.reading.delete(identity);
    }
  }

  public async moveAsync<T>(identity: string, move: () => Promise<T>): Promise<T> {
    this.moving.add(identity);
    try {
      await Promise.allSettled(this.reading.get(identity) ?? []);
      return await move();
    }
    finally {
      this.moving.delete(identity);
    }
  }
}
