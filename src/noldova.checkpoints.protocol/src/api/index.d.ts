/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Exception, type ExceptionOptions } from "@noldova/context.exceptions";
import type { JsonObject } from "@noldova/context.json";

/**
 * The base of the checkpoints protocol's exceptions, thrown when a model is built from values it refuses; JSON that isn't a model's wire
 * form fails with `JsonException` from `@noldova/context.json` instead. Its subclasses: {@link CaptureCheckpointMismatchException}, {@link
 * CaptureSpaceMismatchException}, {@link ChangeSidesMismatchException}, {@link CompareChangesMismatchException}, {@link
 * ContentTooLongException}, {@link InvalidBase64Exception}, {@link InvalidCheckpointIdException}, {@link InvalidDateException}, {@link
 * InvalidFolderPathException}, {@link InvalidIdentityException}, {@link InvalidPlanStateException}, {@link InvalidReadLimitException},
 * {@link InvalidRelativePathException}, {@link InvalidSizeException}, {@link InvalidTimeException}, {@link LabelTooLongException}, {@link
 * PreviewPlanMismatchException}, {@link ReadCutMismatchException}, {@link ReadOutcomeMismatchException}, {@link
 * RestoreCheckpointsMismatchException}, {@link SideSizeMismatchException}, {@link StepSidesMismatchException}, {@link
 * UnknownCaptureModeException}, {@link UnknownCaptureOutcomeException}, {@link UnknownChangeStatusException}, {@link
 * UnknownCompareOutcomeException}, {@link UnknownDeleteFolderOutcomeException}, {@link UnknownKeepReasonException}, {@link
 * UnknownPathKindException}, {@link UnknownPreviewOutcomeException}, {@link UnknownReadOutcomeException}, {@link
 * UnknownRestoreActionException}, {@link UnknownRestoreOutcomeException}, {@link UnknownUnreadReasonException}, {@link
 * UnreadCodeMismatchException}, {@link UnreadReasonMismatchException}.
 *
 * @example
 * ```ts
 * import { FolderReference, ProtocolException } from "@noldova/checkpoints.protocol";
 *
 * try {
 *   new FolderReference("project 1", "/work/project");
 * }
 * catch (error) {
 *   console.log(error instanceof ProtocolException);
 * }
 * ```
 */
export declare abstract class ProtocolException extends Exception {
  /**
   * Initializes the message and the cause for a subclass.
   *
   * @param message The exception's message.
   * @param options The failure that caused it, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when a capture result holds a checkpoint other than exactly when its outcome is Captured.
 */
export declare class CaptureCheckpointMismatchException extends ProtocolException {
  /**
   * The outcome the result was given.
   */
  public readonly outcome: CaptureOutcome;

  /**
   * Formats the exception's message from its facts.
   *
   * @param outcome The outcome the result was given.
   * @example
   * ```ts
   * import { CaptureCheckpointMismatchException, CaptureOutcome } from "@noldova/checkpoints.protocol";
   *
   * const exception = new CaptureCheckpointMismatchException(CaptureOutcome.FolderMissing);
   * console.log(exception.message, exception.outcome);
   * ```
   */
  public constructor(outcome: CaptureOutcome);
}

/**
 * Thrown when a capture result holds the space free and the space needed other than exactly when its outcome is LowDiskSpace.
 */
export declare class CaptureSpaceMismatchException extends ProtocolException {
  /**
   * The outcome the result was given.
   */
  public readonly outcome: CaptureOutcome;

  /**
   * Formats the exception's message from its facts.
   *
   * @param outcome The outcome the result was given.
   * @example
   * ```ts
   * import { CaptureOutcome, CaptureSpaceMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new CaptureSpaceMismatchException(CaptureOutcome.Captured);
   * console.log(exception.message, exception.outcome);
   * ```
   */
  public constructor(outcome: CaptureOutcome);
}

/**
 * Thrown when a change's sides don't fit its status.
 */
export declare class ChangeSidesMismatchException extends ProtocolException {
  /**
   * The status the change was given.
   */
  public readonly status: ChangeStatus;

  /**
   * Formats the exception's message from its facts.
   *
   * @param status The status the change was given.
   * @example
   * ```ts
   * import { ChangeSidesMismatchException, ChangeStatus } from "@noldova/checkpoints.protocol";
   *
   * const exception = new ChangeSidesMismatchException(ChangeStatus.Added);
   * console.log(exception.message, exception.status);
   * ```
   */
  public constructor(status: ChangeStatus);
}

/**
 * Thrown when a compare result holds changes though its outcome isn't Compared.
 */
export declare class CompareChangesMismatchException extends ProtocolException {
  /**
   * The outcome the result was given.
   */
  public readonly outcome: CompareOutcome;

  /**
   * Formats the exception's message from its facts.
   *
   * @param outcome The outcome the result was given.
   * @example
   * ```ts
   * import { CompareChangesMismatchException, CompareOutcome } from "@noldova/checkpoints.protocol";
   *
   * const exception = new CompareChangesMismatchException(CompareOutcome.FolderMissing);
   * console.log(exception.message, exception.outcome);
   * ```
   */
  public constructor(outcome: CompareOutcome);
}

/**
 * Thrown when a read result's content is longer than its size.
 */
export declare class ContentTooLongException extends ProtocolException {
  /**
   * The content's length, in bytes.
   */
  public readonly length: number;

  /**
   * The size the result was given, in bytes.
   */
  public readonly size: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param length The content's length, in bytes.
   * @param size The size the result was given, in bytes.
   * @example
   * ```ts
   * import { ContentTooLongException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new ContentTooLongException(3, 2);
   * console.log(exception.message, exception.length, exception.size);
   * ```
   */
  public constructor(length: number, size: number);
}

/**
 * Thrown when a read result's wire content isn't padded base64 text.
 */
export declare class InvalidBase64Exception extends ProtocolException {
  /**
   * Formats the exception's message.
   * @example
   * ```ts
   * import { InvalidBase64Exception } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidBase64Exception();
   * console.log(exception.message);
   * ```
   */
  public constructor();
}

/**
 * Thrown when a checkpoint's id isn't a lowercase UUID of version 7.
 */
export declare class InvalidCheckpointIdException extends ProtocolException {
  /**
   * The id refused.
   */
  public readonly id: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param id The id refused.
   * @example
   * ```ts
   * import { InvalidCheckpointIdException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidCheckpointIdException("a");
   * console.log(exception.message, exception.id);
   * ```
   */
  public constructor(id: string);
}

/**
 * Thrown when a checkpoint's time is a date that isn't valid, which it couldn't write.
 */
export declare class InvalidDateException extends ProtocolException {
  /**
   * Formats the exception's message.
   * @example
   * ```ts
   * import { InvalidDateException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidDateException();
   * console.log(exception.message);
   * ```
   */
  public constructor();
}

/**
 * Thrown when a folder's path isn't absolute.
 */
export declare class InvalidFolderPathException extends ProtocolException {
  /**
   * The path refused.
   */
  public readonly path: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param path The path refused.
   * @example
   * ```ts
   * import { InvalidFolderPathException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidFolderPathException("project");
   * console.log(exception.message, exception.path);
   * ```
   */
  public constructor(path: string);
}

/**
 * Thrown when a folder's identity isn't 1 to 64 letters, digits or hyphens.
 */
export declare class InvalidIdentityException extends ProtocolException {
  /**
   * The identity refused.
   */
  public readonly identity: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param identity The identity refused.
   * @example
   * ```ts
   * import { InvalidIdentityException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidIdentityException("project 1");
   * console.log(exception.message, exception.identity);
   * ```
   */
  public constructor(identity: string);
}

/**
 * Thrown when a plan's state isn't a lowercase SHA-256 in hexadecimal.
 */
export declare class InvalidPlanStateException extends ProtocolException {
  /**
   * The state refused.
   */
  public readonly state: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param state The state refused.
   * @example
   * ```ts
   * import { InvalidPlanStateException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidPlanStateException("x");
   * console.log(exception.message, exception.state);
   * ```
   */
  public constructor(state: string);
}

/**
 * Thrown when a read's limit isn't a whole number of bytes from 1 to 16 MiB.
 */
export declare class InvalidReadLimitException extends ProtocolException {
  /**
   * The limit refused.
   */
  public readonly limit: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param limit The limit refused.
   * @example
   * ```ts
   * import { InvalidReadLimitException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidReadLimitException(0);
   * console.log(exception.message, exception.limit);
   * ```
   */
  public constructor(limit: number);
}

/**
 * Thrown when a path inside a folder has an empty name, `.` or `..`, or, in a restore's scope, a `\`.
 */
export declare class InvalidRelativePathException extends ProtocolException {
  /**
   * The path refused.
   */
  public readonly path: string;

  /**
   * Formats the exception's message from its facts: one for a path that breaks only the `\` rule, which names that rule, and one
   * for a path that breaks the rules of its names.
   *
   * @param path The path refused.
   * @example
   * ```ts
   * import { InvalidRelativePathException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidRelativePathException("a//b");
   * console.log(exception.message, exception.path);
   * ```
   */
  public constructor(path: string);
}

/**
 * Thrown when a size isn't a whole number of bytes, 0 or more.
 */
export declare class InvalidSizeException extends ProtocolException {
  /**
   * The size refused.
   */
  public readonly size: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param size The size refused.
   * @example
   * ```ts
   * import { InvalidSizeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidSizeException(-1);
   * console.log(exception.message, exception.size);
   * ```
   */
  public constructor(size: number);
}

/**
 * Thrown when a checkpoint's wire time isn't a time in UTC with milliseconds.
 */
export declare class InvalidTimeException extends ProtocolException {
  /**
   * The time's text refused.
   */
  public readonly time: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param time The time's text refused.
   * @example
   * ```ts
   * import { InvalidTimeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new InvalidTimeException("2026-10-18T12:00:00Z");
   * console.log(exception.message, exception.time);
   * ```
   */
  public constructor(time: string);
}

/**
 * Thrown when a label is longer than 1,024 characters.
 */
export declare class LabelTooLongException extends ProtocolException {
  /**
   * The label's length, in characters.
   */
  public readonly length: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param length The label's length, in characters.
   * @example
   * ```ts
   * import { LabelTooLongException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new LabelTooLongException(1_025);
   * console.log(exception.message, exception.length);
   * ```
   */
  public constructor(length: number);
}

/**
 * Thrown when a preview result holds a plan other than exactly when its outcome is Planned.
 */
export declare class PreviewPlanMismatchException extends ProtocolException {
  /**
   * The outcome the result was given.
   */
  public readonly outcome: PreviewOutcome;

