/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  CaptureMode,
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
import { Exception, type ExceptionOptions } from "@noldova/context.exceptions";
import type { IRuntimePart, IRuntimePartContext, ModuleActivationException } from "@noldova/desktop.runtime";

/**
 * The base of every exception the checkpoints module defines. Its subclasses: {@link GitException}, {@link GitManifestInvalidException},
 * {@link GitMissingException} and {@link StoreException}. A failure of the system itself, such as a store the system won't let it move
 * aside, passes as Node's own error where a member says so.
 *
 * @example
 * ```ts
 * import { FolderReference, ListRequest } from "@noldova/checkpoints.protocol";
 * import { CheckpointsException, CheckpointsService } from "@noldova/checkpoints/runtime";
 *
 * export async function listAsync(checkpoints: CheckpointsService): Promise<void> {
 *   try {
 *     await checkpoints.listAsync(new ListRequest(new FolderReference("project-1", "/work/project")));
 *   }
 *   catch (error) {
 *     console.log(error instanceof CheckpointsException);
 *   }
 * }
 * ```
 */
export declare abstract class CheckpointsException extends Exception {
  /**
   * Initializes the message and the cause for a subclass.
   *
   * @param message The exception's message.
   * @param options The failure that caused it, if any.
   * @example
   * ```ts
   * import { CheckpointsException } from "@noldova/checkpoints/runtime";
   *
   * export class ProbeException extends CheckpointsException {
   *   public constructor() {
   *     super("The probe failed.");
   *   }
   * }
   * ```
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when a Git command the module ran didn't succeed; the operation it was part of fails as a whole and leaves no checkpoint.
 * Its subclasses: {@link GitExitedException} and {@link GitStoppedException}.
 *
 * @example
 * ```ts
 * import { GitException, GitExitedException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new GitExitedException("fast-import", 128, "fatal: broken stream");
 * console.log(exception instanceof GitException, exception.command, exception.errors);
 * ```
 */
export declare abstract class GitException extends CheckpointsException {
  /**
   * The Git command, such as `"fast-import"`.
   */
  public abstract readonly command: string;

  /**
   * What the command wrote to its error output.
   */
  public abstract readonly errors: string;

  /**
   * Initializes the message and the cause for a subclass, which holds the command's facts.
   *
   * @param message The exception's message.
   * @param options The failure that caused it, if any.
   * @example
   * ```ts
   * import { GitException } from "@noldova/checkpoints/runtime";
   *
   * export class ProbeGitException extends GitException {
   *   public override readonly command: string = "cat-file";
   *   public override readonly errors: string = "";
   *
   *   public constructor() {
   *     super("Git's cat-file failed.");
   *   }
   * }
   * ```
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when a Git command the module ran exited with a code other than success.
 *
 * @example
 * ```ts
 * import { GitExitedException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new GitExitedException("fast-import", 128, "fatal: broken stream");
 * console.log(exception.message, exception.exitCode);
 * ```
 */
export declare class GitExitedException extends GitException {
  /**
   * The Git command, such as `"fast-import"`.
   */
  public override readonly command: string;

  /**
   * What the command wrote to its error output.
   */
  public override readonly errors: string;

  /**
   * The command's exit code.
   */
  public readonly exitCode: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param command The Git command.
   * @param exitCode The command's exit code.
   * @param errors What the command wrote to its error output.
   * @example
   * ```ts
   * import { GitExitedException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: GitExitedException = new GitExitedException("fast-import", 128, "fatal: broken stream");
   * ```
   */
  public constructor(command: string, exitCode: number, errors: string);
}

/**
 * Thrown when the module stopped a Git command, at its time limit or as a signal asked, before it exited.
 *
 * @example
 * ```ts
 * import { GitStoppedException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new GitStoppedException("cat-file", "");
 * console.log(exception.message);
 * ```
 */
export declare class GitStoppedException extends GitException {
  /**
   * The Git command, such as `"cat-file"`.
   */
  public override readonly command: string;

