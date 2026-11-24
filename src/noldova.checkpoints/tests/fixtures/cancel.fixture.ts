/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mock, type TestContext } from "node:test";

import "@noldova/context.core";

export class CancelFixture {
  private static readonly JOINED: WeakMap<AbortSignal, CancelFixture> = new WeakMap();
  private static readonly SPIES: (() => void)[] = [];
  private static users: number = 0;
  public readonly reason: Error = new Error("cancelled by its caller");
  private readonly at: number;
  private readonly controller: AbortController = new AbortController();
  private count: number = 0;

  public constructor(t: TestContext, at: number = Number.POSITIVE_INFINITY) {
    this.at = at;
    CancelFixture.JOINED.set(this.controller.signal, this);
    CancelFixture.use(t);
  }

  public get checks(): number {
    return this.count;
  }

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  private static use(t: TestContext): void {
    if (CancelFixture.users === 0)
      CancelFixture.spy();
    CancelFixture.users += 1;
    t.after(() => {
      CancelFixture.users -= 1;
      if (CancelFixture.users === 0)
        for (const restore of CancelFixture.SPIES.splice(0))
          restore();
    });
  }

  private static spy(): void {
    const any = AbortSignal.any;
    const joining = mock.method(AbortSignal, "any", (signals: Iterable<AbortSignal>): AbortSignal => {
      const all = [...signals];
      const joined = any(all);
      const fixture = all.map(t => CancelFixture.JOINED.get(t)).find(t => !Object.isUndefined(t));
      if (!Object.isUndefined(fixture))
        CancelFixture.JOINED.set(joined, fixture);
      return joined;
    });
    const checking = mock.method(AbortSignal.prototype, "throwIfAborted", function (this: AbortSignal): void {
      CancelFixture.JOINED.get(this)?.check();
      if (this.aborted)
        throw this.reason;
    });
    CancelFixture.SPIES.push(() => joining.mock.restore(), () => checking.mock.restore());
  }

  public cancel(): void {
    this.controller.abort(this.reason);
  }

  private check(): void {
    this.count += 1;
    if (this.count === this.at)
      this.controller.abort(this.reason);
  }
}