  /**
   * Formats the exception's message from its facts.
   *
   * @param outcome The outcome the result was given.
   * @example
   * ```ts
   * import { PreviewOutcome, PreviewPlanMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new PreviewPlanMismatchException(PreviewOutcome.HeldUp);
   * console.log(exception.message, exception.outcome);
   * ```
   */
  public constructor(outcome: PreviewOutcome);
}

/**
 * Thrown when a read result's wire form says it is cut other than exactly when its content is shorter than its size.
 */
export declare class ReadCutMismatchException extends ProtocolException {
  /**
   * Whether the wire form says the content is cut.
   */
  public readonly isCut: boolean;

  /**
   * Formats the exception's message from its facts.
   *
   * @param isCut Whether the wire form says the content is cut.
   * @example
   * ```ts
   * import { ReadCutMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new ReadCutMismatchException(true);
   * console.log(exception.message, exception.isCut);
   * ```
   */
  public constructor(isCut: boolean);
}

/**
 * Thrown when a read result holds content or a size though its outcome isn't Read.
 */
export declare class ReadOutcomeMismatchException extends ProtocolException {
  /**
   * The outcome the result was given.
   */
  public readonly outcome: ReadOutcome;

  /**
   * Formats the exception's message from its facts.
   *
   * @param outcome The outcome the result was given.
   * @example
   * ```ts
   * import { ReadOutcome, ReadOutcomeMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new ReadOutcomeMismatchException(ReadOutcome.PathMissing);
   * console.log(exception.message, exception.outcome);
   * ```
   */
  public constructor(outcome: ReadOutcome);
}

/**
 * Thrown when a restore result holds the checkpoint before or a recovered one against its outcome.
 */
export declare class RestoreCheckpointsMismatchException extends ProtocolException {
  /**
   * The outcome the result was given.
   */
  public readonly outcome: RestoreOutcome;

  /**
   * Formats the exception's message from its facts.
   *
   * @param outcome The outcome the result was given.
   * @example
   * ```ts
   * import { RestoreCheckpointsMismatchException, RestoreOutcome } from "@noldova/checkpoints.protocol";
   *
   * const exception = new RestoreCheckpointsMismatchException(RestoreOutcome.MovedOn);
   * console.log(exception.message, exception.outcome);
   * ```
   */
  public constructor(outcome: RestoreOutcome);
}

/**
 * Thrown when a side has a size other than exactly when it isn't a folder, or is a folder taken as text.
 */
export declare class SideSizeMismatchException extends ProtocolException {
  /**
   * The kind the side was given.
   */
  public readonly kind: PathKind;

  /**
   * Formats the exception's message from its facts.
   *
   * @param kind The kind the side was given.
   * @example
   * ```ts
   * import { PathKind, SideSizeMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new SideSizeMismatchException(PathKind.Folder);
   * console.log(exception.message, exception.kind);
   * ```
   */
  public constructor(kind: PathKind);
}

/**
 * Thrown when a restore step's sides don't fit its action.
 */
export declare class StepSidesMismatchException extends ProtocolException {
  /**
   * The action the step was given.
   */
  public readonly action: RestoreAction;

  /**
   * Formats the exception's message from its facts.
   *
   * @param action The action the step was given.
   * @example
   * ```ts
   * import { RestoreAction, StepSidesMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new StepSidesMismatchException(RestoreAction.Write);
   * console.log(exception.message, exception.action);
   * ```
   */
  public constructor(action: RestoreAction);
}

/**
 * Thrown when a wire value names no capture mode.
 */
export declare class UnknownCaptureModeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownCaptureModeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownCaptureModeException("everyFile");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no capture outcome.
 */
export declare class UnknownCaptureOutcomeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownCaptureOutcomeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownCaptureOutcomeException("Paused");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no change status.
 */
export declare class UnknownChangeStatusException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownChangeStatusException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownChangeStatusException("Renamed");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no compare outcome.
 */
export declare class UnknownCompareOutcomeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownCompareOutcomeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownCompareOutcomeException("Paused");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no delete outcome.
 */
export declare class UnknownDeleteFolderOutcomeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownDeleteFolderOutcomeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownDeleteFolderOutcomeException("Missing");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no reason a restore keeps a path.
 */
export declare class UnknownKeepReasonException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownKeepReasonException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownKeepReasonException("Locked");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no kind of path.
 */
export declare class UnknownPathKindException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownPathKindException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownPathKindException("Socket");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no preview outcome.
 */
export declare class UnknownPreviewOutcomeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownPreviewOutcomeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownPreviewOutcomeException("Compared");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no read outcome.
 */
export declare class UnknownReadOutcomeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownReadOutcomeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownReadOutcomeException("Cut");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no restore action.
 */
export declare class UnknownRestoreActionException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownRestoreActionException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownRestoreActionException("Move");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no restore outcome.
 */
export declare class UnknownRestoreOutcomeException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownRestoreOutcomeException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownRestoreOutcomeException("Planned");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a wire value names no reason for a path that couldn't be read.
 */
export declare class UnknownUnreadReasonException extends ProtocolException {
  /**
   * The wire value, as text.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The wire value, as text.
   * @example
   * ```ts
   * import { UnknownUnreadReasonException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnknownUnreadReasonException("Locked");
   * console.log(exception.message, exception.value);
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a path that couldn't be read has an error code other than exactly when its reason is Unreadable.
 */
export declare class UnreadCodeMismatchException extends ProtocolException {
  /**
   * The reason the path was given.
   */
  public readonly reason: UnreadReason;

  /**
   * Formats the exception's message from its facts.
   *
   * @param reason The reason the path was given.
   * @example
   * ```ts
   * import { UnreadCodeMismatchException, UnreadReason } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnreadCodeMismatchException(UnreadReason.Denied);
   * console.log(exception.message, exception.reason);
   * ```
   */
  public constructor(reason: UnreadReason);
}

/**
 * Thrown when a change has a reason it couldn't be read other than exactly when its status is Unknown.
 */
export declare class UnreadReasonMismatchException extends ProtocolException {
  /**
   * The status the change was given.
   */
  public readonly status: ChangeStatus;

  /**
   * Formats the exception's message from its facts.
   *
   * @param status The status the change was given.
   * @example
   * ```ts
   * import { ChangeStatus, UnreadReasonMismatchException } from "@noldova/checkpoints.protocol";
   *
   * const exception = new UnreadReasonMismatchException(ChangeStatus.Modified);
   * console.log(exception.message, exception.status);
   * ```
   */
  public constructor(status: ChangeStatus);
}

/**
 * Which files a checkpoint keeps.
 */
export declare class CaptureMode {
  /**
   * Every file, link and folder but each `.git`.
   */
  public static readonly EveryFile: CaptureMode;

  /**
   * Every file, link and folder that the folder's `.gitignore` files don't ignore, matched as Git matches them, and never a `.git`.
   */
  public static readonly IgnoreFiles: CaptureMode;

  /**
   * The mode's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads a mode from its wire value.
   *
   * @param value The wire value.
   * @returns The mode.
   * @throws {ProtocolException} Thrown synchronously when the value names no mode.
   * @example
   * ```ts
   * import { CaptureMode } from "@noldova/checkpoints.protocol";
   *
   * console.log(CaptureMode.fromJson("EveryFile") === CaptureMode.EveryFile);
   * ```
   */
  public static fromJson(value: unknown): CaptureMode;

  /**
   * @returns The mode's wire value.
   * @example
   * ```ts
   * import { CaptureMode } from "@noldova/checkpoints.protocol";
   *
   * console.log(CaptureMode.IgnoreFiles.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * Whether a capture took a checkpoint, and why not when it didn't.
 */
export declare class CaptureOutcome {
  /**
   * The capture took a checkpoint.
   */
  public static readonly Captured: CaptureOutcome;

  /**
   * The folder's path is missing, so no checkpoint was taken; a missing folder is never captured as empty.
   */
  public static readonly FolderMissing: CaptureOutcome;

  /**
   * A restore of the folder is running, or was interrupted and couldn't be rolled back, so no checkpoint was taken.
   */
  public static readonly HeldUp: CaptureOutcome;

  /**
   * The store's volume lacks the space the checkpoint needs, 2 GiB beyond what it adds, before or while its content is written, so no
   * checkpoint was taken; the result says the space free and the space needed.
   */
  public static readonly LowDiskSpace: CaptureOutcome;

  /**
   * Whether the capture took a checkpoint.
   */
  public readonly isCaptured: boolean;

  /**
   * The outcome's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an outcome from its wire value.
   *
   * @param value The wire value.
   * @returns The outcome.
   * @throws {ProtocolException} Thrown synchronously when the value names no outcome.
   * @example
   * ```ts
   * import { CaptureOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(CaptureOutcome.fromJson("Captured") === CaptureOutcome.Captured);
   * ```
   */
  public static fromJson(value: unknown): CaptureOutcome;

  /**
   * @returns The outcome's wire value.
   * @example
   * ```ts
   * import { CaptureOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(CaptureOutcome.LowDiskSpace.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * Why a checkpoint keeps no content for a path.
 */
export declare class UnreadReason {
  /**
   * The file kept changing while it was read, three times in all.
   */
  public static readonly Changing: UnreadReason;

  /**
   * The system wouldn't let the module read the path.
   */
  public static readonly Denied: UnreadReason;

  /**
   * The name isn't valid Unicode, so the API can't name it; the path is shown with replacement characters.
   */
  public static readonly InvalidName: UnreadReason;

  /**
   * The system gave an error reading the path that is about this one path only, such as a name too long for it, a network share that timed out,
   * or a cloud file that isn't on the computer; {@link UnreadPath.code} holds the error's code.
   */
  public static readonly Unreadable: UnreadReason;

