/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IRuntimePart, IRuntimePartContext } from "@noldova/desktop.runtime";

import type { CheckpointsHost } from "./services/checkpoints-host.ts";
import { Clock } from "./services/clock.ts";
import { ModuleActivation } from "./services/module-activation.ts";

export class RuntimePart implements IRuntimePart {
  private host: CheckpointsHost | undefined;

  public constructor() {
    this.host = undefined;
  }

  public async activateAsync(context: IRuntimePartContext): Promise<void> {
    this.host = await ModuleActivation.activateAsync(context, Clock.system);
  }

  public async deactivateAsync(): Promise<void> {
    await this.host?.stopAsync();
  }
}