  /**
   * What the command wrote to its error output, which may be empty.
   */
  public override readonly errors: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param command The Git command.
   * @param errors What the command wrote to its error output.
   * @example
   * ```ts
   * import { GitStoppedException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: GitStoppedException = new GitStoppedException("cat-file", "");
   * ```
   */
  public constructor(command: string, errors: string);
}

/**
 * The cause of the `ModuleActivationException` activation rejects with when the Git build for the running system,
 * `@noldova/checkpoints.git.<platform>-<arch>`, isn't installed.
 *
 * @example
 * ```ts
 * import { GitMissingException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new GitMissingException("@noldova/checkpoints.git.linux-x64", new Error("Cannot find package"));
 * console.log(exception.message, exception.packageName, exception.cause);
 * ```
 */
export declare class GitMissingException extends CheckpointsException {
  /**
   * The name of the missing package.
   */
  public readonly packageName: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param packageName The name of the missing package.
   * @param cause The failure that showed it missing.
   * @example
   * ```ts
   * import { GitMissingException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: GitMissingException = new GitMissingException("@noldova/checkpoints.git.linux-x64", new Error("Cannot find package"));
   * ```
   */
  public constructor(packageName: string, cause: Error);
}

/**
 * The cause of the `ModuleActivationException` activation rejects with when the installed Git build's manifest isn't JSON, can't
 * be read, or doesn't name the build's program, exec path and path as text.
 *
 * @example
 * ```ts
 * import { GitManifestInvalidException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new GitManifestInvalidException("/app/git/package.json", new Error("GitPackage.noldova.git.path: The field is required."));
 * console.log(exception.message, exception.manifestFile, exception.cause);
 * ```
 */
export declare class GitManifestInvalidException extends CheckpointsException {
  /**
   * The manifest's path, or, for a manifest Node refused while it looked for the build, the manifest as the module asked Node for
   * it, `@noldova/checkpoints.git.<platform>-<arch>/package.json`.
   */
  public readonly manifestFile: string;

  /**
   * Formats the exception's message from its facts and the cause's message.
   *
   * @param manifestFile The manifest's path, or the manifest as the module asked Node for it.
   * @param cause Why the manifest can't be read.
   * @example
   * ```ts
   * import { GitManifestInvalidException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: GitManifestInvalidException = new GitManifestInvalidException("/app/git/package.json", new Error("GitPackage.noldova.git.path: The field is required."));
   * ```
   */
  public constructor(manifestFile: string, cause: Error);
}

/**
 * Thrown when a folder's store holds a file the module can't read, or one of a format version it doesn't know. Its subclasses:
 * {@link CheckpointFileMissingException}, {@link IgnoreRulesMismatchException}, {@link JournalFieldMissingException}, {@link ScriptStepMissingException}, {@link StoreAnswersMismatchException}, {@link StoreFileUnreadableException}, {@link StoreObjectMissingException}, {@link StoreObjectNotABlobException}, {@link TreeLineMalformedException}, {@link UnexpectedStoreObjectException}, {@link UnknownEntryKindException}, {@link UnknownGitModeException}, {@link UnknownJournalRecordException}, {@link UnknownLinkKindException}, {@link UnsupportedStoreFormatException}.
 *
 * @example
 * ```ts
 * import { StoreException, UnknownEntryKindException } from "@noldova/checkpoints/runtime";
 *
 * console.log(new UnknownEntryKindException("Socket") instanceof StoreException);
 * ```
 */
export declare abstract class StoreException extends CheckpointsException {
  /**
   * Initializes the message and the cause for a subclass.
   *
   * @param message The exception's message.
   * @param options The failure that caused it, if any.
   * @example
   * ```ts
   * import { StoreException } from "@noldova/checkpoints/runtime";
   *
   * export class ProbeStoreException extends StoreException {
   *   public constructor() {
   *     super("The probe's store file can't be read.");
   *   }
   * }
   * ```
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when a checkpoint's commit in the store holds no checkpoint.json.
 *
 * @example
 * ```ts
 * import { CheckpointFileMissingException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new CheckpointFileMissingException("4b825dc642cb6eb9a060e54bf8d69288fbee4904");
 * console.log(exception.message, exception.commit);
 * ```
 */
export declare class CheckpointFileMissingException extends StoreException {
  /**
   * The checkpoint's commit.
   */
  public readonly commit: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param commit The checkpoint's commit.
   * @example
   * ```ts
   * import { CheckpointFileMissingException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: CheckpointFileMissingException = new CheckpointFileMissingException("4b825dc642cb6eb9a060e54bf8d69288fbee4904");
   * ```
   */
  public constructor(commit: string);
}

/**
 * Thrown when a checkpoint.json holds ignore rules though its checkpoint didn't follow the ignore files, or none though it did.
 *
 * @example
 * ```ts
 * import { CaptureMode } from "@noldova/checkpoints.protocol";
 * import { IgnoreRulesMismatchException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new IgnoreRulesMismatchException(CaptureMode.EveryFile);
 * console.log(exception.message, exception.mode);
 * ```
 */
export declare class IgnoreRulesMismatchException extends StoreException {
  /**
   * The checkpoint's mode.
   */
  public readonly mode: CaptureMode;