  /**
   * The reason's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads a reason from its wire value.
   *
   * @param value The wire value.
   * @returns The reason.
   * @throws {ProtocolException} Thrown synchronously when the value names no reason.
   * @example
   * ```ts
   * import { UnreadReason } from "@noldova/checkpoints.protocol";
   *
   * console.log(UnreadReason.fromJson("Denied") === UnreadReason.Denied);
   * ```
   */
  public static fromJson(value: unknown): UnreadReason;

  /**
   * @returns The reason's wire value.
   * @example
   * ```ts
   * import { UnreadReason } from "@noldova/checkpoints.protocol";
   *
   * console.log(UnreadReason.Unreadable.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * A path a checkpoint keeps no content for, and why; a restore of the checkpoint leaves the path as it is.
 */
export declare class UnreadPath {
  /**
   * The path, relative to the folder, with `/` between names.
   */
  public readonly path: string;

  /**
   * Why the checkpoint keeps no content for it.
   */
  public readonly reason: UnreadReason;

  /**
   * The system's error code, such as `ENAMETOOLONG`, when the reason is {@link UnreadReason.Unreadable}; otherwise `null`. The wire form
   * always holds the code, as `null` when there is none, and a wire form without it is refused.
   */
  public readonly code: string | null;

  /**
   * @param path The path, relative to the folder, with `/` between names.
   * @param reason Why the checkpoint keeps no content for it.
   * @param code The system's error code when the reason is {@link UnreadReason.Unreadable}; otherwise `null`.
   * @throws {ProtocolException} Thrown synchronously when the path has an empty name, `.` or `..`, or it has a code other than exactly when
   * its reason is {@link UnreadReason.Unreadable}.
   * @example
   * ```ts
   * import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";
   *
   * const path = new UnreadPath("docs/report.pdf", UnreadReason.Unreadable, "ETIMEDOUT");
   * console.log(path.code);
   * ```
   */
  public constructor(path: string, reason: UnreadReason, code: string | null);

