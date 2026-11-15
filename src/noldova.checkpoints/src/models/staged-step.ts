/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ScriptStep } from "./script-step.ts";
import type { StagedBlob } from "./staged-blob.ts";

export class StagedStep {
  public readonly blob: StagedBlob;
  public readonly step: ScriptStep;

  public constructor(step: ScriptStep, blob: StagedBlob) {
    this.blob = blob;
    this.step = step;
  }
}