  /**
   * Formats the exception's message from its facts.
   *
   * @param mode The checkpoint's mode.
   * @example
   * ```ts
   * import { CaptureMode } from "@noldova/checkpoints.protocol";
   * import { IgnoreRulesMismatchException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: IgnoreRulesMismatchException = new IgnoreRulesMismatchException(CaptureMode.EveryFile);
   * ```
   */
  public constructor(mode: CaptureMode);
}

/**
 * Thrown when a record of a restore's journal, or a step of its script, lacks a field its type needs.
 *
 * @example
 * ```ts
 * import { JournalFieldMissingException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new JournalFieldMissingException("JournalRecord", "path");
 * console.log(exception.message, exception.field, exception.model);
 * ```
 */
export declare class JournalFieldMissingException extends StoreException {
  /**
   * The field it lacks.
   */
  public readonly field: string;

  /**
   * The record or the step, such as `"JournalRecord"`.
   */
  public readonly model: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param model The record or the step.
   * @param field The field it lacks.
   * @example
   * ```ts
   * import { JournalFieldMissingException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: JournalFieldMissingException = new JournalFieldMissingException("JournalRecord", "path");
   * ```
   */
  public constructor(model: string, field: string);
}

/**
 * Thrown when a record of a restore's journal names a step its script doesn't hold.
 *
 * @example
 * ```ts
 * import { ScriptStepMissingException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new ScriptStepMissingException(3);
 * console.log(exception.message, exception.step);
 * ```
 */
export declare class ScriptStepMissingException extends StoreException {
  /**
   * The step's index.
   */
  public readonly step: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param step The step's index.
   * @example
   * ```ts
   * import { ScriptStepMissingException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: ScriptStepMissingException = new ScriptStepMissingException(3);
   * ```
   */
  public constructor(step: number);
}

/**
 * Thrown when the store gives more or fewer answers than the names the module asked it to read, so no answer can be matched to
 * its name; a compare, a read, a preview or a restore rejects with it.
 *
 * @example
 * ```ts
 * import { StoreAnswersMismatchException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new StoreAnswersMismatchException(2, 1);
 * console.log(exception.message, exception.asked, exception.answered);
 * ```
 */
export declare class StoreAnswersMismatchException extends StoreException {
  /**
   * How many answers the store gave.
   */
  public readonly answered: number;

  /**
   * How many names the module asked the store to read.
   */
  public readonly asked: number;

  /**
   * Formats the exception's message from its facts.
   *
   * @param asked How many names the module asked the store to read.
   * @param answered How many answers the store gave.
   * @example
   * ```ts
   * import { StoreAnswersMismatchException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: StoreAnswersMismatchException = new StoreAnswersMismatchException(2, 1);
   * ```
   */
  public constructor(asked: number, answered: number);
}

/**
 * Thrown when one of the store's files isn't JSON, or isn't one the module wrote; the cause says why.
 *
 * @example
 * ```ts
 * import { StoreFileUnreadableException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new StoreFileUnreadableException("index", new SyntaxError("Unexpected end of JSON input"));
 * console.log(exception.message, exception.file);
 * ```
 */
export declare class StoreFileUnreadableException extends StoreException {
  /**
   * The file's name, such as `"index"`.
   */
  public readonly file: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param file The file's name.
   * @param cause Why it can't be read.
   * @example
   * ```ts
   * import { StoreFileUnreadableException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: StoreFileUnreadableException = new StoreFileUnreadableException("index", new SyntaxError("Unexpected end of JSON input"));
   * ```
   */
  public constructor(file: string, cause: Error);
}

/**
 * Thrown when the store lacks the content of a file a restore stages, or of an ignore file a checkpoint followed, which a compare, a preview or a restore of that checkpoint reads.
 *
 * @example
 * ```ts
 * import { StoreObjectMissingException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new StoreObjectMissingException("4b825dc642cb6eb9a060e54bf8d69288fbee4904");
 * console.log(exception.message, exception.objectId);
 * ```
 */
export declare class StoreObjectMissingException extends StoreException {
  /**
   * The content's object id.
   */
  public readonly objectId: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param objectId The content's object id.
   * @example
   * ```ts
   * import { StoreObjectMissingException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: StoreObjectMissingException = new StoreObjectMissingException("4b825dc642cb6eb9a060e54bf8d69288fbee4904");
   * ```
   */
  public constructor(objectId: string);
}

/**
 * Thrown when the store gives what a restore stages, or an ignore file a checkpoint followed, as something other than a file's content, such as a tree.
 *
 * @example
 * ```ts
 * import { StoreObjectNotABlobException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new StoreObjectNotABlobException("4b825dc642cb6eb9a060e54bf8d69288fbee4904", "4b825dc642cb6eb9a060e54bf8d69288fbee4904 tree 0");
 * console.log(exception.message, exception.objectId, exception.header);
 * ```
 */
export declare class StoreObjectNotABlobException extends StoreException {
  /**
   * The header the store gave the object, such as `"<id> tree 0"`.
   */
  public readonly header: string;

