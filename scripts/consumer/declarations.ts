/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CheckpointsService } from "@noldova/checkpoints/runtime";
import type { IRuntimePartContext } from "@noldova/desktop.runtime";

export const getService = (context: IRuntimePartContext, type: typeof CheckpointsService): CheckpointsService => context.getService("checkpoints.service", type);

export const unconstructible: typeof CheckpointsService extends new (...args: never[]) => unknown ? false : true = true;
