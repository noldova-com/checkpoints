/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { link, lstat, rename, rm } from "node:fs/promises";

import {
  CapturePausedEvent,
  CaptureRequest,
  CaptureResumedEvent,
  CompareRequest,
  DeleteFolderRequest,
  ListRequest,
  PreviewRequest,
  ReadRequest,
  RestoredEvent,
  RestoreHeldUpEvent,
  RestoreRequest,
  StorageRequest
} from "@noldova/checkpoints.protocol";
import type { IRuntimePartContext } from "@noldova/desktop.runtime";

import { Resources } from "../resources.ts";
import { CheckpointsHost } from "./checkpoints-host.ts";
import type { Clock } from "./clock.ts";
import { FreeSpace } from "./free-space.ts";
import { GitBuildLocator } from "./git-build.locator.ts";
import { RestoreJournal } from "./restore-journal.ts";

export class ModuleActivation {
  public static async activateAsync(context: IRuntimePartContext, clock: Clock): Promise<CheckpointsHost> {
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    const restored = context.declareEvent(RestoredEvent.event);
    const heldUp = context.declareEvent(RestoreHeldUpEvent.event);
    const paused = context.declareEvent(CapturePausedEvent.event);
    const resumed = context.declareEvent(CaptureResumedEvent.event);
    const service = new CheckpointsHost(context, build, process.platform, restored, heldUp, paused, resumed, t => new RestoreJournal(t), FreeSpace.hasRoomAsync, link,
      FreeSpace.readAsync, rename, rm, lstat, clock);
    context.publishService(Resources.serviceName, service);
    context.registerMethod(CaptureRequest.method, { handleAsync: async t => (await service.captureAsync(CaptureRequest.fromJson(t.payload), t.signal)).toJson() });
    context.registerMethod(ListRequest.method, { handleAsync: async t => (await service.listAsync(ListRequest.fromJson(t.payload), t.signal)).toJson() });
    context.registerMethod(CompareRequest.method, { handleAsync: async t => (await service.compareAsync(CompareRequest.fromJson(t.payload), t.signal)).toJson() });
    context.registerMethod(PreviewRequest.method, { handleAsync: async t => (await service.previewRestoreAsync(PreviewRequest.fromJson(t.payload), t.signal)).toJson() });
    context.registerMethod(RestoreRequest.method, { handleAsync: async t => (await service.restoreAsync(RestoreRequest.fromJson(t.payload), t.signal)).toJson() });
    context.registerMethod(ReadRequest.method, { handleAsync: async t => (await service.readAsync(ReadRequest.fromJson(t.payload), t.signal)).toJson() });
    context.registerMethod(StorageRequest.method, {
      handleAsync: async t => {
        StorageRequest.fromJson(t.payload);
        return (await service.storageAsync(t.signal)).toJson();
      }
    });
    context.registerMethod(DeleteFolderRequest.method, { handleAsync: async t => (await service.deleteFolderAsync(DeleteFolderRequest.fromJson(t.payload), t.signal)).toJson() });
    service.startSweep();
    service.startGitOnce();
    return service;
  }
}
