/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class FolderQueue {
  private readonly tails: Map<string, Promise<unknown>> = new Map();

  public async runAsync<T>(identity: string, operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
    const previous = this.tails.get(identity) ?? Promise.resolve();
    const run = previous.then(() => {
      signal.throwIfAborted();
      return operation();
    });
    const tail = Promise.allSettled([run]);
    this.tails.set(identity, tail);
    try {
      return await run;
    }
    finally {
      if (this.tails.get(identity) === tail)
        this.tails.delete(identity);
    }
  }
}
