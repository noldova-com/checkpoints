/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { constants } from "node:fs";
import os from "node:os";

export class Resources {
  public static readonly absentCodes: readonly string[] = ["ENOENT", "ENOTDIR"];
  public static readonly actionField: string = "action";
  public static readonly addedSign: string = "+";
  public static readonly anyExceptSlashPattern: string = "[^/]*";
  public static readonly anyFoldersPattern: string = "(?:[\\s\\S]*/)?";
  public static readonly anyPattern: string = "[\\s\\S]*";
  public static readonly appendFlag: string = "a";
  public static readonly arrayExpected: string = "Expected an array.";
  public static readonly applyingRecord: string = "Applying";
  public static readonly asciiCarriageReturn: number = 0x0d;
  public static readonly asciiCaseOffset: number = 0x20;
  public static readonly asciiDelete: number = 0x7f;
  public static readonly asciiDigitFirst: number = 0x30;
  public static readonly asciiDigitLast: number = 0x39;
  public static readonly asciiGraphFirst: number = 0x21;
  public static readonly asciiLowerFirst: number = 0x61;
  public static readonly asciiLowerHexLast: number = 0x66;
  public static readonly asciiLowerLast: number = 0x7a;
  public static readonly asciiPrintLast: number = 0x7e;
  public static readonly asciiSpace: number = 0x20;
  public static readonly asciiTab: number = 0x09;
  public static readonly asciiUpperFirst: number = 0x41;
  public static readonly asciiUpperHexLast: number = 0x46;
  public static readonly asciiUpperLast: number = 0x5a;
  public static readonly asideField: string = "aside";
  public static readonly asideRecord: string = "Aside";
  public static readonly asideSuffix: string = ".old";
  public static readonly attributesFile: string = "attributes";
  public static readonly attributesText: string = "* -text -eol -filter -ident -working-tree-encoding\n";
  public static readonly batchCommandOption: string = "--batch-command";
  public static readonly batchFlush: string = "flush\n";
  public static readonly batchHeaderFieldCount: number = 3;
  public static readonly batchHeaderSeparator: string = " ";
  public static readonly batchHeaderSizeIndex: number = 2;
  public static readonly batchHeaderTypeIndex: number = 1;
  public static readonly batchIdleMilliseconds: number = 60_000;
  public static readonly batchOption: string = "--batch";
  public static readonly beforeField: string = "before";
  public static readonly beforeMissingReason: string = "the checkpoint taken before the restore is gone";
  public static readonly beforeRestoreLabel: string = "Before restore";
  public static readonly beginRecord: string = "Begin";
  public static readonly bigFileThreshold: number = 32 * 1024 * 1024;
  public static readonly blobType: string = "blob";
  public static readonly bufferEncoding: "buffer" = "buffer";
  public static readonly bufferOption: string = "--buffer";
  public static readonly byteCount: number = 256;
  public static readonly byteOrderMark: Buffer = Buffer.from([0xef, 0xbb, 0xbf]);
  public static readonly bytesPerKibibyte: number = 1024;
  public static readonly carriageReturn: string = "\r";
  public static readonly catFileCommand: string = "cat-file";
  public static readonly catFileContents: string = "contents";
  public static readonly catFileInfo: string = "info";
  public static readonly changedField: string = "changed";
  public static readonly changedReason: string = "another program changed it after the checkpoint taken before the restore";
  public static readonly changingCodes: readonly string[] = ["ELOOP"];
  public static readonly checkpointField: string = "checkpoint";
  public static readonly checkpointFile: string = "checkpoint.json";
  public static readonly checkpointFormatVersion: number = 2;
  public static readonly checkpointIdCounterBits: bigint = 12n;
  public static readonly checkpointIdCounterMask: bigint = 0xfffn;
  public static readonly checkpointIdRandomBytes: number = 8;
  public static readonly checkpointListArguments: readonly string[] = ["--sort=-refname", "--format=%(objectname)"];
  public static readonly checkpointModel: string = "Checkpoint";
  public static readonly checkpointRecordModel: string = "CheckpointRecord";
  public static readonly checkpointReferencePrefix: string = "refs/checkpoints/";
  public static readonly checkpointTree: string = "files/ tree";
  public static readonly cleaningRecord: string = "Cleaning";
  public static readonly closedInputCodes: readonly string[] = ["ENOTCONN", "EOF", "EPIPE", "ERR_STREAM_DESTROYED", "ERR_STREAM_WRITE_AFTER_END"];
  public static readonly commitAuthor: string = "Checkpoints <checkpoints@noldova.invalid>";
  public static readonly commitMark: string = ":1";
  public static readonly configFile: string = "config";
  public static readonly countObjectsArguments: readonly string[] = ["-v"];
  public static readonly countObjectsCommand: string = "count-objects";
  public static readonly countObjectsSeparator: string = ": ";
  public static readonly countValuePattern: RegExp = /^\d+$/;
  public static readonly createdRecord: string = "Created";
  public static readonly createField: string = "create";
  public static readonly deletedFolder: string = "deleted";
  public static readonly deletedSign: string = "-";
  public static readonly deniedCodes: readonly string[] = ["EACCES", "EPERM", "EBUSY"];
  public static readonly diffArguments: readonly string[] = ["--no-ext-diff", "--no-textconv", "--no-color"];
  public static readonly diffCommand: string = "diff";
  public static readonly diffTreeArguments: readonly string[] = ["-r", "-z", "--no-renames"];
  public static readonly diffTreeCommand: string = "diff-tree";
  public static readonly emptyFile: string = "empty";
  public static readonly emptyFoldersField: string = "emptyFolders";
  public static readonly emptyTreeId: string = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
  public static readonly entriesField: string = "entries";
  public static readonly errorsCloseMilliseconds: number = 5_000;
  public static readonly exclusiveWriteFlag: string = "wx";
  public static readonly executableGitMode: string = "100755";
  public static readonly existsCode: string = "EEXIST";
  public static readonly failingCodes: readonly string[] = ["EIO", "EMFILE", "ENFILE"];
  public static readonly fastImportCheckpoint: string = "\ncheckpoint\nget-mark :1\n";
  public static readonly fastImportCommand: string = "fast-import";
  public static readonly fastImportCrashPrefix: string = "fast_import_crash_";
  public static readonly fastImportDeleteAll: string = "deleteall";
  public static readonly fastImportEnd: string = "done\n";
  public static readonly fastImportHeader: string = "feature done\n";
  public static readonly fastImportOptions: readonly string[] = ["--quiet", "--done"];
  public static readonly fileGitMode: string = "100644";
  public static readonly fileIdField: string = "fileId";
  public static readonly fileLinkType: string = "file";
  public static readonly filesFolder: string = "files";
  public static readonly folderFile: string = "folder.json";
  public static readonly folderIndexModel: string = "FolderIndex";
  public static readonly folderLinkType: string = "dir";
  public static readonly folderRecordModel: string = "FolderRecord";
  public static readonly foldersField: string = "folders";
  public static readonly foldersFolder: string = "folders";
  public static readonly followIgnoreFilesSetting: string = "checkpoints.followIgnoreFiles";
  public static readonly forEachRefCommand: string = "for-each-ref";
  public static readonly formatVersion: number = 1;
  public static readonly formatVersionField: string = "formatVersion";
  public static readonly fromField: string = "from";
  public static readonly fullPassField: string = "fullPass";
  public static readonly fullPassInterval: number = 7 * 24 * 60 * 60 * 1000;
  public static readonly geometricRepackArguments: readonly string[] = ["--geometric=2", "-d"];
  public static readonly gitAttrNoSystemVariable: string = "GIT_ATTR_NOSYSTEM";
  public static readonly gitConfigGlobalVariable: string = "GIT_CONFIG_GLOBAL";
  public static readonly gitConfigNoSystemVariable: string = "GIT_CONFIG_NOSYSTEM";
  public static readonly gitDirVariable: string = "GIT_DIR";
  public static readonly gitDisabledValue: string = "0";
  public static readonly gitEnabledValue: string = "1";
  public static readonly gitEscape: string = "\\";
  public static readonly gitExecPathField: string = "execPath";
  public static readonly gitExecPathVariable: string = "GIT_EXEC_PATH";
  public static readonly gitField: string = "git";
  public static readonly gitFolder: string = "git";
  public static readonly gitLocale: string = "C";
  public static readonly gitMissingReason: string = "The Git build it runs on this system isn't installed, so it can't keep checkpoints.";
  public static readonly gitNoReplaceObjectsVariable: string = "GIT_NO_REPLACE_OBJECTS";
  public static readonly gitNotFoundCodes: readonly string[] = ["MODULE_NOT_FOUND", "ERR_PACKAGE_PATH_NOT_EXPORTED"];
  public static readonly gitPackageManifest: string = "package.json";
  public static readonly gitPackageModel: string = "GitPackage";
  public static readonly gitPackagePrefix: string = "@noldova/checkpoints.git.";
  public static readonly gitPathField: string = "path";
  public static readonly gitProgramField: string = "program";
  public static readonly gitQuote: string = "\"";
  public static readonly gitQuotedCharacters: RegExp = /["\\\x00-\x1f\x7f]/g;
  public static readonly gitTerminalPromptVariable: string = "GIT_TERMINAL_PROMPT";
  public static readonly gitUnreadableCodes: readonly string[] = ["ERR_INVALID_PACKAGE_CONFIG"];
  public static readonly gitUnreadableReason: string = "The Git build it runs on this system can't be read, so it can't keep checkpoints.";
  public static readonly gitVersionArgument: string = "--version";
  public static readonly hashObjectArguments: readonly string[] = ["-w", "--stdin", "--no-filters"];
  public static readonly hashObjectCommand: string = "hash-object";
  public static readonly headFile: string = "HEAD";
  public static readonly hexEncoding: "hex" = "hex";
  public static readonly hfsIgnoredPattern: RegExp = /[\u200C-\u200F\u202A-\u202E\u206A-\u206F\uFEFF]/g;
  public static readonly hfsRepositoryPattern: RegExp = /^\.git$/i;
  public static readonly homeVariable: string = "HOME";
  public static readonly hooksFolder: string = "hooks";
  public static readonly housekeepingDelay: number = 30_000;
  public static readonly housekeepingFile: string = "housekeeping.json";
  public static readonly housekeepingRecordModel: string = "HousekeepingRecord";
  public static readonly hunkStart: string = "\n@@";
  public static readonly identityPattern: RegExp = /^[A-Za-z0-9-]{1,64}$/;
  public static readonly idField: string = "id";
  public static readonly ignoreComment: string = "#";
  public static readonly ignoreEscape: string = "\\";
  public static readonly ignoreFileName: string = ".gitignore";
  public static readonly ignoreFilePassedOverCodes: readonly string[] = [...Resources.deniedCodes, ...Resources.changingCodes, "EISDIR"];
  public static readonly ignoreFileUnopenableErrnos: readonly number[] = [-os.constants.errno.ENXIO, -os.constants.errno.EOPNOTSUPP];
  public static readonly ignoreNegation: string = "!";
  public static readonly ignoreRecordModel: string = "IgnoreRecord";
  public static readonly ignoreRulesField: string = "ignoreRules";
  public static readonly ignoresCaseField: string = "ignoresCase";
  public static readonly indexEntryModel: string = "IndexEntry";
  public static readonly indexField: string = "index";
  public static readonly indexFile: string = "index";
  public static readonly infoFolder: string = "info";
  public static readonly initArguments: readonly string[] = ["--bare", "--quiet", "--template=", "--object-format=sha1"];
  public static readonly initCommand: string = "init";
  public static readonly inTheWayReason: string = "something already has its name where the restore writes";
  public static readonly journalLineModel: string = "JournalLine";
  public static readonly journalRecordModel: string = "JournalRecord";
  public static readonly keepingRecord: string = "Keeping";
  public static readonly keepSuffix: string = ".keep";
  public static readonly kindField: string = "kind";
  public static readonly labelField: string = "label";
  public static readonly latestCheckpointArguments:readonly string[] = ["--sort=-refname", "--format=%(refname) %(objectname)", "--count=1"];
  public static readonly latin1Encoding: BufferEncoding = "latin1";
  public static readonly lineFeed: string = "\n";
  public static readonly lineFeedByte: number = 0x0a;
  public static readonly linkGitMode: string = "120000";
  public static readonly linkKindField: string = "linkKind";
  public static readonly linkProbePrefix: string = ".link-probe-";
  public static readonly linkProbeTarget: string = "link-probe-target";
  public static readonly linkRecordModel: string = "LinkRecord";
  public static readonly linkRefusedCodes: readonly string[] = ["EPERM", "EACCES"];
  public static readonly linksField: string = "links";
  public static readonly localeVariable: string = "LC_ALL";
  public static readonly looseCount: string = "count";
  public static readonly looseObjectLimit: number = 6_700;
  public static readonly looseSizeCount: string = "size";
  public static readonly lowDiskSpaceNotification: string = "checkpoints.lowDiskSpace";
  public static readonly lowDiskSpaceTitle: string = "Checkpoints paused";
  public static readonly macPlatform: string = "darwin";
  public static readonly madeRecord: string = "Made";
  public static readonly maximumIgnoreFileSize: number = 100 * 1024 * 1024;
  public static readonly maximumReadAttempts: number = 3;
  public static readonly methodTimeoutMilliseconds: number = 60_000;
  public static readonly millisecondsPerSecond: number = 1000;
  public static readonly missingCode: string = "ENOENT";
  public static readonly missingType: string = "missing";
  public static readonly modeBits: bigint = 0o7777n;
  public static readonly modeField: string = "mode";
  public static readonly modifiedField: string = "modified";
  public static readonly nanosecondsPerMillisecond: bigint = 1_000_000n;
  public static readonly neverCancelled: AbortSignal = new AbortController().signal;
  public static readonly noFinalLineFeedMarker: string = "\\ No newline at end of file\n";
  public static readonly noFollowNonBlockingReadFlags: number = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  public static readonly noHardLinkCodes: readonly string[] = ["EMLINK", "ENOSYS", "ENOTSUP", "EOPNOTSUPP", "EPERM"];
  public static readonly noldovaField: string = "noldova";
  public static readonly noMatchPattern: string = "(?!)";
  public static readonly noStepIndex: number = -1;
  public static readonly ntfsRepositoryPattern: RegExp = /^(?:\.git|git~1)[. ]*(?::.*)?$/i;
  public static readonly nulByte: number = 0;
  public static readonly nulCharacter: string = "\0";
  public static readonly objectHashAlgorithm: string = "sha1";
  public static readonly objectIdField: string = "objectId";
  public static readonly objectsFolder: string = "objects";
  public static readonly occupiedReason: string = "something now has its name, so what the restore moved aside can't go back";
  public static readonly ownerExecuteBit: bigint = 0o100n;
  public static readonly packCount: string = "packs";
  public static readonly packFolder: string = "pack";
  public static readonly packLimit: number = 50;
  public static readonly packRefsArguments: readonly string[] = ["--all"];
  public static readonly packRefsCommand: string = "pack-refs";
  public static readonly packSizeCount: string = "size-pack";
  public static readonly pathField: string = "path";
  public static readonly pathVariable: string = "PATH";
  public static readonly patternEnd: string = "$";
  public static readonly patternStart: string = "^";
  public static readonly placedRecord: string = "Placed";
  public static readonly placingRecord: string = "Placing";
  public static readonly posixClassAlnum: string = "alnum";
  public static readonly posixClassAlpha: string = "alpha";
  public static readonly posixClassBlank: string = "blank";
  public static readonly posixClassCntrl: string = "cntrl";
  public static readonly posixClassDigit: string = "digit";
  public static readonly posixClassGraph: string = "graph";
  public static readonly posixClassLower: string = "lower";
  public static readonly posixClassOpenLength: number = 2;
  public static readonly posixClassPrint: string = "print";
  public static readonly posixClassPunct: string = "punct";
  public static readonly posixClassSpace: string = "space";
  public static readonly posixClassUpper: string = "upper";
  public static readonly posixClassXdigit: string = "xdigit";
  public static readonly processIdleDelay: number = 600_000;
  public static readonly processStopMilliseconds: number = 10_000;
  public static readonly pruneCommand: string = "prune";
  public static readonly racyWindowNanoseconds: bigint = 2_000_000_000n;
  public static readonly readChunkSize: number = 64 * 1024;
  public static readonly readFlag: string = "r";
  public static readonly readWriteFlag: string = "r+";
  public static readonly reasonField: string = "reason";
  public static readonly recordField: string = "record";
  public static readonly recoveredLabel: string = "Recovered after restore";
  public static readonly relativePathSeparator: string = "/";
  public static readonly removeField: string = "remove";
  public static readonly removeRetries: number = 5;
  public static readonly removingRecord: string = "Removing";
  public static readonly renameAttempts: number = 20;
  public static readonly renamedRecord: string = "Renamed";
  public static readonly renameRetryDelayMilliseconds: number = 250;
  public static readonly repackCommand: string = "repack";
  public static readonly repositoryFoldersField: string = "repositoryFolders";
  public static readonly repositoryReason: string = "a .git appeared in a folder the restore moved aside";
  public static readonly restoreFile: string = "restore.json";
  public static readonly restoreIdBytes: number = 8;
  public static readonly restoreIdField: string = "restoreId";
  public static readonly restoreScriptModel: string = "RestoreScript";
  public static readonly retriedCodes: readonly string[] = ["EBUSY", "EPERM", "EACCES"];
  public static readonly retryDelayMilliseconds: number = 100;
  public static readonly returnedRecord: string = "Returned";
  public static readonly rollingBackRecord: string = "RollingBack";
  public static readonly rulesFolder: string = "rules";
  public static readonly scriptField: string = "script";
  public static readonly scriptStepModel: string = "ScriptStep";
  public static readonly serviceName: string = "checkpoints.service";
  public static readonly sizeField: string = "size";
  public static readonly space: string = " ";
  public static readonly spaceCheckInterval: number = 64 * 1024 * 1024;
  public static readonly spaceMargin: number = 2 * 1024 * 1024 * 1024;
  public static readonly stagedExecutableMode: number = 0o777;
  public static readonly stagedFileMode: number = 0o666;
  public static readonly stagedMissingReason: string = "its staged file is missing";
  public static readonly stageField: string = "stage";
  public static readonly stagingPrefix: string = ".~";
  public static readonly startField: string = "start";
  public static readonly stepField: string = "step";
  public static readonly stepsField: string = "steps";
  public static readonly sumAlgorithm: string = "sha256";
  public static readonly sumField: string = "sum";
  public static readonly temporaryPackPrefixes: readonly string[] = ["tmp_", ".tmp-"];
  public static readonly temporarySuffix: string = ".tmp";
  public static readonly textProbeLength: number = 8_000;
  public static readonly timeField: string = "time";
  public static readonly treeFieldSeparator: string = " ";
  public static readonly typeField: string = "type";
  public static readonly unknownField: string = "The field is not part of this record, which accepts no unknown fields.";
  public static readonly unreachableAge: number = 14 * 24 * 60 * 60 * 1000;
  public static readonly unreachableExpiry: string = "2.weeks.ago";
  public static readonly unreadPathModel: string = "UnreadPath";
  public static readonly unreadPathsField: string = "unreadPaths";
  public static readonly utcOffset: string = "+0000";
  public static readonly utf8Encoding: BufferEncoding = "utf8";
  public static readonly uuidVariantBits: number = 0x80;
  public static readonly uuidVariantMask: number = 0x3f;
  public static readonly wildcardBackslash: number = 0x5c;
  public static readonly wildcardBang: number = 0x21;
  public static readonly wildcardCaret: number = 0x5e;
  public static readonly wildcardClose: number = 0x5d;
  public static readonly wildcardColon: number = 0x3a;
  public static readonly wildcardDash: number = 0x2d;
  public static readonly wildcardOpen: number = 0x5b;
  public static readonly wildcardQuestion: number = 0x3f;
  public static readonly wildcardSlash: number = 0x2f;
  public static readonly wildcardStar: number = 0x2a;
  public static readonly windowsPlatform: string = "win32";
  public static readonly writeFlag: string = "w";
  public static readonly xdgConfigHomeVariable: string = "XDG_CONFIG_HOME";
  public static readonly caseIgnoringPlatforms: readonly string[] = [Resources.windowsPlatform, Resources.macPlatform];
  public static readonly filesPrefix: string = `${Resources.filesFolder}${Resources.relativePathSeparator}`;
  public static readonly rulesPrefix: string = `${Resources.rulesFolder}${Resources.relativePathSeparator}`;
  private static readonly bytesPerGibibyte: number = 1024 * 1024 * 1024;

  public static formatAddedHunk(range: string): string {
    return `@@ -0,0 +${range} @@\n`;
  }

  public static formatBatchCommand(command: string, name: string): string {
    return `${command} ${name}\n`;
  }

  public static formatObjectHeader(objectId: string, type: string, size: number): string {
    return `${objectId} ${type} ${size}`;
  }

  public static formatBlobHeader(size: number | bigint): string {
    return `blob ${size}\0`;
  }

  public static formatByteClass(ranges: readonly string[]): string {
    return `[${ranges.join("")}]`;
  }

  public static formatByteRange(first: number, last: number): string {
    return `${Resources.formatHexEscape(first)}-${Resources.formatHexEscape(last)}`;
  }

  public static formatCheckpointId(time: bigint, counter: bigint, variant: number, rest: string): string {
    const milliseconds = time.toString(16).padStart(12, "0");
    const sequence = counter.toString(16).padStart(3, "0");
    return `${milliseconds.slice(0, 8)}-${milliseconds.slice(8)}-7${sequence}-${variant.toString(16).padStart(2, "0")}${rest.slice(0, 2)}-${rest.slice(2)}`;
  }

  public static formatCheckpointMessage(id: string): string {
    return `Checkpoint ${id}`;
  }

  public static formatCleanupFailed(identity: string, reason: string): string {
    return `A restore of the folder ${identity} finished, but what it moved aside stays until the folder is next opened: ${reason}`;
  }

  public static formatCommitSignature(seconds: number): string {
    return `${Resources.commitAuthor} ${seconds} ${Resources.utcOffset}`;
  }

  public static formatCruftRepackArguments(expiry: string): readonly string[] {
    return ["--cruft", "-d", `--cruft-expiration=${expiry}`];
  }

  public static formatDeletedHunk(range: string): string {
    return `@@ -${range} +0,0 @@\n`;
  }

  public static formatDeletedName(name: string, id: string): string {
    return `${name}-${id}`;
  }

  public static formatErrorsUnclosed(command: string, errors: string, milliseconds: number): string {
    const note = `Git's ${command} kept its error output open ${milliseconds} ms after it ended, so this is what it wrote by then.`;
    return errors.trim() === "" ? note : `${errors.trim()}\n${note}`;
  }

  public static formatFastImportAuthor(signature: string): string {
    return `author ${signature}`;
  }

  public static formatFastImportBlob(size: number): string {
    return `blob\ndata ${size}\n`;
  }

  public static formatFastImportCommit(reference: string): string {
    return `commit ${reference}`;
  }

  public static formatFastImportCommitter(signature: string): string {
    return `committer ${signature}`;
  }

  public static formatFastImportData(length: number): string {
    return `data ${length}`;
  }

  public static formatFastImportFrom(parent: string): string {
    return `from ${parent}`;
  }

  public static formatFastImportInline(mode: string, path: string, length: number): string {
    return `M ${mode} inline ${path}\ndata ${length}\n`;
  }

  public static formatFastImportMark(mark: string): string {
    return `mark ${mark}`;
  }

  public static formatFastImportModify(mode: string, objectId: string, path: string): string {
    return `M ${mode} ${objectId} ${path}`;
  }

  public static formatFieldPath(path: string, field: string): string {
    return `${path}.${field}`;
  }

  public static formatFileId(device: bigint, inode: bigint): string {
    return `${device}:${inode}`;
  }

  public static formatFolderChanged(folder: string): string {
    return `${folder === "" ? "the folder" : folder} isn't the folder the restore was planned on, or is now a link`;
  }

  public static formatGitConfig(hooks: string, empty: string): string {
    return [
      "[core]",
      "\trepositoryformatversion = 0",
      "\tbare = true",
      "\tlogAllRefUpdates = false",
      "\tautocrlf = false",
      "\tprecomposeUnicode = false",
      "\tprotectNTFS = true",
      "\tprotectHFS = true",
      `\thooksPath = ${Resources.formatConfigValue(hooks)}`,
      `\tattributesFile = ${Resources.formatConfigValue(empty)}`,
      `\texcludesFile = ${Resources.formatConfigValue(empty)}`,
      "\tbigFileThreshold = 32m",
      "[gc]",
      "\tauto = 0",
      "[maintenance]",
      "\tauto = false",
      "[commit]",
      "\tgpgSign = false",
      ""
    ].join("\n");
  }

  public static formatGitExited(command: string, exitCode: number, errors: string): string {
    return `Git's ${command} failed with exit code ${exitCode}: ${errors.trim()}`;
  }

  public static formatGitManifestInvalid(manifestFile: string, reason: string): string {
    return `The Git build's manifest ${manifestFile} can't be read: ${reason}`;
  }

  public static formatGitMissing(packageName: string): string {
    return `The Git build for this system, ${packageName}, isn't installed.`;
  }

  public static formatGitStartFailed(reason: string): string {
    return `Starting Git once as the module started failed, so the first command it runs starts it: ${reason}`;
  }

  public static formatGitStarted(milliseconds: number): string {
    return `Git started once as the module started, in ${milliseconds} ms.`;
  }

  public static formatGitStopped(command: string, errors: string): string {
    return `Git's ${command} failed, stopped by a signal: ${errors.trim()}`;
  }

  public static formatGitTarget(platform: string, architecture: string): string {
    return `${platform}-${architecture}`;
  }

  public static formatHexEscape(byte: number): string {
    return `\\x${byte.toString(16).padStart(2, "0")}`;
  }

  public static formatHousekeepingFailed(identity: string, reason: string): string {
    return `Packing the store of the folder ${identity} failed: ${reason}`;
  }

  public static formatHunkRange(count: number): string {
    return count === 1 ? "1" : `1,${count}`;
  }

  public static formatIdleStopFailed(folder: string, reason: string): string {
    return `Stopping the idle Git of the store ${folder} failed: ${reason}`;
  }

  public static formatIgnoreRulesMismatch(mode: string): string {
    return `its ignore rules don't fit its mode, ${mode}: a checkpoint has them only when it followed the ignore files.`;
  }

  public static formatJournalFieldMissing(model: string, field: string): string {
    return `its ${model} has no ${field}.`;
  }

  public static formatJournalUnreadable(identity: string): string {
    return `The journal of the folder ${identity}'s last restore can't be read, so the folder's captures and restores stay refused.`;
  }

  public static formatLowDiskSpace(free: number, needed: number): string {
    return `${Resources.formatGibibytes(free)} free on the disk that keeps checkpoints; a checkpoint needs ${Resources.formatGibibytes(needed)}.`;
  }

  public static formatMissingNotStaged(identity: string, reason: string): string {
    return `The rollback of a restore of the folder ${identity} couldn't stage again the files another program removed from what it moved aside: ${reason}`;
  }

  public static formatMissingObject(commit: string): string {
    return `the checkpoint at commit ${commit} has none.`;
  }

  public static formatNoContentReason(path: string): string {
    return `the checkpoint taken before the restore holds no file content for ${path}`;
  }

  public static formatOctalEscape(code: number): string {
    return `${Resources.gitEscape}${code.toString(8).padStart(3, "0")}`;
  }

  public static formatPruneArgument(expiry: string): string {
    return `--expire=${expiry}`;
  }

  public static formatRemoveFailed(folder: string, reason: string): string {
    return `Removing the deleted store ${folder} failed, so it is removed again when the module next starts: ${reason}`;
  }

  public static formatRestoreFailed(identity: string, reason: string): string {
    return `A restore of the folder ${identity} stopped, and rolls back: ${reason}`;
  }

  public static formatRevisionPath(revision: string, file: string): string {
    return `${revision}:${file}`;
  }

  public static formatScriptStepMissing(step: number): string {
    return `its script has no step ${step}.`;
  }

  public static formatStepFailed(path: string, reason: string): string {
    return `The restore couldn't change ${path}: ${reason}`;
  }

  public static formatStoreAnswersMismatch(asked: number, answered: number): string {
    return `The checkpoints store gave ${answered} answers to ${asked} names.`;
  }

  public static formatStoreCountMissing(count: string): string {
    return `The checkpoints store's object count gave no ${count}.`;
  }

  public static formatStoreObjectMissing(objectId: string): string {
    return `The checkpoints store has no file content ${objectId}.`;
  }

  public static formatStoreObjectNotABlob(objectId: string, header: string): string {
    return `The checkpoints store's ${objectId} isn't file content: it gave ${header}.`;
  }

  public static formatTreeLineMalformed(line: string): string {
    return `The checkpoints store listed a tree line it can't read: ${line}.`;
  }

  public static formatUndoFailed(identity: string, path: string, reason: string): string {
    return `The rollback of a restore of the folder ${identity} couldn't undo its change to ${path}, which stays changed: ${reason}`;
  }

  public static formatUnexpectedStoreObject(header: string): string {
    return `The checkpoints store gave ${header}, which no file asked for.`;
  }

  public static formatUnknownEntryKind(value: string): string {
    return `"${value}" is not a known kind of entry.`;
  }

  public static formatUnknownJournalRecord(value: string): string {
    return `"${value}" is not a known record of a restore's journal.`;
  }

  public static formatUnknownLinkKind(value: string): string {
    return `"${value}" is not a known kind of link.`;
  }

  public static formatUnknownGitMode(mode: string): string {
    return `${mode} is not a mode the module writes.`;
  }

  public static formatUnreadableStore(file: string, reason: string): string {
    return `The checkpoints store's ${file} can't be read: ${reason}`;
  }

  public static formatUnsupportedFormat(version: string): string {
    return `its format version is ${version}, which this version of the module doesn't read.`;
  }

  private static formatConfigValue(value: string): string {
    return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
  }

  private static formatGibibytes(bytes: number): string {
    return `${(bytes / Resources.bytesPerGibibyte).toFixed(1)} GiB`;
  }
}