  /**
   * The object id the restore asked for.
   */
  public readonly objectId: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param objectId The object id the restore asked for.
   * @param header The header the store gave the object.
   * @example
   * ```ts
   * import { StoreObjectNotABlobException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: StoreObjectNotABlobException = new StoreObjectNotABlobException("4b825dc642cb6eb9a060e54bf8d69288fbee4904", "4b825dc642cb6eb9a060e54bf8d69288fbee4904 tree 0");
   * ```
   */
  public constructor(objectId: string, header: string);
}

/**
 * Thrown when the store lists a line of a checkpoint's tree, as `diff-tree` gives it, without the line's mode or object id; a
 * compare, a read, a preview or a restore of that checkpoint rejects with it.
 *
 * @example
 * ```ts
 * import { TreeLineMalformedException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new TreeLineMalformedException(":000000 100644");
 * console.log(exception.message, exception.line);
 * ```
 */
export declare class TreeLineMalformedException extends StoreException {
  /**
   * The line as the store listed it.
   */
  public readonly line: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param line The line as the store listed it.
   * @example
   * ```ts
   * import { TreeLineMalformedException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: TreeLineMalformedException = new TreeLineMalformedException(":000000 100644");
   * ```
   */
  public constructor(line: string);
}

/**
 * Thrown when the store gives a file's content that no staged file asked for.
 *
 * @example
 * ```ts
 * import { UnexpectedStoreObjectException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new UnexpectedStoreObjectException("4b825dc642cb6eb9a060e54bf8d69288fbee4904 blob 5");
 * console.log(exception.message, exception.header);
 * ```
 */
export declare class UnexpectedStoreObjectException extends StoreException {
  /**
   * The header the store gave the content.
   */
  public readonly header: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param header The header the store gave the content.
   * @example
   * ```ts
   * import { UnexpectedStoreObjectException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: UnexpectedStoreObjectException = new UnexpectedStoreObjectException("4b825dc642cb6eb9a060e54bf8d69288fbee4904 blob 5");
   * ```
   */
  public constructor(header: string);
}

/**
 * Thrown when a store file names a kind of entry the module doesn't know.
 *
 * @example
 * ```ts
 * import { UnknownEntryKindException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new UnknownEntryKindException("Socket");
 * console.log(exception.message, exception.value);
 * ```
 */
export declare class UnknownEntryKindException extends StoreException {
  /**
   * The kind it names.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The kind it names.
   * @example
   * ```ts
   * import { UnknownEntryKindException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: UnknownEntryKindException = new UnknownEntryKindException("Socket");
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a checkpoint's tree gives a path a mode the module doesn't write.
 *
 * @example
 * ```ts
 * import { UnknownGitModeException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new UnknownGitModeException("160000");
 * console.log(exception.message, exception.mode);
 * ```
 */
export declare class UnknownGitModeException extends StoreException {
  /**
   * The mode, such as `"160000"`.
   */
  public readonly mode: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param mode The mode.
   * @example
   * ```ts
   * import { UnknownGitModeException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: UnknownGitModeException = new UnknownGitModeException("160000");
   * ```
   */
  public constructor(mode: string);
}

/**
 * Thrown when a restore's journal holds a record of a type the module doesn't know.
 *
 * @example
 * ```ts
 * import { UnknownJournalRecordException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new UnknownJournalRecordException("Paused");
 * console.log(exception.message, exception.type);
 * ```
 */
export declare class UnknownJournalRecordException extends StoreException {
  /**
   * The record's type.
   */
  public readonly type: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param type The record's type.
   * @example
   * ```ts
   * import { UnknownJournalRecordException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: UnknownJournalRecordException = new UnknownJournalRecordException("Paused");
   * ```
   */
  public constructor(type: string);
}

/**
 * Thrown when a store file names a kind of link the module doesn't know.
 *
 * @example
 * ```ts
 * import { UnknownLinkKindException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new UnknownLinkKindException("Junction");
 * console.log(exception.message, exception.value);
 * ```
 */
export declare class UnknownLinkKindException extends StoreException {
  /**
   * The kind it names.
   */
  public readonly value: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param value The kind it names.
   * @example
   * ```ts
   * import { UnknownLinkKindException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: UnknownLinkKindException = new UnknownLinkKindException("Junction");
   * ```
   */
  public constructor(value: string);
}

/**
 * Thrown when a store file has a format version this version of the module doesn't read.
 *
 * @example
 * ```ts
 * import { UnsupportedStoreFormatException } from "@noldova/checkpoints/runtime";
 *
 * const exception = new UnsupportedStoreFormatException("2");
 * console.log(exception.message, exception.version);
 * ```
 */
export declare class UnsupportedStoreFormatException extends StoreException {
  /**
   * The format version, as the file writes it.
   */
  public readonly version: string;