  /**
   * Reads a path from its wire form.
   *
   * @param value The wire form.
   * @returns The path.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a path: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { UnreadPath } from "@noldova/checkpoints.protocol";
   *
   * const path = UnreadPath.fromJson({ path: "src/main.ts", reason: "Denied", code: null });
   * console.log(path.reason.value);
   * ```
   */
  public static fromJson(value: unknown): UnreadPath;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";
   *
   * const path = new UnreadPath("docs/report.pdf", UnreadReason.Unreadable, "ETIMEDOUT");
   * console.log(JSON.stringify(path.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * A checkpoint: a folder's files as they were when it was taken.
 */
export declare class Checkpoint {
  /**
   * The checkpoint's id, a UUID of version 7, so that ids sort by the time they were taken.
   */
  public readonly id: string;

  /**
   * The label the app attached, of up to 1,024 characters, or `null`.
   */
  public readonly label: string | null;

  /**
   * Which files the checkpoint keeps.
   */
  public readonly mode: CaptureMode;

  /**
   * When the capture started.
   */
  public readonly time: Date;

  /**
   * The paths the checkpoint keeps no content for, with why.
   */
  public readonly unreadPaths: readonly UnreadPath[];

  /**
   * @param id The checkpoint's id, a UUID of version 7.
   * @param time When the capture started.
   * @param mode Which files the checkpoint keeps.
   * @param label The label the app attached, or `null`.
   * @param unreadPaths The paths the checkpoint keeps no content for.
   * @throws {ProtocolException} Thrown synchronously when the id isn't a UUID of version 7, the time isn't a valid date, or the label is
   * longer than 1,024 characters.
   * @example
   * ```ts
   * import { CaptureMode, Checkpoint } from "@noldova/checkpoints.protocol";
   *
   * const checkpoint = new Checkpoint("01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f", new Date(), CaptureMode.EveryFile, "Turn 3", []);
   * console.log(checkpoint.toJson());
   * ```
   */
  public constructor(id: string, time: Date, mode: CaptureMode, label: string | null, unreadPaths: readonly UnreadPath[]);

  /**
   * Reads a checkpoint from its wire form, whose time is an ISO 8601 text in UTC.
   *
   * @param value The wire form.
   * @returns The checkpoint.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a checkpoint: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { Checkpoint } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const checkpoint = Checkpoint.fromJson({ id: id, time: "2026-10-18T12:00:00.000Z", mode: "EveryFile", label: "Turn 3", unreadPaths: [] });
   * console.log(checkpoint.time.toISOString());
   * ```
   */
  public static fromJson(value: unknown): Checkpoint;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CaptureMode, Checkpoint } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const checkpoint = new Checkpoint(id, new Date("2026-10-18T12:00:00.000Z"), CaptureMode.EveryFile, null, []);
   * console.log(JSON.stringify(checkpoint.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * A folder as the app names it: the identity its checkpoints are kept under, so a moved folder keeps them, and where it is now.
 */
export declare class FolderReference {
  /**
   * The identity the app owns, 1 to 64 letters, digits and `-`, such as a project's id.
   */
  public readonly identity: string;

  /**
   * The folder's absolute path on this device now.
   */
  public readonly path: string;

  /**
   * @param identity The identity the app owns.
   * @param path The folder's absolute path on this device now.
   * @throws {ProtocolException} Thrown synchronously when the identity isn't 1 to 64 letters, digits and `-`, or the path isn't absolute.
   * @example
   * ```ts
   * import { FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * console.log(folder.identity);
   * ```
   */
  public constructor(identity: string, path: string);

  /**
   * Reads a folder from its wire form.
   *
   * @param value The wire form.
   * @returns The folder.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a folder: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const folder = FolderReference.fromJson({ identity: "project-1", path: "/work/project" });
   * console.log(folder.path);
   * ```
   */
  public static fromJson(value: unknown): FolderReference;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * console.log(JSON.stringify(folder.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The request of `checkpoints.capture`: take a checkpoint of a folder.
 */
export declare class CaptureRequest {
  /**
   * The method's name, `"checkpoints.capture"`.
   */
  public static readonly method: string;

  /**
   * The folder to take a checkpoint of.
   */
  public readonly folder: FolderReference;

  /**
   * The label to attach, or `null`.
   */
  public readonly label: string | null;

  /**
   * @param folder The folder to take a checkpoint of.
   * @param label The label to attach, of up to 1,024 characters, or `null`.
   * @throws {ProtocolException} Thrown synchronously when the label is longer than 1,024 characters.
   * @example
   * ```ts
   * import { CaptureRequest, FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const request = new CaptureRequest(new FolderReference("project-1", "/work/project"), "Turn 3");
   * console.log(CaptureRequest.method, request.toJson());
   * ```
   */
  public constructor(folder: FolderReference, label: string | null);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CaptureRequest } from "@noldova/checkpoints.protocol";
   *
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = CaptureRequest.fromJson({ folder: folderJson, label: null });
   * console.log(request.label);
   * ```
   */
  public static fromJson(value: unknown): CaptureRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CaptureRequest, FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new CaptureRequest(folder, "Turn 3");
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a capture did: the checkpoint it took, or why it took none, with the space free and the space needed when it took none for want
 * of space.
 */
export declare class CaptureResult {
  /**
   * The checkpoint taken, or `null` when none was.
   */
  public readonly checkpoint: Checkpoint | null;

  /**
   * Whether the capture took a checkpoint.
   */
  public readonly outcome: CaptureOutcome;

  /**
   * The bytes free on the store's volume for the module, when the outcome is `LowDiskSpace`, or `null`.
   */
  public readonly spaceFree: number | null;

  /**
   * The bytes the checkpoint needed free, when the outcome is `LowDiskSpace`, or `null`.
   */
  public readonly spaceNeeded: number | null;

  /**
   * @param outcome Whether the capture took a checkpoint.
   * @param checkpoint The checkpoint taken, or `null` when none was.
   * @param spaceFree The bytes free, when the outcome is `LowDiskSpace`, or `null`.
   * @param spaceNeeded The bytes needed, when the outcome is `LowDiskSpace`, or `null`.
   * @throws {ProtocolException} Thrown synchronously when the outcome and the checkpoint or the space disagree, or a size isn't a whole
   * number of bytes.
   * @example
   * ```ts
   * import { CaptureOutcome, CaptureResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new CaptureResult(CaptureOutcome.LowDiskSpace, null, 1_073_741_824, 3_221_225_472);
   * console.log(result.spaceNeeded);
   * ```
   */
  public constructor(outcome: CaptureOutcome, checkpoint: Checkpoint | null, spaceFree: number | null, spaceNeeded: number | null);

  /**
   * Reads a result from its wire form.
   *
   * @param value The wire form.
   * @returns The result.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a result: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CaptureResult } from "@noldova/checkpoints.protocol";
   *
   * const result = CaptureResult.fromJson({ outcome: "FolderMissing", checkpoint: null, spaceFree: null, spaceNeeded: null });
   * console.log(result.outcome.isCaptured);
   * ```
   */
  public static fromJson(value: unknown): CaptureResult;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CaptureOutcome, CaptureResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new CaptureResult(CaptureOutcome.LowDiskSpace, null, 1_073_741_824, 3_221_225_472);
   * console.log(JSON.stringify(result.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The request of `checkpoints.list`: a folder's checkpoints.
 */
export declare class ListRequest {
  /**
   * The method's name, `"checkpoints.list"`.
   */
  public static readonly method: string;

  /**
   * The folder whose checkpoints to list.
   */
  public readonly folder: FolderReference;

  /**
   * @param folder The folder whose checkpoints to list.
   * @example
   * ```ts
   * import { FolderReference, ListRequest } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new ListRequest(folder);
   * console.log(ListRequest.method);
   * ```
   */
  public constructor(folder: FolderReference);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { ListRequest } from "@noldova/checkpoints.protocol";
   *
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = ListRequest.fromJson({ folder: folderJson });
   * console.log(request.folder.path);
   * ```
   */
  public static fromJson(value: unknown): ListRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { FolderReference, ListRequest } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new ListRequest(folder);
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * A folder's checkpoints, newest first.
 */
export declare class CheckpointList {
  /**
   * The checkpoints, newest first.
   */
  public readonly checkpoints: readonly Checkpoint[];

  /**
   * @param checkpoints The checkpoints, newest first.
   * @example
   * ```ts
   * import { CheckpointList } from "@noldova/checkpoints.protocol";
   *
   * const list = new CheckpointList([]);
   * console.log(list.checkpoints.length);
   * ```
   */
  public constructor(checkpoints: readonly Checkpoint[]);

  /**
   * Reads a list from its wire form.
   *
   * @param value The wire form.
   * @returns The list.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a list: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CheckpointList } from "@noldova/checkpoints.protocol";
   *
   * const list = CheckpointList.fromJson({ checkpoints: [] });
   * console.log(list.checkpoints.length);
   * ```
   */
  public static fromJson(value: unknown): CheckpointList;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CheckpointList } from "@noldova/checkpoints.protocol";
   *
   * const list = new CheckpointList([]);
   * console.log(JSON.stringify(list.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a path is on one side of a change.
 */
export declare class PathKind {
  /**
   * A file.
   */
  public static readonly File: PathKind;

  /**
   * A file its owner may run; Windows keeps no such mode, so there every file is a {@link PathKind.File}.
   */
  public static readonly Executable: PathKind;

  /**
   * A link, which is never followed.
   */
  public static readonly Link: PathKind;

  /**
   * A folder.
   */
  public static readonly Folder: PathKind;

  /**
   * The kind's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads a kind from its wire value.
   *
   * @param value The wire value.
   * @returns The kind.
   * @throws {ProtocolException} Thrown synchronously when the value names no kind.
   * @example
   * ```ts
   * import { PathKind } from "@noldova/checkpoints.protocol";
   *
   * console.log(PathKind.fromJson("File") === PathKind.File);
   * ```
   */
  public static fromJson(value: unknown): PathKind;

  /**
   * @returns The kind's wire value.
   * @example
   * ```ts
   * import { PathKind } from "@noldova/checkpoints.protocol";
   *
   * console.log(PathKind.Folder.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * How a path changed from one side of a comparison to the other.
 */
export declare class ChangeStatus {
  /**
   * The path is only on the side after.
   */
  public static readonly Added: ChangeStatus;

  /**
   * The path is only on the side before.
   */
  public static readonly Deleted: ChangeStatus;

  /**
   * The path's content changed, or it became executable or stopped being so.
   */
  public static readonly Modified: ChangeStatus;

  /**
   * The path changed between a file, a link and a folder.
   */
  public static readonly KindChanged: ChangeStatus;

  /**
   * A side couldn't read the path, so whether it changed is unknown; such a path is never reported as deleted.
   */
  public static readonly Unknown: ChangeStatus;

  /**
   * The status's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads a status from its wire value.
   *
   * @param value The wire value.
   * @returns The status.
   * @throws {ProtocolException} Thrown synchronously when the value names no status.
   * @example
   * ```ts
   * import { ChangeStatus } from "@noldova/checkpoints.protocol";
   *
   * console.log(ChangeStatus.fromJson("Added") === ChangeStatus.Added);
   * ```
   */
  public static fromJson(value: unknown): ChangeStatus;

  /**
   * @returns The status's wire value.
   * @example
   * ```ts
   * import { ChangeStatus } from "@noldova/checkpoints.protocol";
   *
   * console.log(ChangeStatus.KindChanged.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * A path as one side of a change has it.
 */
export declare class ChangeSide {
  /**
   * Whether Git would take the content as text: no NUL in its first 8,000 bytes, and at most 32 MiB. A folder is never text.
   */
  public readonly isText: boolean;

  /**
   * What the path is.
   */
  public readonly kind: PathKind;

  /**
   * The content's size in bytes, a link's being its target's, or `null` for a folder.
   */
  public readonly size: number | null;

  /**
   * @param kind What the path is.
   * @param size The content's size in bytes, or `null` for a folder.
   * @param isText Whether Git would take the content as text.
   * @throws {ProtocolException} Thrown synchronously when a folder has a size or is text, another kind has none, or the size isn't a whole
   * number of 0 or more.
   * @example
   * ```ts
   * import { ChangeSide, PathKind } from "@noldova/checkpoints.protocol";
   *
   * const side = new ChangeSide(PathKind.File, 1_024, true);
   * console.log(side.size);
   * ```
   */
  public constructor(kind: PathKind, size: number | null, isText: boolean);

  /**
   * Reads a side from its wire form.
   *
   * @param value The wire form.
   * @returns The side.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a side: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { ChangeSide } from "@noldova/checkpoints.protocol";
   *
   * const side = ChangeSide.fromJson({ kind: "Folder", size: null, isText: false });
   * console.log(side.kind.value);
   * ```
   */
  public static fromJson(value: unknown): ChangeSide;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { ChangeSide, PathKind } from "@noldova/checkpoints.protocol";
   *
   * const side = new ChangeSide(PathKind.File, 1_024, true);
   * console.log(JSON.stringify(side.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * One path that differs between the two sides of a comparison.
 */
export declare class Change {
  /**
   * The path on the side after, or `null` when it's only before, or unknown there.
   */
  public readonly after: ChangeSide | null;

  /**
   * The path on the side before, or `null` when it's only after, or unknown there.
   */
  public readonly before: ChangeSide | null;

  /**
   * The path, relative to the folder, with `/` between names.
   */
  public readonly path: string;

  /**
   * How the path changed.
   */
  public readonly status: ChangeStatus;

  /**
   * Why a side couldn't read the path, for a change whose status is {@link ChangeStatus.Unknown}; otherwise `null`.
   */
  public readonly unreadReason: UnreadReason | null;

  /**
   * @param path The path, relative to the folder, with `/` between names.
   * @param status How the path changed.
   * @param before The path on the side before, or `null`.
   * @param after The path on the side after, or `null`.
   * @param unreadReason Why a side couldn't read the path, or `null`.
   * @throws {ProtocolException} Thrown synchronously when the path has an empty name, `.` or `..`, the sides don't fit the status, or the
   * reason is given exactly when the status isn't {@link ChangeStatus.Unknown}.
   * @example
   * ```ts
   * import { Change, ChangeSide, ChangeStatus, PathKind } from "@noldova/checkpoints.protocol";
   *
   * const change = new Change("src/main.ts", ChangeStatus.Added, null, new ChangeSide(PathKind.File, 12, true), null);
   * console.log(change.status.value);
   * ```
   */
  public constructor(path: string, status: ChangeStatus, before: ChangeSide | null, after: ChangeSide | null, unreadReason: UnreadReason | null);

  /**
   * Reads a change from its wire form.
   *
   * @param value The wire form.
   * @returns The change.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a change: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { Change } from "@noldova/checkpoints.protocol";
   *
   * const change = Change.fromJson({ path: "notes.txt", status: "Deleted", before: { kind: "File", size: 3, isText: true }, after: null, unreadReason: null });
   * console.log(change.before?.size);
   * ```
   */
  public static fromJson(value: unknown): Change;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { Change, ChangeSide, ChangeStatus, PathKind } from "@noldova/checkpoints.protocol";
   *
   * const change = new Change("src/main.ts", ChangeStatus.Added, null, new ChangeSide(PathKind.File, 12, true), null);
   * console.log(JSON.stringify(change.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * Whether a comparison compared, and why not when it didn't.
 */
export declare class CompareOutcome {
  /**
   * The comparison compared the two sides.
   */
  public static readonly Compared: CompareOutcome;

  /**
   * The comparison was with the folder now, and the folder's path is missing; a missing folder is never compared as empty.
   */
  public static readonly FolderMissing: CompareOutcome;

  /**
   * The folder has no checkpoint with an id the request gave.
   */
  public static readonly CheckpointMissing: CompareOutcome;

  /**
   * Whether the comparison compared.
   */
  public readonly isCompared: boolean;

  /**
   * The outcome's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an outcome from its wire value.
   *
   * @param value The wire value.
   * @returns The outcome.
   * @throws {ProtocolException} Thrown synchronously when the value names no outcome.
   * @example
   * ```ts
   * import { CompareOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(CompareOutcome.fromJson("Compared") === CompareOutcome.Compared);
   * ```
   */
  public static fromJson(value: unknown): CompareOutcome;

  /**
   * @returns The outcome's wire value.
   * @example
   * ```ts
   * import { CompareOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(CompareOutcome.CheckpointMissing.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * The request of `checkpoints.compare`: the changes from one of a folder's checkpoints to another, or to the folder now.
 */
export declare class CompareRequest {
  /**
   * The method's name, `"checkpoints.compare"`.
   */
  public static readonly method: string;

  /**
   * The folder whose checkpoints to compare.
   */
  public readonly folder: FolderReference;

  /**
   * The id of the checkpoint the changes start from.
   */
  public readonly from: string;

  /**
   * The id of the checkpoint the changes lead to, or `null` for the folder now.
   */
  public readonly to: string | null;

  /**
   * @param folder The folder whose checkpoints to compare.
   * @param from The id of the checkpoint the changes start from.
   * @param to The id of the checkpoint the changes lead to, or `null` for the folder now.
   * @throws {ProtocolException} Thrown synchronously when an id isn't a UUID of version 7.
   * @example
   * ```ts
   * import { CompareRequest, FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const request = new CompareRequest(new FolderReference("project-1", "/work/project"), "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f", null);
   * console.log(CompareRequest.method, request.toJson());
   * ```
   */
  public constructor(folder: FolderReference, from: string, to: string | null);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CompareRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const other = "01928f6e-7a3c-7c4d-8e5f-0a1b2c3d4e5f";
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = CompareRequest.fromJson({ folder: folderJson, from: id, to: other });
   * console.log(request.to);
   * ```
   */
  public static fromJson(value: unknown): CompareRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CompareRequest, FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new CompareRequest(folder, id, null);
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a comparison found: the changes, or why it compared nothing.
 */
export declare class CompareResult {
  /**
   * The changes, in their paths' byte order; none when the outcome isn't {@link CompareOutcome.Compared}.
   */
  public readonly changes: readonly Change[];

  /**
   * Whether the comparison compared.
   */
  public readonly outcome: CompareOutcome;

  /**
   * @param outcome Whether the comparison compared.
   * @param changes The changes.
   * @throws {ProtocolException} Thrown synchronously when an outcome other than {@link CompareOutcome.Compared} has changes.
   * @example
   * ```ts
   * import { CompareOutcome, CompareResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new CompareResult(CompareOutcome.CheckpointMissing, []);
   * console.log(result.outcome.isCompared);
   * ```
   */
  public constructor(outcome: CompareOutcome, changes: readonly Change[]);

  /**
   * Reads a result from its wire form.
   *
   * @param value The wire form.
   * @returns The result.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a result: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CompareResult } from "@noldova/checkpoints.protocol";
   *
   * const result = CompareResult.fromJson({ outcome: "Compared", changes: [] });
   * console.log(result.changes.length);
   * ```
   */
  public static fromJson(value: unknown): CompareResult;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CompareOutcome, CompareResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new CompareResult(CompareOutcome.CheckpointMissing, []);
   * console.log(JSON.stringify(result.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a read's line diff compares the file with.
 */
export declare class DiffTarget {
  /**
   * The id of the checkpoint whose file the diff leads to, or `null` for the file in the folder now.
   */
  public readonly checkpoint: string | null;

  /**
   * @param checkpoint The id of the checkpoint whose file the diff leads to, or `null` for the folder now.
   * @throws {ProtocolException} Thrown synchronously when the id isn't a UUID of version 7.
   * @example
   * ```ts
   * import { DiffTarget } from "@noldova/checkpoints.protocol";
   *
   * const target = new DiffTarget(null);
   * console.log(target.checkpoint);
   * ```
   */
  public constructor(checkpoint: string | null);

  /**
   * Reads a target from its wire form.
   *
   * @param value The wire form.
   * @returns The target.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a target: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { DiffTarget } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const target = DiffTarget.fromJson({ checkpoint: id });
   * console.log(target.checkpoint);
   * ```
   */
  public static fromJson(value: unknown): DiffTarget;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { DiffTarget } from "@noldova/checkpoints.protocol";
   *
   * const target = new DiffTarget(null);
   * console.log(JSON.stringify(target.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * Whether a read gave content, and why not when it didn't.
 */
export declare class ReadOutcome {
  /**
   * The read gave the content, or the line diff.
   */
  public static readonly Read: ReadOutcome;

  /**
   * The diff was with the folder now, and the folder's path is missing.
   */
  public static readonly FolderMissing: ReadOutcome;

  /**
   * The folder has no checkpoint with an id the request gave.
   */
  public static readonly CheckpointMissing: ReadOutcome;

  /**
   * No side holds the path as a file or a link.
   */
  public static readonly PathMissing: ReadOutcome;

  /**
   * A side couldn't read the path.
   */
  public static readonly Unknown: ReadOutcome;

  /**
   * A side of the diff isn't text, so it has no line diff.
   */
  public static readonly Binary: ReadOutcome;

  /**
   * Whether the read gave content.
   */
  public readonly isRead: boolean;

  /**
   * The outcome's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an outcome from its wire value.
   *
   * @param value The wire value.
   * @returns The outcome.
   * @throws {ProtocolException} Thrown synchronously when the value names no outcome.
   * @example
   * ```ts
   * import { ReadOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(ReadOutcome.fromJson("Read") === ReadOutcome.Read);
   * ```
   */
  public static fromJson(value: unknown): ReadOutcome;

  /**
   * @returns The outcome's wire value.
   * @example
   * ```ts
   * import { ReadOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(ReadOutcome.Binary.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * The request of `checkpoints.read`: one file's content at a checkpoint, or its line diff from that checkpoint to a target.
 */
export declare class ReadRequest {
  /**
   * The method's name, `"checkpoints.read"`.
   */
  public static readonly method: string;

  /**
   * What the line diff leads to, or `null` for the file's content.
   */
  public readonly against: DiffTarget | null;

  /**
   * The id of the checkpoint to read the file at, where the line diff starts.
   */
  public readonly checkpoint: string;

  /**
   * The folder whose checkpoint to read.
   */
  public readonly folder: FolderReference;

  /**
   * The most bytes to give, from 1 to 16 MiB; a line diff is cut at its last whole line within it.
   */
  public readonly limit: number;

  /**
   * The file's path, relative to the folder, with `/` between names.
   */
  public readonly path: string;

  /**
   * @param folder The folder whose checkpoint to read.
   * @param checkpoint The id of the checkpoint to read the file at.
   * @param path The file's path, relative to the folder, with `/` between names.
   * @param against What the line diff leads to, or `null` for the file's content.
   * @param limit The most bytes to give, from 1 to 16 MiB.
   * @throws {ProtocolException} Thrown synchronously when the id isn't a UUID of version 7, the path has an empty name, `.` or `..`, or the
   * limit isn't a whole number from 1 to 16 MiB.
   * @example
   * ```ts
   * import { DiffTarget, FolderReference, ReadRequest } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new ReadRequest(folder, "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f", "src/main.ts", new DiffTarget(null), 65536);
   * console.log(ReadRequest.method, request.toJson());
   * ```
   */
  public constructor(folder: FolderReference, checkpoint: string, path: string, against: DiffTarget | null, limit: number);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { ReadRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = ReadRequest.fromJson({ folder: folderJson, checkpoint: id, path: "src/main.ts", against: null, limit: 1 });
   * console.log(request.against);
   * ```
   */
  public static fromJson(value: unknown): ReadRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { DiffTarget, FolderReference, ReadRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new ReadRequest(folder, id, "src/main.ts", new DiffTarget(null), 65_536);
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a read gave: the bytes up to the request's limit, and the size of the whole, or why it gave none. The wire form holds the
 * bytes as base64 text.
 */
export declare class ReadResult {
  /**
   * The file's bytes, or the line diff's, as Git writes it from its first `@@` line; empty when the outcome isn't {@link ReadOutcome.Read}.
   */
  public readonly content: Uint8Array;

  /**
   * Whether the read gave content.
   */
  public readonly outcome: ReadOutcome;

  /**
   * The size in bytes of the whole file or line diff, of which the content may be only the start.
   */
  public readonly size: number;

  /**
   * @param outcome Whether the read gave content.
   * @param content The bytes up to the request's limit.
   * @param size The size in bytes of the whole.
   * @throws {ProtocolException} Thrown synchronously when an outcome other than {@link ReadOutcome.Read} has content or a size, the size
   * isn't a whole number of 0 or more, or the content is longer than the size.
   * @example
   * ```ts
   * import { ReadOutcome, ReadResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new ReadResult(ReadOutcome.Read, new Uint8Array([104, 105]), 5);
   * console.log(result.isCut);
   * ```
   */
  public constructor(outcome: ReadOutcome, content: Uint8Array, size: number);

  /**
   * Whether the content is only the start of the whole, cut at the request's limit.
   * @example
   * ```ts
   * import { ReadOutcome, ReadResult } from "@noldova/checkpoints.protocol";
   *
   * console.log(new ReadResult(ReadOutcome.Read, new Uint8Array([104, 105]), 2).isCut);
   * ```
   */
  public get isCut(): boolean;

  /**
   * Reads a result from its wire form.
   *
   * @param value The wire form.
   * @returns The result.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a result: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses, such as content that isn't base64 text.
   * @example
   * ```ts
   * import { ReadResult } from "@noldova/checkpoints.protocol";
   *
   * const result = ReadResult.fromJson({ outcome: "Read", content: "aGk=", isCut: false, size: 2 });
   * console.log(result.content.length);
   * ```
   */
  public static fromJson(value: unknown): ReadResult;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { ReadOutcome, ReadResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new ReadResult(ReadOutcome.Read, new Uint8Array([104, 105]), 5);
   * console.log(JSON.stringify(result.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a restore does to one path.
 */
export declare class RestoreAction {
  /**
   * The checkpoint holds the path and the folder now doesn't, so the restore writes it.
   */
  public static readonly Write: RestoreAction;

  /**
   * Both hold the path, with other content or another kind, so the restore replaces it.
   */
  public static readonly Replace: RestoreAction;

  /**
   * The folder now holds the path and the checkpoint doesn't, so the restore deletes it.
   */
  public static readonly Delete: RestoreAction;

  /**
   * The action's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an action from its wire value.
   *
   * @param value The wire value.
   * @returns The action.
   * @throws {ProtocolException} Thrown synchronously when the value names no action.
   * @example
   * ```ts
   * import { RestoreAction } from "@noldova/checkpoints.protocol";
   *
   * console.log(RestoreAction.fromJson("Write") === RestoreAction.Write);
   * ```
   */
  public static fromJson(value: unknown): RestoreAction;

  /**
   * @returns The action's wire value.
   * @example
   * ```ts
   * import { RestoreAction } from "@noldova/checkpoints.protocol";
   *
   * console.log(RestoreAction.Delete.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * Why a restore leaves a path as it is.
 */
export declare class KeepReason {
  /**
   * The path is a `.git`, or a name Git treats as one, which a restore never reads, writes, replaces or deletes.
   */
  public static readonly Repository: KeepReason;

  /**
   * The path is a folder that holds a `.git` at any depth, which a restore never moves, replaces, renames or removes; the files
   * inside it are restored each on its own.
   */
  public static readonly RepositoryFolder: KeepReason;

  /**
   * The checkpoint followed the ignore files, and its rules or the folder's current ones ignore the path.
   */
  public static readonly Ignored: KeepReason;

  /**
   * The checkpoint couldn't read the path, so it keeps no content for it.
   */
  public static readonly Unread: KeepReason;

  /**
   * The path is a link, and this system won't let the module create one.
   */
  public static readonly LinkUnsupported: KeepReason;

  /**
   * The reason's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads a reason from its wire value.
   *
   * @param value The wire value.
   * @returns The reason.
   * @throws {ProtocolException} Thrown synchronously when the value names no reason.
   * @example
   * ```ts
   * import { KeepReason } from "@noldova/checkpoints.protocol";
   *
   * console.log(KeepReason.fromJson("Repository") === KeepReason.Repository);
   * ```
   */
  public static fromJson(value: unknown): KeepReason;

  /**
   * @returns The reason's wire value.
   * @example
   * ```ts
   * import { KeepReason } from "@noldova/checkpoints.protocol";
   *
   * console.log(KeepReason.LinkUnsupported.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * One path a restore changes: what it does, and the path's side now and in the checkpoint.
 */
export declare class RestoreStep {
  /**
   * What the restore does to the path.
   */
  public readonly action: RestoreAction;

  /**
   * The path in the checkpoint, or `null` for a {@link RestoreAction.Delete}.
   */
  public readonly after: ChangeSide | null;

  /**
   * The path in the folder now, or `null` for a {@link RestoreAction.Write}.
   */
  public readonly before: ChangeSide | null;

  /**
   * The path, relative to the folder, with `/` between its names.
   */
  public readonly path: string;

  /**
   * @param path The path, relative to the folder.
   * @param action What the restore does to the path.
   * @param before The path in the folder now, or `null` for a write.
   * @param after The path in the checkpoint, or `null` for a delete.
   * @throws {ProtocolException} Thrown synchronously when the path isn't relative to the folder, or a side is missing or present against the action.
   * @example
   * ```ts
   * import { ChangeSide, PathKind, RestoreAction, RestoreStep } from "@noldova/checkpoints.protocol";
   *
   * const step = new RestoreStep("src/main.ts", RestoreAction.Write, null, new ChangeSide(PathKind.File, 12, true));
   * console.log(step.action.value);
   * ```
   */
  public constructor(path: string, action: RestoreAction, before: ChangeSide | null, after: ChangeSide | null);

  /**
   * Reads a step from its wire form.
   *
   * @param value The wire form.
   * @returns The step.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a step: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { RestoreStep } from "@noldova/checkpoints.protocol";
   *
   * const step = RestoreStep.fromJson({ path: "old.txt", action: "Delete", before: { kind: "File", size: 3, isText: true }, after: null });
   * console.log(step.after);
   * ```
   */
  public static fromJson(value: unknown): RestoreStep;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { ChangeSide, PathKind, RestoreAction, RestoreStep } from "@noldova/checkpoints.protocol";
   *
   * const step = new RestoreStep("src/main.ts", RestoreAction.Write, null, new ChangeSide(PathKind.File, 12, true));
   * console.log(JSON.stringify(step.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * One path a restore leaves as it is, and why.
 */
export declare class KeptPath {
  /**
   * The path, relative to the folder, with `/` between its names.
   */
  public readonly path: string;

  /**
   * Why the restore leaves it.
   */
  public readonly reason: KeepReason;

  /**
   * @param path The path, relative to the folder.
   * @param reason Why the restore leaves it.
   * @throws {ProtocolException} Thrown synchronously when the path isn't relative to the folder.
   * @example
   * ```ts
   * import { KeepReason, KeptPath } from "@noldova/checkpoints.protocol";
   *
   * const kept = new KeptPath(".git", KeepReason.Repository);
   * console.log(kept.reason.value);
   * ```
   */
  public constructor(path: string, reason: KeepReason);

  /**
   * Reads a kept path from its wire form.
   *
   * @param value The wire form.
   * @returns The kept path.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a kept path: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { KeptPath } from "@noldova/checkpoints.protocol";
   *
   * const kept = KeptPath.fromJson({ path: "vendor/lib/.git", reason: "RepositoryFolder" });
   * console.log(kept.path);
   * ```
   */
  public static fromJson(value: unknown): KeptPath;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { KeepReason, KeptPath } from "@noldova/checkpoints.protocol";
   *
   * const kept = new KeptPath(".git", KeepReason.Repository);
   * console.log(JSON.stringify(kept.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * A restore's plan: what it writes, replaces and deletes, what stays as it is and why, the space it needs, and the state of the
 * folder it was planned on. A restore carries out a plan only while the folder is still in that state.
 */
export declare class RestorePlan {
  /**
   * The bytes the restore writes into the folder.
   */
  public readonly bytesToWrite: number;

  /**
   * The id of the checkpoint the plan restores.
   */
  public readonly checkpoint: string;

  /**
   * The paths the restore is limited to, as its preview asked, or `null` for the whole folder; the restore plans again with them. The
   * wire form always holds the paths, as `null` for the whole folder, and a wire form without them is refused.
   */
  public readonly paths: readonly string[] | null;

  /**
   * The free space in bytes the restore needs, on the folder's volume and the store's together.
   */
  public readonly spaceNeeded: number;

  /**
   * The SHA-256 of the folder's state when planned, in lowercase hexadecimal: each planned path's state and each folder's file id on
   * its way from the root.
   */
  public readonly state: string;

  /**
   * The paths that stay as they are, in their paths' byte order.
   */
  public readonly stays: readonly KeptPath[];

  /**
   * The paths the restore changes, in their paths' byte order.
   */
  public readonly steps: readonly RestoreStep[];

  /**
   * @param checkpoint The id of the checkpoint the plan restores, a lowercase UUID version 7.
   * @param steps The paths the restore changes.
   * @param stays The paths that stay as they are.
   * @param bytesToWrite The bytes the restore writes.
   * @param spaceNeeded The free space in bytes the restore needs.
   * @param state The SHA-256 of the folder's state when planned.
   * @param paths The paths the restore is limited to, or `null` for the whole folder.
   * @throws {ProtocolException} Thrown synchronously when the id isn't a lowercase UUID version 7, a size isn't a whole number of 0 or
   * more, the state isn't a lowercase SHA-256 in hexadecimal, or a path has an empty name, "." or "..", or holds "\" on any system.
   * @example
   * ```ts
   * import { KeepReason, KeptPath, RestorePlan } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const state = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
   * const plan = new RestorePlan(id, [], [new KeptPath(".git", KeepReason.Repository)], 0, 0, state, null);
   * console.log(plan.paths);
   * ```
   */
  public constructor(
    checkpoint: string, steps: readonly RestoreStep[], stays: readonly KeptPath[], bytesToWrite: number, spaceNeeded: number, state: string,
    paths: readonly string[] | null);

  /**
   * Reads a plan from its wire form.
   *
   * @param value The wire form.
   * @returns The plan.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a plan: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { RestorePlan } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const state = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
   * const plan = RestorePlan.fromJson({ checkpoint: id, steps: [], stays: [], bytesToWrite: 0, spaceNeeded: 0, state, paths: ["src"] });
   * console.log(plan.paths);
   * ```
   */
  public static fromJson(value: unknown): RestorePlan;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { KeepReason, KeptPath, RestorePlan } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const state = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
   * const plan = new RestorePlan(id, [], [new KeptPath(".git", KeepReason.Repository)], 0, 0, state, null);
   * console.log(JSON.stringify(plan.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * Whether a preview gave a plan, and why not when it didn't.
 */
export declare class PreviewOutcome {
  /**
   * The preview gave a plan.
   */
  public static readonly Planned: PreviewOutcome;

  /**
   * The folder's store holds no checkpoint with that id.
   */
  public static readonly CheckpointMissing: PreviewOutcome;

  /**
   * The folder's path is missing.
   */
  public static readonly FolderMissing: PreviewOutcome;

  /**
   * A restore of the folder is running, or was interrupted and couldn't be rolled back.
   */
  public static readonly HeldUp: PreviewOutcome;

  /**
   * Whether the preview gave a plan.
   */
  public readonly isPlanned: boolean;

  /**
   * The outcome's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an outcome from its wire value.
   *
   * @param value The wire value.
   * @returns The outcome.
   * @throws {ProtocolException} Thrown synchronously when the value names no outcome.
   * @example
   * ```ts
   * import { PreviewOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(PreviewOutcome.fromJson("Planned") === PreviewOutcome.Planned);
   * ```
   */
  public static fromJson(value: unknown): PreviewOutcome;

  /**
   * @returns The outcome's wire value.
   * @example
   * ```ts
   * import { PreviewOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(PreviewOutcome.HeldUp.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * The parameters of `checkpoints.previewRestore`: the folder, the checkpoint to plan a restore of, and the paths the restore is limited
 * to, if any.
 */
export declare class PreviewRequest {
  /**
   * The method's name, `"checkpoints.previewRestore"`.
   */
  public static readonly method: string;

  /**
   * The id of the checkpoint to restore.
   */
  public readonly checkpoint: string;

  /**
   * The folder to restore.
   */
  public readonly folder: FolderReference;

  /**
   * The paths the restore is limited to, relative to the folder with "/" between names, or `null` for the whole folder. Each must equal
   * the module's own path for it exactly, as a comparison gives it, letter case and Unicode normalisation included; one holding "\"
   * is refused on every system. The wire form always holds the paths, as `null` for the whole folder, and a wire form without them is
   * refused. The plan changes only paths at or under one of them, and a folder above one that the checkpoint holds as a folder and the
   * folder now holds as something else; everything else stays as it is now and is left out of the plan's state.
   */
  public readonly paths: readonly string[] | null;

  /**
   * @param folder The folder to restore.
   * @param checkpoint The id of the checkpoint to restore, a lowercase UUID version 7.
   * @param paths The paths the restore is limited to, or `null` for the whole folder.
   * @throws {ProtocolException} Thrown synchronously when the id isn't a lowercase UUID version 7, or a path has an empty name, "." or
   * "..", or holds "\" on any system.
   * @example
   * ```ts
   * import { FolderReference, PreviewRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new PreviewRequest(folder, id, ["src/main.ts"]);
   * console.log(request.paths);
   * ```
   */
  public constructor(folder: FolderReference, checkpoint: string, paths: readonly string[] | null);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { PreviewRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = PreviewRequest.fromJson({ folder: folderJson, checkpoint: id, paths: null });
   * console.log(request.paths);
   * ```
   */
  public static fromJson(value: unknown): PreviewRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { FolderReference, PreviewRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new PreviewRequest(folder, id, ["src/main.ts"]);
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a preview gave: the plan, or why it gave none.
 */
export declare class PreviewResult {
  /**
   * Whether the preview gave a plan.
   */
  public readonly outcome: PreviewOutcome;

  /**
   * The plan, or `null` when the outcome isn't {@link PreviewOutcome.Planned}.
   */
  public readonly plan: RestorePlan | null;

  /**
   * @param outcome Whether the preview gave a plan.
   * @param plan The plan, or `null`.
   * @throws {ProtocolException} Thrown synchronously when the result holds a plan other than exactly when its outcome is {@link
   * PreviewOutcome.Planned}.
   * @example
   * ```ts
   * import { PreviewOutcome, PreviewResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new PreviewResult(PreviewOutcome.HeldUp, null);
   * console.log(result.outcome.isPlanned);
   * ```
   */
  public constructor(outcome: PreviewOutcome, plan: RestorePlan | null);

  /**
   * Reads a result from its wire form.
   *
   * @param value The wire form.
   * @returns The result.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a result: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { PreviewResult } from "@noldova/checkpoints.protocol";
   *
   * const result = PreviewResult.fromJson({ outcome: "FolderMissing", plan: null });
   * console.log(result.plan);
   * ```
   */
  public static fromJson(value: unknown): PreviewResult;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { PreviewOutcome, PreviewResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new PreviewResult(PreviewOutcome.HeldUp, null);
   * console.log(JSON.stringify(result.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * Whether a restore finished, and why not when it didn't.
 */
export declare class RestoreOutcome {
  /**
   * The folder holds the checkpoint's files, apart from the paths the plan keeps.
   */
  public static readonly Restored: RestoreOutcome;

  /**
   * The folder has changed since the plan, so nothing was changed; a fresh preview gives a plan for the folder now.
   */
  public static readonly MovedOn: RestoreOutcome;

  /**
   * The folder's store holds no checkpoint with the plan's id.
   */
  public static readonly CheckpointMissing: RestoreOutcome;

  /**
   * The folder's path is missing.
   */
  public static readonly FolderMissing: RestoreOutcome;

  /**
   * The folder's volume or the store's lacks the space the restore needs, so nothing was changed.
   */
  public static readonly LowDiskSpace: RestoreOutcome;

  /**
   * Another restore of the folder is running, or was interrupted and couldn't be rolled back.
   */
  public static readonly HeldUp: RestoreOutcome;

  /**
   * The restore started, then put every path back as it was before it: another program wrote a path it was changing, or a step
   * failed.
   */
  public static readonly RolledBack: RestoreOutcome;

  /**
   * Whether the restore finished.
   */
  public readonly isRestored: boolean;

  /**
   * The outcome's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an outcome from its wire value.
   *
   * @param value The wire value.
   * @returns The outcome.
   * @throws {ProtocolException} Thrown synchronously when the value names no outcome.
   * @example
   * ```ts
   * import { RestoreOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(RestoreOutcome.fromJson("Restored") === RestoreOutcome.Restored);
   * ```
   */
  public static fromJson(value: unknown): RestoreOutcome;

  /**
   * @returns The outcome's wire value.
   * @example
   * ```ts
   * import { RestoreOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(RestoreOutcome.RolledBack.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * The parameters of `checkpoints.restore`: the folder and the plan the person accepted.
 */
export declare class RestoreRequest {
  /**
   * The method's name, `"checkpoints.restore"`.
   */
  public static readonly method: string;

  /**
   * The folder to restore.
   */
  public readonly folder: FolderReference;

  /**
   * The plan the person accepted, as its preview gave it.
   */
  public readonly plan: RestorePlan;

  /**
   * @param folder The folder to restore.
   * @param plan The plan the person accepted.
   * @example
   * ```ts
   * import { FolderReference, RestorePlan, RestoreRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const state = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new RestoreRequest(folder, new RestorePlan(id, [], [], 0, 0, state, null));
   * console.log(RestoreRequest.method);
   * ```
   */
  public constructor(folder: FolderReference, plan: RestorePlan);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { RestoreRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const state = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = RestoreRequest.fromJson({ folder: folderJson, plan: { checkpoint: id, steps: [], stays: [], bytesToWrite: 0, spaceNeeded: 0, state, paths: null } });
   * console.log(request.plan.checkpoint);
   * ```
   */
  public static fromJson(value: unknown): RestoreRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { FolderReference, RestorePlan, RestoreRequest } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const state = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new RestoreRequest(folder, new RestorePlan(id, [], [], 0, 0, state, null));
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a restore did: its outcome, the checkpoint taken before it, which is the person's undo, and any checkpoint that keeps what
 * another program wrote while it ran.
 */
export declare class RestoreResult {
  /**
   * The checkpoint taken before the restore, or `null` when the outcome is neither {@link RestoreOutcome.Restored} nor
   * {@link RestoreOutcome.RolledBack}.
   */
  public readonly before: Checkpoint | null;

  /**
   * Whether the restore finished.
   */
  public readonly outcome: RestoreOutcome;

  /**
   * The checkpoint, labelled as recovered after the restore, that keeps the paths another program changed while they were moved
   * aside, or `null` when there were none or the outcome isn't {@link RestoreOutcome.Restored}.
   */
  public readonly recovered: Checkpoint | null;

  /**
   * @param outcome Whether the restore finished.
   * @param before The checkpoint taken before the restore, or `null`.
   * @param recovered The checkpoint that keeps what another program wrote, or `null`.
   * @throws {ProtocolException} Thrown synchronously when the result holds a checkpoint before other than exactly when its outcome is
   * {@link RestoreOutcome.Restored} or {@link RestoreOutcome.RolledBack}, or a recovered one when it isn't Restored.
   * @example
   * ```ts
   * import { RestoreOutcome, RestoreResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new RestoreResult(RestoreOutcome.MovedOn, null, null);
   * console.log(result.outcome.isRestored);
   * ```
   */
  public constructor(outcome: RestoreOutcome, before: Checkpoint | null, recovered: Checkpoint | null);

  /**
   * Reads a result from its wire form.
   *
   * @param value The wire form.
   * @returns The result.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a result: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { RestoreResult } from "@noldova/checkpoints.protocol";
   *
   * const result = RestoreResult.fromJson({ outcome: "HeldUp", before: null, recovered: null });
   * console.log(result.before);
   * ```
   */
  public static fromJson(value: unknown): RestoreResult;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { RestoreOutcome, RestoreResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new RestoreResult(RestoreOutcome.MovedOn, null, null);
   * console.log(JSON.stringify(result.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * A request for every folder's space used, the `checkpoints.storage` method; it names no folder.
 */
export declare class StorageRequest {
  /**
   * The method's name, `"checkpoints.storage"`.
   */
  public static readonly method: string;

  /**
   * Creates the request, which names no folder.
   * @example
   * ```ts
   * import { StorageRequest } from "@noldova/checkpoints.protocol";
   *
   * const request = new StorageRequest();
   * console.log(StorageRequest.method);
   * ```
   */
  public constructor();

  /**
   * Reads a request from its wire form, an empty object.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { StorageRequest } from "@noldova/checkpoints.protocol";
   *
   * const request = StorageRequest.fromJson({});
   * console.log(request.toJson());
   * ```
   */
  public static fromJson(value: unknown): StorageRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { StorageRequest } from "@noldova/checkpoints.protocol";
   *
   * const request = new StorageRequest();
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * One folder's space used.
 */
export declare class FolderUsage {
  /**
   * The sum of the sizes of the folder's store's files, in bytes, as they were while the store was read: a capture or the store's
   * housekeeping running then may change it at once.
   */
  public readonly bytes: number;

  /**
   * The identity the folder's checkpoints are kept under.
   */
  public readonly identity: string;

  /**
   * The folder's absolute path at its last capture, or `null` when the store can't say.
   */
  public readonly path: string | null;

  /**
   * @param identity The identity, 1 to 64 letters, digits and `-`.
   * @param path The folder's absolute path at its last capture, or `null`.
   * @param bytes The space used, a whole number of bytes, 0 or more.
   * @throws {ProtocolException} Thrown synchronously when the identity, the path or the size isn't valid.
   * @example
   * ```ts
   * import { FolderUsage } from "@noldova/checkpoints.protocol";
   *
   * const usage = new FolderUsage("project-1", "/work/project", 4_096);
   * console.log(usage.bytes);
   * ```
   */
  public constructor(identity: string, path: string | null, bytes: number);

  /**
   * Reads a folder's space used from its wire form.
   *
   * @param value The wire form.
   * @returns The folder's space used.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a folder's space used: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { FolderUsage } from "@noldova/checkpoints.protocol";
   *
   * const usage = FolderUsage.fromJson({ identity: "project-1", path: null, bytes: 0 });
   * console.log(usage.path);
   * ```
   */
  public static fromJson(value: unknown): FolderUsage;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { FolderUsage } from "@noldova/checkpoints.protocol";
   *
   * const usage = new FolderUsage("project-1", "/work/project", 4_096);
   * console.log(JSON.stringify(usage.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * Every folder's space used, the answer to `checkpoints.storage`.
 */
export declare class StorageList {
  /**
   * The folders, the largest first, and folders of the same size by identity.
   */
  public readonly folders: readonly FolderUsage[];

  /**
   * @param folders The folders, the largest first.
   * @example
   * ```ts
   * import { FolderUsage, StorageList } from "@noldova/checkpoints.protocol";
   *
   * const list = new StorageList([new FolderUsage("project-1", "/work/project", 4_096)]);
   * console.log(list.folders.length);
   * ```
   */
  public constructor(folders: readonly FolderUsage[]);

  /**
   * Reads a list from its wire form.
   *
   * @param value The wire form.
   * @returns The list.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a list: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { StorageList } from "@noldova/checkpoints.protocol";
   *
   * const list = StorageList.fromJson({ folders: [{ identity: "project-1", path: null, bytes: 0 }] });
   * console.log(list.folders[0]?.bytes);
   * ```
   */
  public static fromJson(value: unknown): StorageList;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { FolderUsage, StorageList } from "@noldova/checkpoints.protocol";
   *
   * const list = new StorageList([new FolderUsage("project-1", "/work/project", 4_096)]);
   * console.log(JSON.stringify(list.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * How a folder's delete ended.
 */
export declare class DeleteFolderOutcome {
  /**
   * The folder's checkpoints are deleted, or it had none; its next capture starts a new store.
   */
  public static readonly Deleted: DeleteFolderOutcome;

  /**
   * A restore of the folder was interrupted and can't be finished or undone yet, so nothing was deleted: its journal is what puts the
   * folder's files right.
   */
  public static readonly HeldUp: DeleteFolderOutcome;

  /**
   * The outcome's wire value.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads an outcome from its wire value.
   *
   * @param value The wire value.
   * @returns The outcome.
   * @throws {ProtocolException} Thrown synchronously when the value names no outcome.
   * @example
   * ```ts
   * import { DeleteFolderOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(DeleteFolderOutcome.fromJson("Deleted") === DeleteFolderOutcome.Deleted);
   * ```
   */
  public static fromJson(value: unknown): DeleteFolderOutcome;

  /**
   * @returns The outcome's wire value.
   * @example
   * ```ts
   * import { DeleteFolderOutcome } from "@noldova/checkpoints.protocol";
   *
   * console.log(DeleteFolderOutcome.HeldUp.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * A request to delete all of a folder's checkpoints, the `checkpoints.deleteFolder` method.
 */
export declare class DeleteFolderRequest {
  /**
   * The method's name, `"checkpoints.deleteFolder"`.
   */
  public static readonly method: string;

  /**
   * The folder whose checkpoints to delete; its path is where an interrupted restore of it is finished or undone first.
   */
  public readonly folder: FolderReference;

  /**
   * @param folder The folder whose checkpoints to delete.
   * @example
   * ```ts
   * import { DeleteFolderRequest, FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new DeleteFolderRequest(folder);
   * console.log(DeleteFolderRequest.method);
   * ```
   */
  public constructor(folder: FolderReference);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form.
   * @returns The request.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a request: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { DeleteFolderRequest } from "@noldova/checkpoints.protocol";
   *
   * const folderJson = { identity: "project-1", path: "/work/project" };
   * const request = DeleteFolderRequest.fromJson({ folder: folderJson });
   * console.log(request.folder.identity);
   * ```
   */
  public static fromJson(value: unknown): DeleteFolderRequest;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { DeleteFolderRequest, FolderReference } from "@noldova/checkpoints.protocol";
   *
   * const folder = new FolderReference("project-1", "/work/project");
   * const request = new DeleteFolderRequest(folder);
   * console.log(JSON.stringify(request.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * What a folder's delete did, the answer to `checkpoints.deleteFolder`.
 */
export declare class DeleteFolderResult {
  /**
   * How the delete ended.
   */
  public readonly outcome: DeleteFolderOutcome;

  /**
   * @param outcome How the delete ended.
   * @example
   * ```ts
   * import { DeleteFolderOutcome, DeleteFolderResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new DeleteFolderResult(DeleteFolderOutcome.Deleted);
   * console.log(result.outcome.value);
   * ```
   */
  public constructor(outcome: DeleteFolderOutcome);

  /**
   * Reads a result from its wire form.
   *
   * @param value The wire form.
   * @returns The result.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of a result: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { DeleteFolderResult } from "@noldova/checkpoints.protocol";
   *
   * const result = DeleteFolderResult.fromJson({ outcome: "HeldUp" });
   * console.log(result.outcome.value);
   * ```
   */
  public static fromJson(value: unknown): DeleteFolderResult;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { DeleteFolderOutcome, DeleteFolderResult } from "@noldova/checkpoints.protocol";
   *
   * const result = new DeleteFolderResult(DeleteFolderOutcome.Deleted);
   * console.log(JSON.stringify(result.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The payload of `checkpoints.restored`, raised when a restore finishes, including one resumed from its journal.
 */
export declare class RestoredEvent {
  /**
   * The event's name, `"checkpoints.restored"`.
   */
  public static readonly event: string;

  /**
   * The id of the checkpoint taken before the restore.
   */
  public readonly before: string;

  /**
   * The id of the checkpoint restored.
   */
  public readonly checkpoint: string;

  /**
   * The folder's identity.
   */
  public readonly identity: string;

  /**
   * @param identity The folder's identity, 1 to 64 letters, digits or hyphens.
   * @param checkpoint The id of the checkpoint restored.
   * @param before The id of the checkpoint taken before the restore.
   * @throws {ProtocolException} Thrown synchronously when the identity or an id isn't one.
   * @example
   * ```ts
   * import { RestoredEvent } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const other = "01928f6e-7a3c-7c4d-8e5f-0a1b2c3d4e5f";
   * const event = new RestoredEvent("project-1", id, other);
   * console.log(RestoredEvent.event);
   * ```
   */
  public constructor(identity: string, checkpoint: string, before: string);

  /**
   * Reads an event from its wire form.
   *
   * @param value The wire form.
   * @returns The event.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of the event: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { RestoredEvent } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const other = "01928f6e-7a3c-7c4d-8e5f-0a1b2c3d4e5f";
   * const event = RestoredEvent.fromJson({ identity: "project-1", checkpoint: id, before: other });
   * console.log(event.before);
   * ```
   */
  public static fromJson(value: unknown): RestoredEvent;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { RestoredEvent } from "@noldova/checkpoints.protocol";
   *
   * const id = "01928f6e-7a3b-7c4d-8e5f-0a1b2c3d4e5f";
   * const other = "01928f6e-7a3c-7c4d-8e5f-0a1b2c3d4e5f";
   * const event = new RestoredEvent("project-1", id, other);
   * console.log(JSON.stringify(event.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The payload of `checkpoints.capturePaused`, raised when a capture took no checkpoint for want of space on the store's volume;
 * the module also posts a `checkpoints.lowDiskSpace` notification, until a capture has the space.
 */
export declare class CapturePausedEvent {
  /**
   * The event's name, `"checkpoints.capturePaused"`.
   */
  public static readonly event: string;

  /**
   * The folder's identity.
   */
  public readonly identity: string;

  /**
   * The bytes free on the store's volume for the module.
   */
  public readonly spaceFree: number;

  /**
   * The bytes the checkpoint needed free.
   */
  public readonly spaceNeeded: number;

  /**
   * @param identity The folder's identity, 1 to 64 letters, digits or hyphens.
   * @param spaceFree The bytes free.
   * @param spaceNeeded The bytes needed.
   * @throws {ProtocolException} Thrown synchronously when the identity isn't one, or a size isn't a whole number of bytes.
   * @example
   * ```ts
   * import { CapturePausedEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = new CapturePausedEvent("project-1", 1_073_741_824, 3_221_225_472);
   * console.log(event.spaceNeeded);
   * ```
   */
  public constructor(identity: string, spaceFree: number, spaceNeeded: number);

  /**
   * Reads an event from its wire form.
   *
   * @param value The wire form.
   * @returns The event.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of the event: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CapturePausedEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = CapturePausedEvent.fromJson({ identity: "project-1", spaceFree: 0, spaceNeeded: 2_147_483_648 });
   * console.log(event.spaceFree);
   * ```
   */
  public static fromJson(value: unknown): CapturePausedEvent;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CapturePausedEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = new CapturePausedEvent("project-1", 1_073_741_824, 3_221_225_472);
   * console.log(JSON.stringify(event.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The payload of `checkpoints.captureResumed`, raised by the first capture that has the space after captures of the folder were
 * paused, which also dismisses the `checkpoints.lowDiskSpace` notification.
 */
export declare class CaptureResumedEvent {
  /**
   * The event's name, `"checkpoints.captureResumed"`.
   */
  public static readonly event: string;

  /**
   * The folder's identity.
   */
  public readonly identity: string;

  /**
   * @param identity The folder's identity, 1 to 64 letters, digits or hyphens.
   * @throws {ProtocolException} Thrown synchronously when the identity isn't one.
   * @example
   * ```ts
   * import { CaptureResumedEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = new CaptureResumedEvent("project-1");
   * console.log(event.identity);
   * ```
   */
  public constructor(identity: string);

  /**
   * Reads an event from its wire form.
   *
   * @param value The wire form.
   * @returns The event.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of the event: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { CaptureResumedEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = CaptureResumedEvent.fromJson({ identity: "project-1" });
   * console.log(event.identity);
   * ```
   */
  public static fromJson(value: unknown): CaptureResumedEvent;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { CaptureResumedEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = new CaptureResumedEvent("project-1");
   * console.log(JSON.stringify(event.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The payload of `checkpoints.restoreHeldUp`, raised when an interrupted restore couldn't be rolled back because the system wouldn't
 * let the module change some paths; the folder's captures and restores are held up until a later rollback finishes.
 */
export declare class RestoreHeldUpEvent {
  /**
   * The event's name, `"checkpoints.restoreHeldUp"`.
   */
  public static readonly event: string;

  /**
   * The folder's identity.
   */
  public readonly identity: string;

  /**
   * The paths the module couldn't change, relative to the folder, with `/` between their names.
   */
  public readonly paths: readonly string[];

  /**
   * @param identity The folder's identity, 1 to 64 letters, digits or hyphens.
   * @param paths The paths the module couldn't change.
   * @throws {ProtocolException} Thrown synchronously when the identity isn't one, or a path isn't relative to the folder.
   * @example
   * ```ts
   * import { RestoreHeldUpEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = new RestoreHeldUpEvent("project-1", ["db/locked.sqlite"]);
   * console.log(event.paths);
   * ```
   */
  public constructor(identity: string, paths: readonly string[]);

  /**
   * Reads an event from its wire form.
   *
   * @param value The wire form.
   * @returns The event.
   * @throws {JsonException} Thrown synchronously when the value isn't the wire form of the event: it isn't an object, or a field is missing, of the wrong type or not one the model has.
   * @throws {ProtocolException} Thrown synchronously when the wire form holds a value the model refuses.
   * @example
   * ```ts
   * import { RestoreHeldUpEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = RestoreHeldUpEvent.fromJson({ identity: "project-1", paths: [] });
   * console.log(event.paths.length);
   * ```
   */
  public static fromJson(value: unknown): RestoreHeldUpEvent;

  /**
   * @returns The wire form.
   * @example
   * ```ts
   * import { RestoreHeldUpEvent } from "@noldova/checkpoints.protocol";
   *
   * const event = new RestoreHeldUpEvent("project-1", ["db/locked.sqlite"]);
   * console.log(JSON.stringify(event.toJson()));
   * ```
   */
  public toJson(): JsonObject;
}
