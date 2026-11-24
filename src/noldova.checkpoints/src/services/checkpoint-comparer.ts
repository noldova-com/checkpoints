/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { stat } from "node:fs/promises";

import "@noldova/context.core";
import { CompareOutcome, CompareResult, type CaptureMode, type CompareRequest } from "@noldova/checkpoints.protocol";

import type { FolderStore } from "../models/folder-store.ts";
import type { SideListing } from "../models/side-listing.ts";
import type { ChangeDescriber } from "./change-describer.ts";
import { Failures } from "./failures.ts";
import { ListingComparer } from "./listing-comparer.ts";
import type { SideLoader } from "./side-loader.ts";
import { StoreOpener } from "./store-opener.ts";

export class CheckpointComparer {
  private readonly describer: ChangeDescriber;
  private readonly loader: SideLoader;

  public constructor(loader: SideLoader, describer: ChangeDescriber) {
    this.describer = describer;
    this.loader = loader;
  }

  public async compareAsync(store: FolderStore, request: CompareRequest, signal: AbortSignal): Promise<CompareResult> {
    const from = await StoreOpener.existsAsync(store) ? await this.loader.loadCheckpointAsync(store, request.from, signal) : null;
    if (Object.isNull(from))
      return new CompareResult(CompareOutcome.CheckpointMissing, []);

    const to = await this.loadToAsync(store, request, from.record.checkpoint.mode, signal);
    if (to instanceof CompareOutcome)
      return new CompareResult(to, []);
    return new CompareResult(CompareOutcome.Compared, await this.describer.describeAsync(store, request.folder.path, ListingComparer.compare(from.listing, to), signal));
  }

  private async loadToAsync(store: FolderStore, request: CompareRequest, mode: CaptureMode, signal: AbortSignal): Promise<SideListing | CompareOutcome> {
    if (!Object.isNull(request.to))
      return (await this.loader.loadCheckpointAsync(store, request.to, signal))?.listing ?? CompareOutcome.CheckpointMissing;
    if (!await Failures.recoverAsync(stat(request.folder.path).then(t => t.isDirectory()), t => Failures.isAbsent(t), false))
      return CompareOutcome.FolderMissing;
    return await this.loader.loadFolderAsync(store, request.folder.path, mode, signal) ?? CompareOutcome.FolderMissing;
  }
}