  /**
   * Formats the exception's message from its facts.
   *
   * @param version The format version.
   * @example
   * ```ts
   * import { UnsupportedStoreFormatException } from "@noldova/checkpoints/runtime";
   *
   * export const failure: UnsupportedStoreFormatException = new UnsupportedStoreFormatException("2");
   * ```
   */
  public constructor(version: string);
}

/**
 * The checkpoints service, which the runtime part publishes as `checkpoints.service` for other runtime parts, and with which it
 * answers the `checkpoints.*` methods. Each folder's operations run one at a time; a request that arrives during one waits for it.
 * Each first finishes or undoes any restore of the folder that was interrupted; while that can't finish, the folder's captures and
 * restores are refused with the outcome `HeldUp`.
 *
 * Each call takes an optional signal, such as its request's. A call whose signal aborts while it waits never runs; one that runs
 * stops before its next file or Git command, ends the Git commands it started, and rejects with the signal's reason once they have
 * exited, and the folder's next call runs. A capture so stopped leaves no checkpoint and the folder's index as it was. A restore
 * stops so only until it starts writing its journal; from then on it runs to its end. The recovery of an interrupted restore that a
 * call starts with always runs to its end.
 *
 * It is abstract: the runtime part publishes the module's own instance, and a module gets it with `getService`, which takes the class.
 *
 * @example
 * ```ts
 * import { CaptureRequest, FolderReference } from "@noldova/checkpoints.protocol";
 * import { CheckpointsService } from "@noldova/checkpoints/runtime";
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 *
 * export async function captureAsync(context: IRuntimePartContext): Promise<void> {
 *   const checkpoints = context.getService("checkpoints.service", CheckpointsService);
 *   const result = await checkpoints.captureAsync(new CaptureRequest(new FolderReference("project-1", "/work/project"), "Turn 3"));
 *   console.log(result.outcome.value);
 * }
 * ```
 */
export declare abstract class CheckpointsService {
  /**
   * Takes a checkpoint of a folder: every file, link and folder in it but each `.git`, or, while the setting
   * `checkpoints.followIgnoreFiles` is on, only those its `.gitignore` files don't ignore, matched as Git matches them. The
   * checkpoint's `mode` says which. It needs, on the store's volume, 2 GiB free beyond the size of the new and changed files it
   * adds, before it streams and while it does; one without the space takes no checkpoint, posts the folder's
   * `checkpoints.lowDiskSpace` notification and raises `checkpoints.capturePaused`, and the folder's next capture that is taken
   * dismisses the notification and raises `checkpoints.captureResumed`.
   *
   * @param request The folder and the label to attach.
   * @param signal Stops the call; none by default.
   * @returns The checkpoint taken; or the outcome `LowDiskSpace`, with the space free and the space needed in bytes, `FolderMissing`
   *   when the folder's path is missing, or `HeldUp` while an interrupted restore of the folder can't finish.
   * @throws {GitException} When a Git command fails; no checkpoint is left.
   * @throws {StoreException} When the folder's store holds a file the module can't read.
   * @throws {Error} When the system refuses the module a step of its own, such as reading the folder itself (EACCES), writing its
   *   store (ENOSPC) or finishing an interrupted restore of the folder; a path the capture can't read is listed in the checkpoint instead.
   * @example
   * ```ts
   * import { CaptureRequest, FolderReference } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function captureAsync(checkpoints: CheckpointsService, signal: AbortSignal): Promise<string | null> {
   *   const result = await checkpoints.captureAsync(new CaptureRequest(new FolderReference("project-1", "/work/project"), "Turn 3"), signal);
   *   return result.checkpoint?.id ?? null;
   * }
   * ```
   */
  public abstract captureAsync(request: CaptureRequest, signal?: AbortSignal): Promise<CaptureResult>;

