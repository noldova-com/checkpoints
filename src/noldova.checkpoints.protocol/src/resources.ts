/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class Resources {
  public static readonly absolutePathPattern: RegExp = /^(?:\/|[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+)/;
  public static readonly actionField: string = "action";
  public static readonly afterField: string = "after";
  public static readonly againstField: string = "against";
  public static readonly arrayExpected: string = "Expected an array.";
  public static readonly base64Alphabet: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  public static readonly base64DigitMask: number = 0x3f;
  public static readonly base64GroupLength: number = 4;
  public static readonly base64Padding: string = "=";
  public static readonly base64Pattern: RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  public static readonly base64TrailingPadding: RegExp = /=+$/;
  public static readonly asOfField: string = "asOf";
  public static readonly beforeField: string = "before";
  public static readonly bitsPerBase64Digit: number = 6;
  public static readonly bitsPerByte: number = 8;
  public static readonly byteMask: number = 0xff;
  public static readonly bytesField: string = "bytes";
  public static readonly bytesToWriteField: string = "bytesToWrite";
  public static readonly captureMethod: string = "checkpoints.capture";
  public static readonly capturePausedEvent: string = "checkpoints.capturePaused";
  public static readonly capturePausedEventModel: string = "CapturePausedEvent";
  public static readonly captureRequestModel: string = "CaptureRequest";
  public static readonly captureResultModel: string = "CaptureResult";
  public static readonly captureResumedEvent: string = "checkpoints.captureResumed";
  public static readonly captureResumedEventModel: string = "CaptureResumedEvent";
  public static readonly changeModel: string = "Change";
  public static readonly changeSideModel: string = "ChangeSide";
  public static readonly changesField: string = "changes";
  public static readonly checkpointField: string = "checkpoint";
  public static readonly checkpointListModel: string = "CheckpointList";
  public static readonly checkpointModel: string = "Checkpoint";
  public static readonly checkpointsField: string = "checkpoints";
  public static readonly codeField: string = "code";
  public static readonly compareMethod: string = "checkpoints.compare";
  public static readonly compareRequestModel: string = "CompareRequest";
  public static readonly compareResultModel: string = "CompareResult";
  public static readonly contentField: string = "content";
  public static readonly contentLimitField: string = "contentLimit";
  public static readonly contentSizeField: string = "contentSize";
  public static readonly currentFolderName: string = ".";
  public static readonly deleteFolderMethod: string = "checkpoints.deleteFolder";
  public static readonly deleteFolderRequestModel: string = "DeleteFolderRequest";
  public static readonly deleteFolderResultModel: string = "DeleteFolderResult";
  public static readonly diffTargetModel: string = "DiffTarget";
  public static readonly earlierPathsField: string = "earlierPaths";
  public static readonly folderField: string = "folder";
  public static readonly folderReferenceModel: string = "FolderReference";
  public static readonly foldersField: string = "folders";
  public static readonly folderUsageModel: string = "FolderUsage";
  public static readonly fromField: string = "from";
  public static readonly idField: string = "id";
  public static readonly identityField: string = "identity";
  public static readonly identityPattern: RegExp = /^[A-Za-z0-9-]{1,64}$/;
  public static readonly invalidBase64: string = "The content is not base64 text.";
  public static readonly invalidIdentity: string = "A folder's identity must be 1 to 64 letters, digits or hyphens.";
  public static readonly invalidTime: string = "A checkpoint's time must be a valid date.";
  public static readonly isCutField: string = "isCut";
  public static readonly isTextField: string = "isText";
  public static readonly keptPathModel: string = "KeptPath";
  public static readonly kindField: string = "kind";
  public static readonly labelField: string = "label";
  public static readonly limitField: string = "limit";
  public static readonly listMethod: string = "checkpoints.list";
  public static readonly listRequestModel: string = "ListRequest";
  public static readonly maximumLabelLength: number = 1_024;
  public static readonly maximumReadLimit: number = 16 * 1024 * 1024;
  public static readonly minimumReadLimit: number = 1;
  public static readonly modeField: string = "mode";
  public static readonly outcomeField: string = "outcome";
  public static readonly parentFolderName: string = "..";
  public static readonly pathField: string = "path";
  public static readonly pathsField: string = "paths";
  public static readonly planField: string = "plan";
  public static readonly previewRequestModel: string = "PreviewRequest";
  public static readonly previewRestoreMethod: string = "checkpoints.previewRestore";
  public static readonly previewResultModel: string = "PreviewResult";
  public static readonly readMethod: string = "checkpoints.read";
  public static readonly readRequestModel: string = "ReadRequest";
  public static readonly readResultModel: string = "ReadResult";
  public static readonly reasonField: string = "reason";
  public static readonly recoveredField: string = "recovered";
  public static readonly relativePathSeparator: string = "/";
  public static readonly restoredEvent: string = "checkpoints.restored";
  public static readonly restoredEventModel: string = "RestoredEvent";
  public static readonly restoreHeldUpEvent: string = "checkpoints.restoreHeldUp";
  public static readonly restoreHeldUpEventModel: string = "RestoreHeldUpEvent";
  public static readonly restoreMethod: string = "checkpoints.restore";
  public static readonly restorePlanModel: string = "RestorePlan";
  public static readonly restoreRequestModel: string = "RestoreRequest";
  public static readonly restoreResultModel: string = "RestoreResult";
  public static readonly restoreStepModel: string = "RestoreStep";
  public static readonly sizeField: string = "size";
  public static readonly spaceFreeField: string = "spaceFree";
  public static readonly spaceNeededField: string = "spaceNeeded";
  public static readonly stateDigestPattern: RegExp = /^[0-9a-f]{64}$/;
  public static readonly stateField: string = "state";
  public static readonly statusField: string = "status";
  public static readonly staysField: string = "stays";
  public static readonly stepsField: string = "steps";
  public static readonly storageListModel: string = "StorageList";
  public static readonly storageMethod: string = "checkpoints.storage";
  public static readonly storageRequestModel: string = "StorageRequest";
  public static readonly timeField: string = "time";
  public static readonly timePattern: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  public static readonly toField: string = "to";
  public static readonly unknownField: string = "The field is not part of this message, which accepts no unknown fields.";
  public static readonly unreadPathModel: string = "UnreadPath";
  public static readonly unreadPathsField: string = "unreadPaths";
  public static readonly unreadReasonField: string = "unreadReason";
  public static readonly versionSevenIdPattern: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  public static readonly windowsPathSeparator: string = "\\";

  public static formatBackslashInPath(value: string): string {
    return `"${value}" is not a path in a restore's scope: its names never hold "\\", which Windows reads as a separator between folders.`;
  }

  public static formatChangeSidesMismatch(status: string): string {
    return `A change has a side before exactly when it isn't Added, and one after exactly when it isn't Deleted, but when it's Unknown; the status is ${status}.`;
  }

  public static formatChangesMismatch(outcome: string): string {
    return `A compare result holds changes only when its outcome is Compared; the outcome is ${outcome}.`;
  }

  public static formatCheckpointMismatch(outcome: string): string {
    return `A capture result holds a checkpoint exactly when its outcome is Captured; the outcome is ${outcome}.`;
  }

  public static formatContentTooLong(length: number, size: number): string {
    return `A read result's content of ${length} bytes is longer than its size, ${size}.`;
  }

  public static formatCutMismatch(isCut: boolean): string {
    return `A read result is cut exactly when its content is shorter than its size; it says isCut is ${isCut}.`;
  }

  public static formatInvalidCheckpointId(value: string): string {
    return `"${value}" is not a checkpoint ID: a lowercase UUID version 7.`;
  }

  public static formatInvalidFolderPath(value: string): string {
    return `"${value}" is not an absolute folder path.`;
  }

  public static formatInvalidReadLimit(value: number): string {
    return `A read's limit is a whole number of bytes from ${Resources.minimumReadLimit} to ${Resources.maximumReadLimit}; this one is ${value}.`;
  }

  public static formatInvalidRelativePath(value: string): string {
    return `"${value}" is not a path inside a folder: its names must be non-empty, never "." or "..", and joined by "/".`;
  }

  public static formatInvalidSize(value: number): string {
    return `A size is a whole number of bytes, 0 or more; this one is ${value}.`;
  }

  public static formatInvalidState(value: string): string {
    return `"${value}" is not a plan's state: a lowercase SHA-256 in hexadecimal.`;
  }

  public static formatInvalidTime(value: string): string {
    return `"${value}" is not a time in UTC with milliseconds, such as 2026-10-18T12:00:00.000Z.`;
  }

  public static formatFieldPath(path: string, field: string): string {
    return `${path}.${field}`;
  }

  public static formatLabelTooLong(length: number): string {
    return `A label has at most ${Resources.maximumLabelLength} characters; this one has ${length}.`;
  }

  public static formatPlanMismatch(outcome: string): string {
    return `A preview result holds a plan exactly when its outcome is Planned; the outcome is ${outcome}.`;
  }

  public static formatReadMismatch(outcome: string): string {
    return `A read result holds content and a size only when its outcome is Read; the outcome is ${outcome}.`;
  }

  public static formatRestoreCheckpointsMismatch(outcome: string): string {
    return `A restore result holds the checkpoint before exactly when its outcome is Restored or RolledBack, and a recovered one only when it is Restored; the outcome is ${outcome}.`;
  }

  public static formatSideSizeMismatch(kind: string): string {
    return `A side has a size exactly when it isn't a folder, and a folder is never text; the kind is ${kind}.`;
  }

  public static formatContentMismatch(outcome: string): string {
    return `A capture result holds the content size and its limit exactly when its outcome is TooLarge; the outcome is ${outcome}.`;
  }

  public static formatEarlierPathsMismatch(path: string): string {
    return `A restore plan names each of its earlier paths once, and only a path one of its steps writes; "${path}" is not.`;
  }

  public static formatSpaceMismatch(outcome: string): string {
    return `A capture result holds the space free and the space needed exactly when its outcome is LowDiskSpace; the outcome is ${outcome}.`;
  }

  public static formatStepSidesMismatch(action: string): string {
    return `A restore step has a side now exactly when it isn't a Write, and one in the checkpoint exactly when it isn't a Delete; the action is ${action}.`;
  }

  public static formatUnknownCaptureMode(value: string): string {
    return `"${value}" is not a known capture mode.`;
  }

  public static formatUnknownCaptureOutcome(value: string): string {
    return `"${value}" is not a known capture outcome.`;
  }

  public static formatUnknownChangeStatus(value: string): string {
    return `"${value}" is not a known change status.`;
  }

  public static formatUnknownCompareOutcome(value: string): string {
    return `"${value}" is not a known compare outcome.`;
  }

  public static formatUnknownDeleteFolderOutcome(value: string): string {
    return `"${value}" is not a known delete outcome.`;
  }

  public static formatUnknownKeepReason(value: string): string {
    return `"${value}" is not a known reason a restore keeps a path.`;
  }

  public static formatUnknownPathKind(value: string): string {
    return `"${value}" is not a known kind of path.`;
  }

  public static formatUnknownPreviewOutcome(value: string): string {
    return `"${value}" is not a known preview outcome.`;
  }

  public static formatUnknownReadOutcome(value: string): string {
    return `"${value}" is not a known read outcome.`;
  }

  public static formatUnknownRestoreAction(value: string): string {
    return `"${value}" is not a known restore action.`;
  }

  public static formatUnknownRestoreOutcome(value: string): string {
    return `"${value}" is not a known restore outcome.`;
  }

  public static formatUnknownUnreadReason(value: string): string {
    return `"${value}" is not a known reason for a path that couldn't be read.`;
  }

  public static formatUnreadCodeMismatch(reason: string): string {
    return `A path that couldn't be read has an error code exactly when its reason is Unreadable; the reason is ${reason}.`;
  }

  public static formatUnreadReasonMismatch(status: string): string {
    return `A change has a reason it couldn't be read exactly when its status is Unknown; the status is ${status}.`;
  }
}
