/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  CaptureRequest,
  CaptureResult,
  CheckpointList,
  CompareRequest,
  CompareResult,
  DeleteFolderRequest,
  DeleteFolderResult,
  ListRequest,
  PreviewRequest,
  PreviewResult,
  ReadRequest,
  ReadResult,
  RestoreRequest,
  RestoreResult,
  StorageList
} from "@noldova/checkpoints.protocol";

export abstract class CheckpointsService {
  public abstract captureAsync(request: CaptureRequest, signal?: AbortSignal): Promise<CaptureResult>;

  public abstract compareAsync(request: CompareRequest, signal?: AbortSignal): Promise<CompareResult>;

  public abstract deleteFolderAsync(request: DeleteFolderRequest, signal?: AbortSignal): Promise<DeleteFolderResult>;

  public abstract listAsync(request: ListRequest, signal?: AbortSignal): Promise<CheckpointList>;

  public abstract previewRestoreAsync(request: PreviewRequest, signal?: AbortSignal): Promise<PreviewResult>;

  public abstract readAsync(request: ReadRequest, signal?: AbortSignal): Promise<ReadResult>;

  public abstract restoreAsync(request: RestoreRequest, signal?: AbortSignal): Promise<RestoreResult>;

  public abstract storageAsync(signal?: AbortSignal): Promise<StorageList>;
}