  /**
   * Compares one of a folder's checkpoints with another, or with the folder now, which it walks in the checkpoint's own mode. A path
   * either side's rules ignore is on neither side, a `.git` never is, and a path the module couldn't read on either side is
   * `Unknown`, never `Deleted`. It writes nothing.
   *
   * @param request The folder, the checkpoint the changes start from, and the one they lead to, or `null` for the folder now.
   * @param signal Stops the call; none by default.
   * @returns The changes, in the byte order of their paths; or the outcome `CheckpointMissing` when either checkpoint is missing,
   *   or `FolderMissing` when the folder now is asked for and its path is missing.
   * @throws {GitException} When a Git command fails.
   * @throws {StoreException} When the folder's store holds a checkpoint the module can't read.
   * @throws {Error} When the system refuses the module a step of its own, such as reading its store, finishing an interrupted restore of the folder, or,
   *   for the folder now, reading the folder itself (EACCES).
   * @example
   * ```ts
   * import { CompareRequest, FolderReference } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function changedPathsAsync(checkpoints: CheckpointsService, from: string): Promise<readonly string[]> {
   *   const result = await checkpoints.compareAsync(new CompareRequest(new FolderReference("project-1", "/work/project"), from, null));
   *   return result.changes.map(t => t.path);
   * }
   * ```
   */
  public abstract compareAsync(request: CompareRequest, signal?: AbortSignal): Promise<CompareResult>;

  /**
   * Deletes all of a folder's checkpoints by removing its store whole, after the folder's earlier calls; a housekeeping pass running
   * on the store is stopped first. It first finishes or undoes a restore of the folder that was interrupted, and while that can't
   * finish it deletes nothing, since the restore's journal is what puts the folder's files right. A crash mid-delete never leaves a
   * half store: the store is moved aside whole before it is removed, once a `storageAsync` reading it has, and what a crash leaves
   * there is removed when the module next starts. The folder's next capture starts a new store. The module stopping stops the call as
   * its signal would, and waits for it.
   *
   * @param request The folder.
   * @param signal Stops the call until the store is moved aside; none by default.
   * @returns The outcome `Deleted`, also for a folder that has no checkpoints, or `HeldUp` while an interrupted restore of the folder
   *   can't finish.
   * @throws {Error} When the system refuses to move the store aside, after trying for about 5 s while it holds a file; the store is
   *   left whole.
   * @example
   * ```ts
   * import { DeleteFolderRequest, FolderReference } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function forgetAsync(checkpoints: CheckpointsService): Promise<string> {
   *   const result = await checkpoints.deleteFolderAsync(new DeleteFolderRequest(new FolderReference("project-1", "/work/project")));
   *   return result.outcome.value;
   * }
   * ```
   */
  public abstract deleteFolderAsync(request: DeleteFolderRequest, signal?: AbortSignal): Promise<DeleteFolderResult>;

  /**
   * Lists a folder's checkpoints.
   *
   * @param request The folder.
   * @param signal Stops the call; none by default.
   * @returns The folder's checkpoints, newest first; none for a folder never captured.
   * @throws {GitException} When a Git command fails.
   * @throws {StoreException} When the folder's store holds a checkpoint the module can't read.
   * @throws {Error} When the system refuses the module a step of its own, such as reading its store or finishing an interrupted restore of the folder.
   * @example
   * ```ts
   * import { FolderReference, ListRequest } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function newestAsync(checkpoints: CheckpointsService): Promise<string | null> {
   *   const list = await checkpoints.listAsync(new ListRequest(new FolderReference("project-1", "/work/project")));
   *   return list.checkpoints[0]?.id ?? null;
   * }
   * ```
   */
  public abstract listAsync(request: ListRequest, signal?: AbortSignal): Promise<CheckpointList>;

