/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PreviewOutcome, RestoreOutcome } from "@noldova/checkpoints.protocol";

export class NoPlan {
  public static readonly CheckpointMissing: NoPlan = new NoPlan(PreviewOutcome.CheckpointMissing, RestoreOutcome.CheckpointMissing);
  public static readonly FolderMissing: NoPlan = new NoPlan(PreviewOutcome.FolderMissing, RestoreOutcome.FolderMissing);
  public static readonly HeldUp: NoPlan = new NoPlan(PreviewOutcome.HeldUp, RestoreOutcome.HeldUp);
  public readonly preview: PreviewOutcome;
  public readonly restore: RestoreOutcome;

  private constructor(preview: PreviewOutcome, restore: RestoreOutcome) {
    this.preview = preview;
    this.restore = restore;
  }
}
