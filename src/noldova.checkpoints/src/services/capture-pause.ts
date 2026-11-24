/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import { CaptureOutcome, CapturePausedEvent, CaptureResumedEvent, type CaptureResult } from "@noldova/checkpoints.protocol";
import { NotificationPost, NotificationSeverity, QualifiedName } from "@noldova/desktop.protocol";
import type { EventChannel, IRuntimePartContext, NotificationHandle } from "@noldova/desktop.runtime";

import { Resources } from "../resources.ts";

export class CapturePause {
  private static readonly KIND: QualifiedName = QualifiedName.parse(Resources.lowDiskSpaceNotification);
  private readonly context: IRuntimePartContext;
  private readonly notifications: Map<string, NotificationHandle> = new Map();
  private readonly paused: EventChannel;
  private readonly resumed: EventChannel;

  public constructor(context: IRuntimePartContext, paused: EventChannel, resumed: EventChannel) {
    this.context = context;
    this.paused = paused;
    this.resumed = resumed;
  }

  public report(identity: string, result: CaptureResult): void {
    const [free, needed] = [result.spaceFree, result.spaceNeeded];
    if (result.outcome === CaptureOutcome.LowDiskSpace && !Object.isNull(free) && !Object.isNull(needed)) {
      this.notifications.set(identity, this.context.postNotification(new NotificationPost(CapturePause.KIND, identity, Resources.lowDiskSpaceTitle,
        Resources.formatLowDiskSpace(free, needed), NotificationSeverity.Warning, null, [], null)));
      this.paused.publish(new CapturePausedEvent(identity, free, needed).toJson());
      return;
    }
    const notification = this.notifications.get(identity);
    if (result.outcome !== CaptureOutcome.Captured || Object.isUndefined(notification))
      return;
    notification.dismiss();
    this.notifications.delete(identity);
    this.resumed.publish(new CaptureResumedEvent(identity).toJson());
  }
}