  /**
   * Plans a restore of one of a folder's checkpoints over the folder now, which it walks in the checkpoint's own mode: each path the
   * restore writes, replaces or deletes, with its side now and in the checkpoint, and each path that stays as it is, with its reason:
   * a `.git` or another name for one, a folder that holds a `.git` at any depth or one above it, a path either side's rules ignore,
   * one either side couldn't read, or a link this system won't let the module create. It writes nothing to the folder.
   *
   * @param request The folder and the checkpoint to restore.
   * @param signal Stops the call; none by default.
   * @returns The plan, with the state of the folder it was planned on; or the outcome `HeldUp` while a restore holds the folder,
   *   `CheckpointMissing` when the checkpoint is missing, or `FolderMissing` when the folder's path is missing.
   * @throws {GitException} When a Git command fails.
   * @throws {StoreException} When the folder's store holds a checkpoint the module can't read.
   * @throws {Error} When the system refuses the module a step of its own, such as reading its store, finishing an interrupted restore of the folder or
   *   reading the folder itself (EACCES).
   * @example
   * ```ts
   * import { FolderReference, PreviewRequest } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function stepCountAsync(checkpoints: CheckpointsService, checkpoint: string): Promise<number> {
   *   const result = await checkpoints.previewRestoreAsync(new PreviewRequest(new FolderReference("project-1", "/work/project"), checkpoint, ["src"]));
   *   return result.plan?.steps.length ?? 0;
   * }
   * ```
   */
  public abstract previewRestoreAsync(request: PreviewRequest, signal?: AbortSignal): Promise<PreviewResult>;

  /**
   * Reads one file of a checkpoint: its content, or its line diff to another checkpoint or to the folder now, cut at the request's
   * limit. A diff to the folder now writes the file's content there into the store as one object no checkpoint names; nothing else
   * is written.
   *
   * @param request The folder, the checkpoint, the path, what to diff against, if anything, and the most bytes to give.
   * @param signal Stops the call; none by default.
   * @returns The content or the diff, with its whole size, so a result shorter than its size is cut; or why there's none.
   * @throws {GitException} When a Git command fails.
   * @throws {StoreException} When the folder's store holds a checkpoint the module can't read.
   * @throws {Error} When the system refuses the module a step of its own, such as reading its store, finishing an interrupted restore of the folder, or,
   *   for the folder now, reading the folder itself (EACCES).
   * @example
   * ```ts
   * import { DiffTarget, FolderReference, ReadRequest } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function diffToNowAsync(checkpoints: CheckpointsService, checkpoint: string): Promise<Uint8Array> {
   *   const request = new ReadRequest(new FolderReference("project-1", "/work/project"), checkpoint, "src/main.ts", new DiffTarget(null), 65536);
   *   return (await checkpoints.readAsync(request)).content;
   * }
   * ```
   */
  public abstract readAsync(request: ReadRequest, signal?: AbortSignal): Promise<ReadResult>;

  /**
   * Restores one of a folder's checkpoints by the plan its preview gave, whole or not at all. It plans again and refuses a plan the
   * folder has moved on from, then takes a checkpoint of the folder labelled `Before restore`, which undoes the restore. It stages
   * new content in a folder of its own at the folder's root, moves each file it replaces or deletes aside and compares it with that
   * checkpoint, so a file another program wrote is never lost; it never writes through a link, never changes a `.git`, and never
   * moves, renames or removes a folder that holds one. A restore that fails rolls back; one interrupted is finished or undone when the folder is next
   * opened. It raises `checkpoints.restored` when it finishes, and `checkpoints.restoreHeldUp` when its rollback can't.
   *
   * @param request The folder and the plan its preview gave.
   * @param signal Stops the call until the restore starts writing its journal; none by default.
   * @returns The outcome, with the checkpoint taken before the restore when it restored or rolled back, and, when it restored, the
   *   checkpoint labelled `Recovered after restore` that keeps what another program changed in a file the restore had moved aside;
   *   or `MovedOn` when the folder no longer matches the plan, `LowDiskSpace`, `CheckpointMissing`, `FolderMissing` or `HeldUp`.
   * @throws {GitException} When a Git command fails before the restore changes anything.
   * @throws {StoreException} When the folder's store holds a file the module can't read.
   * @throws {Error} When the system refuses the module a step of its own before the restore changes anything, such as reading the
   *   folder itself (EACCES), writing its store (ENOSPC) or finishing an interrupted restore of the folder.
   * @example
   * ```ts
   * import { FolderReference, PreviewRequest, RestoreRequest } from "@noldova/checkpoints.protocol";
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function restoreAsync(checkpoints: CheckpointsService, checkpoint: string): Promise<string> {
   *   const folder = new FolderReference("project-1", "/work/project");
   *   const preview = await checkpoints.previewRestoreAsync(new PreviewRequest(folder, checkpoint, null));
   *   if (preview.plan === null)
   *     return preview.outcome.value;
   *   return (await checkpoints.restoreAsync(new RestoreRequest(folder, preview.plan))).outcome.value;
   * }
   * ```
   */
  public abstract restoreAsync(request: RestoreRequest, signal?: AbortSignal): Promise<RestoreResult>;

