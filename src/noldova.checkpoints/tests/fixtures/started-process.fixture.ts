/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { OwnedProcess, ProcessRequest } from "@noldova/desktop.runtime";

export class StartedProcess {
  public readonly owned: OwnedProcess;
  public readonly request: ProcessRequest;

  public constructor(request: ProcessRequest, owned: OwnedProcess) {
    this.owned = owned;
    this.request = request;
  }

  public get command(): string {
    return String(this.request.arguments[0]);
  }

  public get isRunning(): boolean {
    return !this.owned.hasExited;
  }
}
