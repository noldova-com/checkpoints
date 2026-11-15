/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class Resources {
  public static readonly acceptedSlowTestFiles: readonly string[] = [
    "src/noldova.checkpoints/tests/resources.test.ts",
    "src/noldova.checkpoints/tests/services/blob-batch.writer.test.ts",
    "src/noldova.checkpoints/tests/services/blob-stager.test.ts",
    "src/noldova.checkpoints/tests/services/change-describer.test.ts",
    "src/noldova.checkpoints/tests/services/checkpoint-capture.test.ts",
    "src/noldova.checkpoints/tests/services/checkpoint-comparer.test.ts",
    "src/noldova.checkpoints/tests/services/checkpoint-file.reader.test.ts",
    "src/noldova.checkpoints/tests/services/checkpoint-lister.test.ts",
    "src/noldova.checkpoints/tests/services/checkpoints-host.delete.test.ts",
    "src/noldova.checkpoints/tests/services/checkpoints-host.test.ts",
    "src/noldova.checkpoints/tests/services/folder-deleter.test.ts",
    "src/noldova.checkpoints/tests/services/folder-deleter.tries.test.ts",
    "src/noldova.checkpoints/tests/services/folder-file.reader.test.ts",
    "src/noldova.checkpoints/tests/services/folder-walker.test.ts",
    "src/noldova.checkpoints/tests/services/git-build.locator.test.ts",
    "src/noldova.checkpoints/tests/services/git-process.test.ts",
    "src/noldova.checkpoints/tests/services/git-runner.test.ts",
    "src/noldova.checkpoints/tests/services/ignore-file.reader.test.ts",
    "src/noldova.checkpoints/tests/services/module-activation.test.ts",
    "src/noldova.checkpoints/tests/services/object.reader.test.ts",
    "src/noldova.checkpoints/tests/services/restore-applier.test.ts",
    "src/noldova.checkpoints/tests/services/restore-journal.test.ts",
    "src/noldova.checkpoints/tests/services/restore-paths.test.ts",
    "src/noldova.checkpoints/tests/services/restore-planner.test.ts",
    "src/noldova.checkpoints/tests/services/restore-rollback.test.ts",
    "src/noldova.checkpoints/tests/services/restore-runner.interrupted.test.ts",
    "src/noldova.checkpoints/tests/services/restore-runner.retries.test.ts",
    "src/noldova.checkpoints/tests/services/restore-runner.test.ts",
    "src/noldova.checkpoints/tests/services/restore-scope.test.ts",
    "src/noldova.checkpoints/tests/services/side-loader.test.ts",
    "src/noldova.checkpoints/tests/services/storage-reader.test.ts",
    "src/noldova.checkpoints/tests/services/store-file.test.ts",
    "src/noldova.checkpoints/tests/services/store-housekeeping.test.ts",
    "src/noldova.checkpoints/tests/services/store-opener.test.ts",
    "src/noldova.checkpoints/tests/services/tree-lister.test.ts"
  ];
  public static readonly acceptHeader: string = "Accept";
  public static readonly apiUrlVariable: string = "GITHUB_API_URL";
  public static readonly apiVersionHeader: string = "X-GitHub-Api-Version";
  public static readonly architectureFile: string = "documents/ARCHITECTURE.md";
  public static readonly architectureGroup: string = "architecture";
  public static readonly archiveExtension: string = ".tgz";
  public static readonly archiveFolder: string = "package";
  public static readonly archivesFolder: string = "_packages";
  public static readonly authorizationHeader: string = "Authorization";
  public static readonly binFolder: string = "bin";
  public static readonly bodyField: string = "body";
  public static readonly buildNotZipMessage: string = "The Git build's archive is not a zip.";
  public static readonly buildsFile: string = "builds.json";
  public static readonly buildTextPrefix: string = "build/";
  public static readonly buildWorkFolder: string = "_build";
  public static readonly carriageReturnLineFeed: string = "\r\n";
  public static readonly checkCommand: string = "check";
  public static readonly ciCommand: string = "ci";
  public static readonly citedTestPattern: RegExp = /"(?<name>(?:[^"\\]|\\.)*)"/g;
  public static readonly clauseSeparator: string = "; ";
  public static readonly cliFile: string = "cli.json";
  public static readonly closedState: string = "closed";
  public static readonly columnSeparator: string = "\t";
  public static readonly commitField: string = "gitHead";
  public static readonly commitPattern: RegExp = /^[0-9a-f]{40}$/;
  public static readonly companyPrefix: string = "noldova.";
  public static readonly compilerProgram: string = "tsc";
  public static readonly compileTimeout: number = 300_000;
  public static readonly componentsFolder: string = "components";
  public static readonly consumerFolder: string = "consumer";
  public static readonly consumerInstallArguments: readonly string[] = [
    "install", "--no-save", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error", "--omit=optional"
  ];
  public static readonly consumerPeers: readonly string[] = [
    "@noldova/context.collections", "@noldova/context.core", "@noldova/context.exceptions", "@noldova/context.json", "@noldova/context.text",
    "@noldova/desktop.protocol", "@noldova/desktop.runtime", "@types/node", "undici-types"
  ];
  public static readonly consumerPeersFolder: string = "consumer-peers";
  public static readonly consumerSources: readonly string[] = ["scripts", "consumer"];
  public static readonly contentLengthHeader: string = "Content-Length";
  public static readonly contextPrefix: string = "@noldova/context.";
  public static readonly coverageGates: readonly string[] = ["--test-coverage-lines=100", "--test-coverage-branches=100", "--test-coverage-functions=100"];
  public static readonly cpuField: string = "cpu";
  public static readonly createdStatus: number = 201;
  public static readonly createMethod: string = "POST";
  public static readonly currentFolderName: string = ".";
  public static readonly decimalRadix: number = 10;
  public static readonly declarationEntry: readonly string[] = ["api", "index.d.ts"];
  public static readonly declarationExtension: string = ".d.ts";
  public static readonly declarationImportPattern: RegExp = /(from\s+"\.{1,2}\/[^"]*)\.d\.ts"/g;
  public static readonly declarationOption: string = "--declaration";
  public static readonly deniedCode: string = "EACCES";
  public static readonly dependenciesField: string = "dependencies";
  public static readonly docLinePattern: RegExp = /^\s*\* ?/;
  public static readonly exampleEnd: string = "```";
  public static readonly examplesBaseProject: string = "../../tsconfig-base.json";
  public static readonly examplesFolder: string = "examples";
  public static readonly examplesInclude: string = "**/*.ts";
  public static readonly exampleStart: string = "```ts";
  public static readonly forwardedSignals: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  public static readonly gitHubBodyLimit: number = 16 * 1024 * 1024;
  public static readonly gitHubTimeout: number = 60_000;
  public static readonly killSignal: NodeJS.Signals = "SIGKILL";
  public static readonly licenseGroupClose: string = ")";
  public static readonly licenseGroupOpen: string = "(";
  public static readonly licenseOrSeparator: string = " OR ";
  public static readonly licensePathGroup: string = "path";
  public static readonly lowestVersionGroup: string = "lowest";
  public static readonly markerSourceGroup: string = "source";
  public static readonly markerTagGroup: string = "tag";
  public static readonly nodeTypes: string = "node";
  public static readonly noldovaDesktopField: string = "noldovaDesktop";
  public static readonly noldovaDesktopPrefix: string = "@noldova/desktop.";
  public static readonly devDependenciesField: string = "devDependencies";
  public static readonly downloadTimeout: number = 600_000;
  public static readonly drivePattern: RegExp = /^[A-Za-z]:/;
  public static readonly droppedComponentsFolder: string = "dropped-components";
  public static readonly droppedFolder: string = "dropped";
  public static readonly dugiteRepository: string = "desktop/dugite-native";
  public static readonly dugiteSourceName: string = "dugite-native";
  public static readonly endOfCopiesLine: string = "end of copies\n";
  public static readonly errorLogLevelOption: string = "--loglevel=error";
  public static readonly escapedCharacterPattern: RegExp = /\\(.)/g;
  public static readonly exactVersionPattern: RegExp = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;
  public static readonly execPathField: string = "execPath";
  public static readonly executableBits: number = 0o111;
  public static readonly executableMode: number = 0o755;
  public static readonly exportsField: string = "exports";
  public static readonly falseValue: string = "false";
  public static readonly fetchFailedMessage: string = "fetch failed";
  public static readonly fileKind: string = "file";
  public static readonly folderKind: string = "folder";
  public static readonly foundStatus: number = 200;
  public static readonly gitArchivesFolder: string = "git-archives";
  public static readonly gitField: string = "git";
  public static readonly gitFolder: string = "src/noldova.checkpoints.git";
  public static readonly gitFolderName: string = ".git";
  public static readonly gitHubApiVersion: string = "2022-11-28";
  public static readonly gitHubMediaType: string = "application/vnd.github+json";
  public static readonly gitListsFolder: string = "git-lists";
  public static readonly gitManifestsFolder: string = "packages";
  public static readonly gitProgram: string = "git";
  public static readonly gitRepositoryType: string = "git";
  public static readonly gitSourcesFolder: string = "git";
  public static readonly gitTimeout: number = 60_000;
  public static readonly gitVersionField: string = "gitVersion";
  public static readonly gzipInvalidCode: string = "Z_DATA_ERROR";
  public static readonly gzipTruncatedCode: string = "Z_BUF_ERROR";
  public static readonly hardLinkKind: string = "hardlink";
  public static readonly headReference: string = "HEAD";
  public static readonly hexEncoding: "hex" = "hex";
  public static readonly homepageAddress: string = "https://github.com/noldova-com/checkpoints#readme";
  public static readonly htmlUrlField: string = "html_url";
  public static readonly httpsPrefix: string = "https://";
  public static readonly ignoredOutput: "ignore" = "ignore";
  public static readonly ignoreScriptsOption: string = "--ignore-scripts";
  public static readonly jsonOption: string = "--json";
  public static readonly inheritedOutput: "inherit" = "inherit";
  public static readonly installCommand: string = "install";
  public static readonly issueLabel: string = "git-build";
  public static readonly issueMarkerPattern: RegExp = /^<!-- git-build-check: (?<source>\S+) (?<tag>\S+) -->$/m;
  public static readonly issuesAddress: string = "https://github.com/noldova-com/checkpoints/issues";
  public static readonly issuesCreator: string = "github-actions[bot]";
  public static readonly issuesPageSize: number = 100;
  public static readonly jsonIndent: number = 2;
  public static readonly jsonNull: string = "null";
  public static readonly labelsField: string = "labels";
  public static readonly latin1Encoding: BufferEncoding = "latin1";
  public static readonly leadingCurrentFolderPattern: RegExp = /^(\.\/)+/;
  public static readonly licenseAndSeparator: string = " AND ";
  public static readonly licenseField: string = "license";
  public static readonly licenseFile: string = "LICENSE";
  public static readonly licenseFolderPattern: RegExp = /(?:^|\/)share\/licenses\/[^/]+\/(?<path>.+)$/;
  public static readonly licensesFolder: string = "licenses";
  public static readonly lineBreakPattern: RegExp = /\r?\n/;
  public static readonly lineFeed: string = "\n";
  public static readonly linkKindSuffix: string = "link";
  public static readonly linkLoopCode: string = "ELOOP";
  public static readonly listCopiesOption: string = "--list-copies";
  public static readonly listedBuildFolder: string = "build";
  public static readonly listingPathColumn: number = 2;
  public static readonly listingsFolder: string = "listings";
  public static readonly listSeparator: string = ", ";
  public static readonly manifestExport: string = "./package.json";
  public static readonly manifestFile: string = "package.json";
  public static readonly menusFile: string = "menus.json";
  public static readonly minGitRepository: string = "git-for-windows/git";
  public static readonly minGitSourceName: string = "MinGit";
  public static readonly missingCode: string = "ENOENT";
  public static readonly moduleFile: string = "module.json";
  public static readonly moduleFolder: string = "src/noldova.checkpoints";
  public static readonly nameField: string = "name";
  public static readonly nameTooLongCode: string = "ENAMETOOLONG";
  public static readonly nativeFolder: string = "native";
  public static readonly noAuditOption: string = "--no-audit";
  public static readonly nodeModulesFolder: string = "node_modules";
  public static readonly noEmitOption: string = "--noEmit";
  public static readonly noFundOption: string = "--no-fund";
  public static readonly noldovaPrefix: string = "@noldova/";
  public static readonly noProcessCode: string = "ESRCH";
  public static readonly noSaveOption: string = "--no-save";
  public static readonly notFolderCode: string = "ENOTDIR";
  public static readonly notPlannedReason: string = "not_planned";
  public static readonly npmPathVariable: string = "npm_execpath";
  public static readonly npmRegistryAddress: string = "https://registry.npmjs.org/";
  public static readonly npmTimeout: number = 600_000;
  public static readonly npmUnavailableMessage: string = "npm_execpath is not set; run this through npm, such as npm run build or npm test.";
  public static readonly numberField: string = "number";
  public static readonly numberPattern: RegExp = /\d+/g;
  public static readonly openState: string = "open";
  public static readonly optionalDependenciesField: string = "optionalDependencies";
  public static readonly osField: string = "os";
  public static readonly outDirOption: string = "--outDir";
  public static readonly ownDependenciesField: string = "packageDependencies";
  public static readonly ownField: string = "noldova";
  public static readonly ownOptionalDependenciesField: string = "optionalPackageDependencies";
  public static readonly packageScope: string = "@noldova";
  public static readonly packagesFolder: string = "packages";
  public static readonly packageVersionsFile: string = "etc/package-versions.txt";
  public static readonly packageVersionsFolder: string = "package-versions";
  public static readonly packCommand: string = "pack";
  public static readonly packDestinationOption: string = "--pack-destination";
  public static readonly parentFolderName: string = "..";
  public static readonly partProjects: readonly string[] = ["src/tsconfig.json", "tests/tsconfig.json"];
  public static readonly pathField: string = "path";
  public static readonly pathSeparator: string = "/";
  public static readonly pathVariable: string = "PATH";
  public static readonly paxLinkPathPattern: RegExp = /^\d+ linkpath=(?<value>.*)$/m;
  public static readonly paxPathPattern: RegExp = /^\d+ path=(?<value>.*)$/m;
  public static readonly paxValueGroup: string = "value";
  public static readonly peerDependenciesField: string = "peerDependencies";
  public static readonly peerRangePattern: RegExp = /^>=(?<lowest>(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)) <(?<refused>(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
  public static readonly pinnedTextPrefix: string = "licenses/";
  public static readonly pipedOutput: "pipe" = "pipe";
  public static readonly plainVersionPattern: RegExp = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
  public static readonly platformGroup: string = "platform";
  public static readonly porcelainOption: string = "--porcelain";
  public static readonly powerShellOptions: readonly string[] = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"];
  public static readonly powerShellProgram: string = "powershell.exe";
  public static readonly privateField: string = "private";
  public static readonly privilegesScript: readonly string[] = ["scripts", "without-backup-privileges.ps1"];
  public static readonly processOutputLimit: number = 16 * 1024 * 1024;
  public static readonly processStopWait: number = 10_000;
  public static readonly programField: string = "program";
  public static readonly projectFile: string = "tsconfig.json";
  public static readonly projectOption: string = "--project";
  public static readonly protocolFolder: string = "src/noldova.checkpoints.protocol";
  public static readonly publicAccess: string = "public";
  public static readonly readmeFile: string = "README.md";
  public static readonly readMethod: string = "GET";
  public static readonly refusedVersionGroup: string = "refused";
  public static readonly registryLimit: number = 256_000_000;
  public static readonly regularMode: number = 0o644;
  public static readonly relativePrefix: string = "./";
  public static readonly releaseCommitVariable: string = "RELEASE_COMMIT";
  public static readonly releasePagePattern: RegExp = /^https:\/\/github\.com\/[A-Za-z0-9._/-]+$/;
  public static readonly releaseTagPattern: RegExp = /^[A-Za-z0-9._-]+$/;
  public static readonly releaseUsage: string = "Usage: check <folder> <version> <commit>\n";
  public static readonly releaseVersionPattern: RegExp = /^0\.0\.([1-9]\d*)$/;
  public static readonly releaseVersionVariable: string = "RELEASE_VERSION";
  public static readonly reportedDifferences: number = 20;
  public static readonly reportedSuffixPattern: RegExp = /^[a-z]+$/;
  public static readonly reportedVersionField: string = "reportedVersion";
  public static readonly repositoryAddress: string = "git+https://github.com/noldova-com/checkpoints.git";
  public static readonly repositoryVariable: string = "GITHUB_REPOSITORY";
  public static readonly revParseCommand: string = "rev-parse";
  public static readonly rewriteRelativeImportExtensionsOption: string = "--rewriteRelativeImportExtensions";
  public static readonly rootContext: string = "its root";
  public static readonly rootDirOption: string = "--rootDir";
  public static readonly rootManifestNotJsonMessage: string = "The root package.json is not JSON.";
  public static readonly rootVersionPattern: RegExp = /^\d+\.\d+\.\d+(-(0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;
  public static readonly runThroughNpmMessage: string = "Run it with npm run build, which installs the dependencies through npm.";
  public static readonly scopePattern: RegExp = /^@([^/]+)\/(.+)$/;
  public static readonly scopeReplacement: string = "$1-$2";
  public static readonly scopeSeparator: string = "/";
  public static readonly scopeVariable: string = "RELEASE_SCOPE";
  public static readonly scriptExtension: string = ".js";
  public static readonly scriptsField: string = "scripts";
  public static readonly settingsFile: string = "settings.json";
  public static readonly sha256Algorithm: string = "sha256";
  public static readonly sha256Field: string = "sha256";
  public static readonly sha256Pattern: RegExp = /^[0-9a-f]{64}$/;
  public static readonly sharedProjects: readonly string[] = ["scripts/tsconfig.json", "tsconfig.declarations.json"];
  public static readonly signalExitCode: number = 128;
  public static readonly sizeField: string = "size";
  public static readonly sourceExtension: string = ".ts";
  public static readonly sourceField: string = "source";
  public static readonly sourceMapOption: string = "--sourceMap";
  public static readonly sourcesFolder: string = "src";
  public static readonly startedCommands: readonly string[] = ["git-receive-pack", "git-upload-archive", "git-upload-pack"];
  public static readonly stateField: string = "state";
  public static readonly statusCommand: string = "status";
  public static readonly successExitCodes: readonly number[] = [0];
  public static readonly symbolicLinkKind: string = "symlink";
  public static readonly tagNameField: string = "tag_name";
  public static readonly tarBlockSize: number = 512;
  public static readonly tarExtendedType: string = "x";
  public static readonly tarFieldEndPattern: RegExp = /\0.*$/s;
  public static readonly tarFileType: string = "0";
  public static readonly tarFolderType: string = "5";
  public static readonly targetPattern: RegExp = /^(?<platform>darwin|linux|win32)-(?<architecture>arm64|x64)$/;
  public static readonly targetsField: string = "targets";
  public static readonly tarGlobalType: string = "g";
  public static readonly tarGzExtension: string = ".tar.gz";
  public static readonly tarGzKind: "tar.gz" = "tar.gz";
  public static readonly tarHardLinkType: string = "1";
  public static readonly tarLongLinkType: string = "K";
  public static readonly tarLongNameType: string = "L";
  public static readonly tarMagicEnd: number = 263;
  public static readonly tarMagicStart: number = 257;
  public static readonly tarModeEnd: number = 108;
  public static readonly tarNameEnd: number = 100;
  public static readonly tarNumberRadix: number = 8;
  public static readonly tarOldFileType: string = "\0";
  public static readonly tarPosixMagic: string = "ustar\0";
  public static readonly tarPrefixEnd: number = 500;
  public static readonly tarPrefixStart: number = 345;
  public static readonly tarSizeEnd: number = 136;
  public static readonly tarSizeStart: number = 124;
  public static readonly tarSymbolicLinkType: string = "2";
  public static readonly tarTypeStart: number = 156;
  public static readonly taskKillProgram: string = "taskkill";
  public static readonly temporaryVariables: readonly string[] = ["TMPDIR", "TEMP", "TMP"];
  public static readonly testDurationField: string = "duration";
  public static readonly testFileBudget: number = 1_000;
  public static readonly testFileField: string = "file";
  public static readonly testFiles: readonly string[] = ["src/*/tests/**/*.test.ts"];
  public static readonly testNameField: string = "name";
  public static readonly testNameSeparator: string = " > ";
  public static readonly testParameters: readonly string[] = [
    "--test",
    "--experimental-test-coverage",
    "--test-coverage-include=src/*/src/**/*.ts",
    "--test-coverage-exclude=src/*/src/**/*.d.ts"
  ];
  public static readonly testRecordReporter: readonly string[] = ["scripts", "services", "test-record-reporter.ts"];
  public static readonly testResultsFile: string = "test-results.jsonl";
  public static readonly testSkippedWithoutReasonField: string = "skippedWithoutReason";
  public static readonly testsLinePattern: RegExp = /^\s*- Tests: "(?:[^"\\]|\\.)*"(?:; "(?:[^"\\]|\\.)*")*\.$/;
  public static readonly testsLinePrefix: string = "- Tests:";
  public static readonly testTemporaryFolder: string = "test-temp";
  public static readonly testTimeout: number = 300_000;
  public static readonly testTopLevelField: string = "topLevel";
  public static readonly textsField: string = "texts";
  public static readonly timeoutErrorName: string = "TimeoutError";
  public static readonly timingMargin: number = 0.1;
  public static readonly timingRuns: number = 5;
  public static readonly tokenVariable: string = "GITHUB_TOKEN";
  public static readonly typeScriptPackage: string = "typescript";
  public static readonly updateMethod: string = "PATCH";
  public static readonly urlField: string = "url";
  public static readonly usageExitCode: number = 2;
  public static readonly utf8Encoding: BufferEncoding = "utf8";
  public static readonly versionField: string = "version";
  public static readonly versionFile: string = "version.json";
  public static readonly versionPartPad: string = "0";
  public static readonly versionPartSeparator: string = ".";
  public static readonly versionPartWidth: number = 16;
  public static readonly versionsField: string = "versions";
  public static readonly viewCommand: string = "view";
  public static readonly webViewsFile: string = "webViews.json";
  public static readonly windowsPathSeparator: string = "\\";
  public static readonly windowsPlatform: string = "win32";
  public static readonly workflowOptions: readonly string[] = ["--skip-test-details", "--skip-coverage-details"];
  public static readonly zipCentralCommentLengthOffset: number = 32;
  public static readonly zipCentralCompressedSizeOffset: number = 20;
  public static readonly zipCentralExtraLengthOffset: number = 30;
  public static readonly zipCentralHeaderSize: number = 46;
  public static readonly zipCentralLocalOffset: number = 42;
  public static readonly zipCentralMethodOffset: number = 10;
  public static readonly zipCentralNameLengthOffset: number = 28;
  public static readonly zipCentralSignature: number = 0x02014b50;
  public static readonly zipCentralSizeOffset: number = 24;
  public static readonly zipDeflatedMethod: number = 8;
  public static readonly zipEndCentralOffset: number = 16;
  public static readonly zipEndEntriesOffset: number = 10;
  public static readonly zipEndSignature: readonly number[] = [0x50, 0x4b, 0x05, 0x06];
  public static readonly zipExtension: string = ".zip";
  public static readonly zipKind: "zip" = "zip";
  public static readonly zipLocalExtraLengthOffset: number = 28;
  public static readonly zipLocalHeaderSize: number = 30;
  public static readonly zipLocalNameLengthOffset: number = 26;
  public static readonly zipLocalSignature: number = 0x04034b50;
  public static readonly zipStoredMethod: number = 0;
  public static readonly declarationImportReplacement: string = `$1${Resources.scriptExtension}"`;
  public static readonly consumerManifest: string = `${JSON.stringify({ name: Resources.consumerFolder, private: true, type: "module" }, null, Resources.jsonIndent)}${Resources.lineFeed}`;
  public static readonly rootPinFields: readonly string[] = [Resources.dependenciesField, Resources.devDependenciesField];

  public static formatAlreadyFiled(title: string, url: string): string {
    return `${title}: filed before, at ${url}.`;
  }

  public static formatArchitectureDocumentMissing(file: string): string {
    return `${file} is missing, so the run can't check the test names it cites.`;
  }

  public static formatArchiveChecked(archiveName: string, packageName: string, version: string, commit: string): string {
    return `${archiveName}: ${packageName}@${version} from ${commit}`;
  }

  public static formatArchiveEntry(file: string): string {
    return `${Resources.archiveFolder}${Resources.pathSeparator}${file}`;
  }

  public static formatArchiveEntryMalformed(archive: string, offset: number): string {
    return `${archive} has a malformed or truncated entry at offset ${offset}.`;
  }

  public static formatArchiveEntryUnlisted(url: string, entry: string, target: string): string {
    return `${url} holds ${entry}, which ${Resources.listingsFolder}/${target}.txt doesn't list.`;
  }

  public static formatArchiveHashMismatch(url: string, hash: string, pinned: string): string {
    return `${url} has the SHA-256 ${hash}; ${Resources.buildsFile} pins ${pinned}.`;
  }

  public static formatArchiveLongerThanPinned(url: string, pinned: number): string {
    return `${url} holds more than the ${pinned} bytes ${Resources.buildsFile} pins.`;
  }

  public static formatArchiveManifestMissing(archiveName: string): string {
    return `${archiveName} has no ${Resources.formatArchiveEntry(Resources.manifestFile)}.`;
  }

  public static formatArchiveMissing(folder: string, archiveName: string): string {
    return `${folder} lacks ${archiveName}.`;
  }

  public static formatArchiveName(packageName: string, version: string): string {
    return `${Resources.formatArchivePrefix(packageName)}${version}${Resources.archiveExtension}`;
  }

  public static formatArchivePrefix(packageName: string): string {
    return `${packageName.replace(Resources.scopePattern, Resources.scopeReplacement)}-`;
  }

  public static formatArchiveSizeMismatch(url: string, size: number, pinned: number): string {
    return `${url} has ${size} bytes; ${Resources.buildsFile} pins ${pinned}.`;
  }

  public static formatArchiveTooLarge(archiveName: string, size: number): string {
    return `${archiveName} has ${size} bytes; a release takes an archive smaller than ${Resources.registryLimit} bytes.`;
  }

  public static formatArchiveUnexpected(folder: string, fileName: string, version: string): string {
    return `${folder} holds ${fileName}, which is not a package's archive at ${version}.`;
  }

  public static formatArchiveUnreadable(archive: string): string {
    return `${archive} could not be read as a gzipped archive.`;
  }

  public static formatBearer(token: string): string {
    return `Bearer ${token}`;
  }

  public static formatBuildCentralEntryMalformed(offset: number): string {
    return `The Git build's archive has a malformed central entry at offset ${offset}.`;
  }

  public static formatBuildCompression(entry: string): string {
    return `The Git build's archive compresses ${entry} in a way the build can't read.`;
  }

  public static formatBuildEntryMalformed(offset: number): string {
    return `The Git build's archive has a malformed entry at offset ${offset}.`;
  }

  public static formatBuildEntryType(entry: string, type: string): string {
    return `The Git build's archive holds ${entry}, an entry of type ${type} the build can't unpack.`;
  }

  public static formatBuildFileMissing(url: string, file: string, target: string): string {
    return `${url} has no ${file}, which ${Resources.buildsFile} names for ${target}.`;
  }

  public static formatBuildLinkLoop(link: string): string {
    return `The Git build's archive links ${link} in a loop.`;
  }

  public static formatBuildLinkOutside(link: string, target: string): string {
    return `The Git build's archive links ${link} to ${target}, a path outside its folder.`;
  }

  public static formatBuildLinkTargetMissing(link: string, target: string): string {
    return `The Git build's archive links ${link} to ${target}, which it lacks.`;
  }

  public static formatBuildLocalEntryMalformed(entry: string): string {
    return `The Git build's archive has a malformed entry for ${entry}.`;
  }

  public static formatBuildPathOutside(entry: string): string {
    return `The Git build's archive holds ${entry}, a path outside its folder.`;
  }

  public static formatBuildsEmpty(file: string): string {
    return `${file} pins no build.`;
  }

  public static formatCachedArchive(target: string, sha256: string, kind: string): string {
    return `${target}-${sha256}.${kind}`;
  }

  public static formatCitedTestMissing(file: string, line: number, name: string): string {
    return `${file}:${line} cites "${name}", but no test of the run has that name.`;
  }

  public static formatClosedAs(url: string, title: string): string {
    return `${url}: closed, superseded by ${title}.`;
  }

  public static formatCode(text: string): string {
    return `\`${text}\``;
  }

  public static formatCommentsResource(resource: string): string {
    return `${resource}/comments`;
  }

  public static formatCommitMissing(archiveName: string, commit: string): string {
    return `${archiveName}: records no ${Resources.commitField}, so it doesn't name ${commit} as the commit it was built from.`;
  }

  public static formatCompilingFailed(sources: string, exitCode: number | null, output: string): string {
    return `Compiling ${sources} failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatComponentFieldNotText(file: string, index: number, field: string): string {
    return `${file}'s component ${index} needs ${field} as text.`;
  }

  public static formatComponentNotInBuild(file: string, component: string): string {
    return `${file} lists ${component}, which the build's ${Resources.packageVersionsFile} doesn't.`;
  }

  public static formatComponentRow(name: string, version: string, license: string): string {
    return `| ${name} | ${version} | ${license} |`;
  }

  public static formatComponentsDiffer(file: string, differences: readonly string[]): string {
    return [`${file} differs from the build's ${Resources.packageVersionsFile}:`, ...differences.slice(0, Resources.reportedDifferences)].join(Resources.lineFeed);
  }

  public static formatComponentsFile(target: string): string {
    return `${Resources.componentsFolder}${Resources.pathSeparator}${target}.json`;
  }

  public static formatComponentsMissing(file: string): string {
    return `${file} must list the build's components.`;
  }

  public static formatComponentTextsMissing(file: string, index: number): string {
    return `${file}'s component ${index} needs its licence texts, each under ${Resources.buildTextPrefix} or ${Resources.pinnedTextPrefix}.`;
  }

  public static formatConsumerArchiveMissing(packageName: string): string {
    return `${Resources.archivesFolder} must hold one archive of ${packageName} for the consumer project; run npm run build first.`;
  }

  public static formatConsumerInstallFailed(exitCode: number | null, output: string): string {
    return `Installing the packed packages into the consumer project under ${Resources.buildWorkFolder}/${Resources.consumerFolder} failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatDependencyDiffers(archiveName: string, dependency: string, range: string, version: string): string {
    return `${archiveName}: its dependency ${dependency} is "${range}", not exactly "${version}".`;
  }

  public static formatDependencyNotExact(archiveName: string, dependency: string, taken: string, field: string): string {
    return `${archiveName} takes ${dependency} at ${taken} in ${field}, not one exact version.`;
  }

  public static formatExampleFile(line: number): string {
    return `line-${line}${Resources.sourceExtension}`;
  }

  public static formatGitHubBodyTooLong(context: string, limit: number): string {
    return `GitHub's answer for ${context} is longer than ${limit} bytes.`;
  }

  public static formatGitHubTimeout(address: string, timeout: number): string {
    return `GitHub at ${address} did not answer within ${timeout} ms.`;
  }

  public static formatNoldovaDesktopRangeInvalid(archiveName: string, range: string): string {
    return `${archiveName}'s ${Resources.moduleFile} names ${Resources.noldovaDesktopField} ${range}, not ">=<lowest version> <first version refused>" with the first refused the next minor of a 0.x lowest version, such as <0.1.0 for any 0.0.x, or the next major from 1.0.0.`;
  }

  public static formatDownloadFailed(url: string, status: number): string {
    return `Downloading ${url} failed with HTTP status ${status}.`;
  }

  public static formatDownloading(url: string): string {
    return `Downloading ${url}`;
  }

  public static formatDroppedComponentNotInBuild(target: string, component: string): string {
    return `${Resources.droppedComponentsFolder}/${target}.txt lists ${component}, which the build's ${Resources.packageVersionsFile} doesn't.`;
  }

  public static formatDroppedUnlisted(target: string, entry: string): string {
    return `${Resources.droppedFolder}/${target}.txt drops ${entry}, which ${Resources.listingsFolder}/${target}.txt doesn't list.`;
  }

  public static formatExportFileMissing(archiveName: string, subpath: string, file: string): string {
    return `${archiveName}'s export ${subpath} names ${file}, which the archive lacks.`;
  }

  public static formatExportsInvalid(file: string): string {
    return `${file}'s ${Resources.exportsField} must map each subpath to a source.`;
  }

  public static formatExportsMissing(archiveName: string): string {
    return `${archiveName}'s package.json has no ${Resources.exportsField}.`;
  }

  public static formatExportSourceInvalid(file: string, subpath: string): string {
    return `${file}'s export ${subpath} must name a ${Resources.sourceExtension} source.`;
  }

  public static formatFieldDiffers(archiveName: string, field: string, found: string, expected: string): string {
    return `${archiveName}: its ${field} is "${found}", not "${expected}".`;
  }

  public static formatFieldNotObject(file: string, field: string): string {
    return `${file}'s ${field} must be a JSON object.`;
  }

  public static formatFieldNotTextList(file: string, field: string): string {
    return `${file}'s ${field} must be a list of text.`;
  }

  public static formatFieldPath(context: string, field: string): string {
    return `${context}.${field}`;
  }

  public static formatFiledAs(title: string, url: string): string {
    return `${title}: filed at ${url}.`;
  }

  public static formatGitFailed(gitArguments: readonly string[], exitCode: number | null, errorOutput: string): string {
    return `"git ${gitArguments.join(" ")}" failed with exit code ${exitCode}: ${errorOutput}`;
  }

  public static formatGitHubFieldNotText(context: string, field: string): string {
    return `${context}.${field} must be text.`;
  }

  public static formatGitHubNotJson(context: string, body: string): string {
    return `${context} is not JSON: ${body}`;
  }

  public static formatGitHubNotList(context: string): string {
    return `${context} must be a list.`;
  }

  public static formatGitHubNotObject(context: string): string {
    return `${context} must be an object.`;
  }

  public static formatGitHubUnreachable(address: string): string {
    return `GitHub could not be reached at ${address}.`;
  }

  public static formatGitHubUnreadable(context: string, status: number, body: string): string {
    return `GitHub answered ${status} when reading ${context}: ${body}`;
  }

  public static formatGitLicense(packageName: string, gitVersion: string, target: string, source: string, license: string): string {
    return [
      `${packageName} holds Git ${gitVersion} for ${target}, built from ${source}, and the components that build ships.`,
      '',
      "Its licence, as an SPDX expression of its components' licences:",
      '',
      license,
      '',
      `Each component's licence text is in the \`${Resources.licensesFolder}\` folder, one folder for each component, and \`${Resources.readmeFile}\` lists each component with its version and licence.`,
      ''
    ].join(Resources.lineFeed);
  }

  public static formatGitManifestDiffers(file: string, target: string, expected: string): string {
    return `${file} differs from the manifest ${Resources.buildsFile}, ${Resources.formatComponentsFile(target)} and the version give; it must hold:\n${expected}`;
  }

  public static formatGitManifestMissing(file: string, expected: string): string {
    return `${file} is missing; the release lists its packages from their committed manifests, so it must hold:\n${expected}`;
  }

  public static formatGitPackageDescription(gitVersion: string, target: string): string {
    return `Git ${gitVersion} for ${target}, which the checkpoints module runs as its own Git.`;
  }

  public static formatGitPackageName(moduleName: string, target: string): string {
    return `${moduleName}.git.${target}`;
  }

  public static formatGitProgramMissing(archiveName: string, program: string): string {
    return `${archiveName}'s package.json names its Git program as ${program}, which the archive lacks.`;
  }

  public static formatGitReadme(packageName: string, gitVersion: string, target: string, url: string, sha256: string, source: string, rows: readonly string[]): string {
    return [
      `# ${packageName}`,
      '',
      `Git ${gitVersion} for ${target}, which the checkpoints module runs as its own Git; the module never runs an installed Git.`,
      '',
      `- The build: ${url}, with the SHA-256 ${sha256}.`,
      `- Its source: ${source}.`,
      `- Its components' licences: in the \`${Resources.licensesFolder}\` folder, one folder for each component.`,
      '',
      "| Component | Version | Licence |",
      "|---|---|---|",
      ...rows,
      ''
    ].join(Resources.lineFeed);
  }

  public static formatGitReleasePageInvalid(context: string, url: string): string {
    return `${context}.${Resources.htmlUrlField} ${JSON.stringify(url)} is not a page on GitHub.`;
  }

  public static formatGitReleaseTagInvalid(context: string, tag: string): string {
    return `${context}.${Resources.tagNameField} ${JSON.stringify(tag)} is not a release tag.`;
  }

  public static formatGitWorkFolder(target: string): string {
    return `git-${target}`;
  }

  public static formatHostBuildMissing(host: string): string {
    return `${Resources.buildsFile} pins no Git build for ${host}, the target this build runs on.`;
  }

  public static formatHostTarget(platform: string, architecture: string): string {
    return `${platform}-${architecture}`;
  }

  public static formatInstallFailed(packageName: string, exitCode: number | null, output: string): string {
    return `Installing the packed archives for ${packageName} failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatIssueBody(source: string, tag: string, url: string, replaced: string, targets: string, reported: string): string {
    return [
      "## What and why",
      '',
      `${source} \`${tag}\` is out, newer than what \`${Resources.gitFolder}${Resources.pathSeparator}${Resources.buildsFile}\` pins: ${replaced}.`,
      `Its notes are at ${url}. A release with a security fix goes ahead of feature work, as \`documents/ARCHITECTURE.md\`'s Git builds section says.`,
      '',
      "## Done when",
      '',
      `- [ ] \`${Resources.buildsFile}\` pins ${source} \`${tag}\` for ${targets}, with each archive's address, size and SHA-256, and its Git version and source.`,
      ...(reported === "" ? [] : [`- [ ] \`${Resources.buildsFile}\` drops \`${Resources.reportedVersionField}\` for ${reported} where the new build reports its Git version.`]),
      "- [ ] A release of the module follows.",
      '',
      "Filed by the weekly Git builds check.",
      `<!-- git-build-check: ${source} ${tag} -->`
    ].join(Resources.lineFeed);
  }

  public static formatIssueNotClosed(url: string, status: number, body: string): string {
    return `GitHub answered ${status} when closing ${url}, which a newer release supersedes: ${body}`;
  }

  public static formatIssueNotFiled(title: string, status: number, body: string): string {
    return `GitHub answered ${status} when filing "${title}": ${body}`;
  }

  public static formatIssueNumberInvalid(context: string): string {
    return `${context}.number must be an issue's number.`;
  }

  public static formatIssueResource(repository: string, issue: number): string {
    return `repos/${repository}/issues/${issue}`;
  }

  public static formatIssuesContext(repository: string): string {
    return `${repository}'s issues`;
  }

  public static formatIssuesQuery(repository: string, page: number): string {
    return `repos/${repository}/issues?state=all&creator=${encodeURIComponent(Resources.issuesCreator)}&per_page=${Resources.issuesPageSize}&page=${page}`;
  }

  public static formatIssuesResource(repository: string): string {
    return `repos/${repository}/issues`;
  }

  public static formatIssueTitle(source: string, tag: string): string {
    return `Pin ${source} ${tag} in ${Resources.buildsFile}`;
  }

  public static formatIssueUnlabelled(title: string, url: string): string {
    return `${title}: filed at ${url}, but GitHub left off its ${Resources.issueLabel} label, so the maintainers' weekly look won't find it.`;
  }

  public static formatLatestReleaseContext(source: string): string {
    return `${source}'s latest release`;
  }

  public static formatLatestReleaseResource(repository: string): string {
    return `repos/${repository}/releases/latest`;
  }

  public static formatLicenceTextMissing(file: string, component: string, text: string, inBuild: boolean): string {
    return `${file} takes ${component}'s licence from ${text}, which ${inBuild ? "the unpacked build" : Resources.gitFolder} lacks.`;
  }

  public static formatLicenseGroup(license: string): string {
    return `(${license})`;
  }

  public static formatLine(text: string): string {
    return `${text}\n`;
  }

  public static formatLinkTarget(target: string): string {
    return `-> ${target}`;
  }

  public static formatListedEntryMissing(target: string, entry: string, url: string): string {
    return `${Resources.listingsFolder}/${target}.txt lists ${entry}, which ${url} lacks.`;
  }

  public static formatListingDiffers(differences: readonly string[]): string {
    return differences.slice(0, Resources.reportedDifferences).join(Resources.lineFeed);
  }

  public static formatManifestContext(archiveName: string): string {
    return `${archiveName} ${Resources.formatArchiveEntry(Resources.manifestFile)}`;
  }

  public static formatManifestFieldMissing(file: string, field: string): string {
    return `${file} has no ${field}.`;
  }

  public static formatManifestFieldNotString(file: string, field: string): string {
    return `${file}'s ${field} must be a string.`;
  }

  public static formatManifestNotObject(file: string): string {
    return `${file} must be a JSON object.`;
  }

  public static formatMarkedPrivate(archiveName: string): string {
    return `${archiveName}: is marked private, so npm would refuse to publish it.`;
  }

  public static formatModuleFileMissing(archiveName: string): string {
    return `${archiveName} has no ${Resources.moduleFile} at its root.`;
  }

  public static formatModuleFileNotJson(archiveName: string): string {
    return `${archiveName}'s ${Resources.moduleFile} is not JSON.`;
  }

  public static formatModuleVersionDiffers(archiveName: string, declared: string, version: string): string {
    return `${archiveName}'s ${Resources.moduleFile} declares version ${declared}, and its package ${version}.`;
  }

  public static formatOutsideScope(archiveName: string, packageName: string, scope: string): string {
    return `${archiveName}: ${packageName} is outside the scope ${scope}.`;
  }

  public static formatOwnDependenciesInvalid(file: string, ownField: string, field: string): string {
    return `${file}'s ${Resources.ownField}.${ownField} must list the repository's packages it needs, beside its version and ${field}.`;
  }

  public static formatPackageMisnamed(folder: string, packageName: string, expectedName: string): string {
    return `${folder}/package.json names the package ${packageName}; the layout names it ${expectedName}.`;
  }

  public static formatPackageSpec(name: string, version: string): string {
    return `${name}@${version}`;
  }

  public static formatPackageVersion(name: string, version: string): string {
    return `${name} ${version}`;
  }

  public static formatPackageVersionUnlisted(file: string, component: string): string {
    return `The build's ${Resources.packageVersionsFile} lists ${component}, which ${file} doesn't.`;
  }

  public static formatPackageVersionsMissing(target: string, url: string): string {
    return `The MinGit build for ${target}, ${url}, holds no ${Resources.packageVersionsFile}, which the build checks its components against.`;
  }

  public static formatPackingFailed(packageName: string, exitCode: number | null, output: string): string {
    return `Packing ${packageName} failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPartBuildMissing(packageName: string): string {
    return `${Resources.buildsFile} pins no build for ${packageName}.`;
  }

  public static formatPeerMoved(dependency: string, version: string): string {
    return `Moved ${dependency} to ${version}, the newest published version inside the packages' peer ranges.`;
  }

  public static formatPeerMoveFailed(exitCode: number | null, output: string): string {
    return `Installing the newest peers inside their ranges at the root failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPeerNotMoved(dependency: string, installed: string, version: string): string {
    return `The root's node_modules holds ${dependency} ${installed} after the move, not ${version}.`;
  }

  public static formatPeerVersionsUnread(dependency: string, exitCode: number | null, output: string): string {
    return `npm view ${dependency} versions failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPeerVersionsNotJson(dependency: string, output: string): string {
    return `npm view ${dependency} versions gave output that is not JSON:\n${output}`;
  }

  public static formatPeerManifestUnreadable(dependency: string, file: string): string {
    return `The root's node_modules holds no readable manifest of ${dependency} after the move: ${file} is missing or not JSON.`;
  }

  public static formatPeerOutsideRange(archiveName: string, dependency: string, taken: string, field: string, range: string): string {
    return `${archiveName} takes ${dependency} at ${taken} in ${field}, not at the module's Noldova Desktop range ${range}.`;
  }

  public static formatPeerPinMissing(archiveName: string, dependency: string, pin: string): string {
    return `${archiveName} takes the peer ${dependency}, which the root package.json pins at ${pin}, not at one exact major.minor.patch version.`;
  }

  public static formatPeerNoVersion(dependency: string, ranges: readonly string[]): string {
    return `npm view gives no published version of ${dependency} inside ${ranges.join(" and ")}.`;
  }

  public static formatPeerRangeInvalid(archiveName: string, dependency: string, taken: string): string {
    return `${archiveName} takes the peer ${dependency} at ${taken}, not ">=<lowest version> <first version refused>" with the first refused the next minor of a 0.x lowest version, such as <0.1.0 for any 0.0.x, or the next major from 1.0.0.`;
  }

  public static formatPeerRangeMissesPin(archiveName: string, dependency: string, taken: string, pin: string): string {
    return `${archiveName} takes the peer ${dependency} at ${taken}, which doesn't hold ${pin}, the version the root package.json pins and the build is tested with.`;
  }

  public static formatProcessNotStarted(command: string): string {
    return `"${command}" could not start.`;
  }

  public static formatProcessNotStopped(command: string, wait: number): string {
    return `"${command}" did not end within ${wait} ms of being stopped.`;
  }

  public static formatProcessOutputTooLong(command: string, limit: number): string {
    return `"${command}" wrote more than ${limit} bytes.`;
  }

  public static formatProcessTimeout(command: string, timeout: number): string {
    return `"${command}" did not finish within ${timeout} ms.`;
  }

  public static formatProjectNotTypeChecked(project: string): string {
    return `${project} doesn't type-check.`;
  }

  public static formatProtocolPackageName(moduleName: string): string {
    return `${moduleName}.protocol`;
  }

  public static formatReadmeMissing(folder: string, name: string): string {
    return `${folder} lacks ${Resources.readmeFile}, which npm shows as ${name}'s page.`;
  }

  public static formatReleaseCommitInvalid(commit: string | undefined): string {
    return `The commit "${commit}" is not a full 40-character commit hash.`;
  }

  public static formatReleaseCommitUnrecorded(commit: string): string {
    return `A release build records ${Resources.releaseCommitVariable}, the full hash of the commit it builds, as each package's gitHead, but it is "${commit}".`;
  }

  public static formatReleaseDownloadPrefix(repository: string): string {
    return `https://github.com/${repository}/releases/download/`;
  }

  public static formatReleaseFindings(findings: readonly string[]): string {
    return findings.join(Resources.lineFeed);
  }

  public static formatReleaseFolderMissing(folder: string): string {
    return `There is no folder ${folder} with the archives to release.`;
  }

  public static formatReleaseHeadDiffers(head: string, commit: string): string {
    return `The checkout is at ${head}, not at ${commit}, the commit to release.`;
  }

  public static formatReleaseManifestFieldInvalid(context: string, field: string): string {
    return `${context}.${field} is missing or of the wrong type.`;
  }

  public static formatReleaseManifestInvalid(context: string): string {
    return `${context} is not a JSON object.`;
  }

  public static formatReleaseVariableMissing(variable: string): string {
    return `${variable} is not set; the shared npm release workflow sets it.`;
  }

  public static formatReleaseVersionInvalid(version: string | undefined): string {
    return `The version "${version}" is not of the form 0.0.<n>, which the organization's packages use for now.`;
  }

  public static formatReplacedRelease(tag: string, targets: string): string {
    return `\`${tag}\` for ${targets}`;
  }

  public static formatResourceAddress(address: string, resource: string): string {
    return `${address}/${resource}`;
  }

  public static formatRootVersionInvalid(found: unknown): string {
    return `The root package.json must declare a version of the form major.minor.patch, with an optional prerelease such as -rc.1, but declares ${found === undefined ? "none" : JSON.stringify(found)}.`;
  }

  public static formatSkipWithoutReason(file: string, name: string): string {
    return `${file}: "${name}" is skipped without a reason; a skip names why, beside its test.`;
  }

  public static formatSupersededBy(title: string, url: string): string {
    return `A newer release supersedes this one: ${title}, at ${url}.`;
  }

  public static formatTakesNoOtherOption(option: string): string {
    return `${option} takes no other option.`;
  }

  public static formatTargetAddressInvalid(file: string, target: string): string {
    return `${file}'s ${target}.url must be an https address of a .zip or .tar.gz archive.`;
  }

  public static formatTargetFieldNotText(file: string, target: string, field: string): string {
    return `${file}'s ${target}.${field} must be text.`;
  }

  public static formatTargetHashInvalid(file: string, target: string): string {
    return `${file}'s ${target}.sha256 must be 64 lowercase hexadecimal digits.`;
  }

  public static formatTargetListed(target: string, count: number, url: string): string {
    return `${target}: listed ${count} entries of ${url}.`;
  }

  public static formatTargetMissing(archiveName: string, field: string): string {
    return `${archiveName}'s package.json names no single target in ${field}, so npm would install it on every target.`;
  }

  public static formatTargetReportedVersionInvalid(file: string, target: string, gitVersion: string): string {
    return `${file}'s ${target}.${Resources.reportedVersionField} must be ${gitVersion}, its gitVersion, then a full stop and lowercase letters, as 2.56.0.dirty is.`;
  }

  public static formatTargetSizeInvalid(file: string, target: string): string {
    return `${file}'s ${target}.size must be the archive's size in bytes.`;
  }

  public static formatTargetSourceUnknown(target: string, url: string, repositories: readonly string[]): string {
    return `${Resources.buildsFile} pins ${target} at ${url}, which is a release of no source the check knows: ${repositories.join(Resources.listSeparator)}.`;
  }

  public static formatTargetTextFile(target: string): string {
    return `${target}.txt`;
  }

  public static formatTargetUnknown(file: string, target: string): string {
    return `${file} names a target ${target}, not <platform>-<arch> of a target the module supports.`;
  }

  public static formatTarPath(prefix: string, name: string): string {
    return `${prefix}/${name}`;
  }

  public static formatTaskKillArguments(processId: number): readonly string[] {
    return ["/pid", String(processId), "/T", "/F"];
  }

  public static formatTestFileHung(file: string, limit: number): string {
    return `${file} is still running ${limit} ms after its last test event: a test of it reached its own ${limit} ms limit without ending, or a handle or a process it left keeps it from exiting. The run stops its test processes and fails.\n`;
  }

  public static formatTestFileOverBudget(file: string, median: number): string {
    return `${file} takes ${median} ms at its median, over the ${Resources.testFileBudget} ms a unit test file may take with its ${Math.round(Resources.timingMargin * 100)}% margin.`;
  }

  public static formatTestFileSlow(file: string, duration: number): string {
    return `${file} took ${duration} ms in this run, over the ${Resources.testFileBudget} ms a unit test file may take; npm run test:timing checks it.`;
  }

  public static formatTestFileTime(file: string, median: number, runs: number): string {
    return `${file}: ${median} ms at its median of ${runs} runs.`;
  }

  public static formatTestRepeated(file: string, name: string): string {
    return `${file} holds more than one test named "${name}"; each test's suites and name must name it alone.`;
  }

  public static formatTestReporterOptions(reporter: string, resultsFile: string): readonly string[] {
    return ["--test-reporter=spec", "--test-reporter-destination=stdout", `--test-reporter=${reporter}`, `--test-reporter-destination=${resultsFile}`];
  }

  public static formatTestResultsMissing(resultsFile: string): string {
    return `The test run wrote no results to ${resultsFile}.`;
  }

  public static formatTestResultUnreadable(resultsFile: string, line: string): string {
    return `${resultsFile} holds a line that is not a test's result: ${line}`;
  }

  public static formatTestsLineMalformed(file: string, line: number): string {
    return `${file}:${line} is not a Tests line of double-quoted test names joined by "; " and ending in a full stop, all on one line.`;
  }

  public static formatTestsLinesMissing(file: string): string {
    return `${file} cites no tests; each section's Tests line names the tests that hold its rules.`;
  }

  public static formatTestTimeoutOption(timeout: number): string {
    return `--test-timeout=${timeout}`;
  }

  public static formatUnpacked(packageName: string, count: number, gitVersion: string, dropped: number): string {
    return `${packageName}: unpacked ${count} files of Git ${gitVersion}, less ${dropped} dropped paths.`;
  }

  public static formatUpToDate(source: string, tag: string): string {
    return `${source}: no target pins a release older than its latest, ${tag}.`;
  }

  public static formatVersionsDiffer(released: unknown, version: string): string {
    return `${Resources.versionFile} holds the version ${JSON.stringify(released)}, but the root package.json holds ${version}; the release reads the first and builds the second, so they must be equal.`;
  }

  public static formatWorkflowVariableMissing(variable: string): string {
    return `The variable ${variable}, which the workflow sets, is missing.`;
  }
}