  /**
   * Lists every folder's space used: the sum of the sizes of its store's files, and the path the folder had at its last capture. It
   * reads outside the folders' calls, so it never waits for one; a capture or a housekeeping pass running meanwhile may change the
   * sizes at once. A folder whose store a delete is moving aside is left out, and a delete waits for a call reading it. Space a delete
   * couldn't free yet isn't listed.
   *
   * @param signal Stops the call; none by default.
   * @returns The folders, the largest first; none when no folder was ever captured.
   * @throws {Error} When the system refuses to list the module's stores, or a store's files, other than one that is gone.
   * @example
   * ```ts
   * import type { CheckpointsService } from "@noldova/checkpoints/runtime";
   *
   * export async function usedBytesAsync(checkpoints: CheckpointsService): Promise<number> {
   *   const list = await checkpoints.storageAsync();
   *   return list.folders.reduce((total, t) => total + t.bytes, 0);
   * }
   * ```
   */
  public abstract storageAsync(signal?: AbortSignal): Promise<StorageList>;
}

/**
 * The module's runtime part, which Noldova Desktop loads from `@noldova/checkpoints/runtime`.
 *
 * @example
 * ```ts
 * import { RuntimePart } from "@noldova/checkpoints/runtime";
 * import type { IRuntimePart } from "@noldova/desktop.runtime";
 *
 * export const part: IRuntimePart = new RuntimePart();
 * ```
 */
export declare class RuntimePart implements IRuntimePart {
  /**
   * Makes a part that holds nothing until it is activated.
   *
   * @example
   * ```ts
   * import { RuntimePart } from "@noldova/checkpoints/runtime";
   *
   * export const part: RuntimePart = new RuntimePart();
   * ```
   */
  public constructor();

  /**
   * Finds the Git build for the running system, declares `checkpoints.restored`, `checkpoints.restoreHeldUp`,
   * `checkpoints.capturePaused` and `checkpoints.captureResumed`, publishes the checkpoints service, registers `checkpoints.capture`,
   * `checkpoints.list`, `checkpoints.compare`, `checkpoints.read`, `checkpoints.previewRestore`, `checkpoints.restore`,
   * `checkpoints.storage` and `checkpoints.deleteFolder`, then starts removing in the background what a delete left moved aside, and
   * starts the build's Git once with `--version` in the background, so the first capture doesn't wait for the system's check of a
   * newly written program. A failure to publish or register starts nothing in the background.
   *
   * @param context The part's context.
   * @returns A promise that resolves once the part is active.
   * @throws {ModuleActivationException} Rejects, before the part declares or registers anything, when the Git build for the running
   *   system isn't installed, with a {@link GitMissingException} as its cause, or when its manifest can't be read, with a
   *   {@link GitManifestInvalidException} as its cause; its message, which names no path, is what the person sees.
   * @example
   * ```ts
   * import { RuntimePart } from "@noldova/checkpoints/runtime";
   * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
   *
   * export async function startAsync(context: IRuntimePartContext): Promise<RuntimePart> {
   *   const part = new RuntimePart();
   *   await part.activateAsync(context);
   *   return part;
   * }
   * ```
   */
  public activateAsync(context: IRuntimePartContext): Promise<void>;

  /**
   * Deactivates the part, once the service's requests, the stores' housekeeping, and the removal and Git's start begun at activation
   * have stopped: every request's signal aborts, so one still waiting never runs, one running stops at its next safe point, and one
   * that comes to the service later is refused, the removal stops before its next store, and Git's start is stopped; the service
   * keeps nothing else open between requests. A part never activated has nothing to stop.
   *
   * @returns A promise that resolves once everything the part started has stopped.
   * @example
   * ```ts
   * import type { RuntimePart } from "@noldova/checkpoints/runtime";
   *
   * export async function stopAsync(part: RuntimePart): Promise<void> {
   *   await part.deactivateAsync();
   * }
   * ```
   */
  public deactivateAsync(): Promise<void>;
}
