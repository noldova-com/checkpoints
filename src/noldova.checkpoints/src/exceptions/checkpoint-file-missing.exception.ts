/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class CheckpointFileMissingException extends StoreException {
  public readonly commit: string;

  public constructor(commit: string) {
    super(Resources.formatUnreadableStore(Resources.checkpointFile, Resources.formatMissingObject(commit)));

    this.commit = commit;
  }
}
