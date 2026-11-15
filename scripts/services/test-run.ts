/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ProcessException } from "../exceptions/process.exception.ts";
import { TestResultsMissingException } from "../exceptions/test-results-missing.exception.ts";
import { TestRunException } from "../exceptions/test-run.exception.ts";
import { TestRecord } from "../models/test-record.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";
import { ConsumerProject } from "./consumer-project.ts";
import { ExampleWriter } from "./example-writer.ts";
import { NpmCommand } from "./npm-command.ts";
import { PackageBuild } from "./package-build.ts";
import type { ProcessRunner } from "./process-runner.ts";
import { TestCitationCheck } from "./test-citation-check.ts";
import type { WorkspaceLayout } from "./workspace-layout.ts";

export class TestRun {
  private readonly layout: WorkspaceLayout;
  private readonly report: (line: string) => void;
  private readonly resultsFile: string;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, layout: WorkspaceLayout, runner: ProcessRunner, report: (line: string) => void) {
    this.layout = layout;
    this.report = report;
    this.resultsFile = path.join(root, Resources.buildWorkFolder, Resources.testResultsFile);
    this.root = root;
    this.runner = runner;
  }

  public async runAsync(filters: readonly string[]): Promise<number> {
    try {
      const selected = filters.filter(t => !Resources.workflowOptions.includes(t));
      const isWhole = selected.length === 0;
      if (!await this.typeCheckAsync(isWhole))
        return 1;
      const exitCode = await this.runTestsAsync(isWhole ? [...Resources.coverageGates, ...Resources.testFiles] : selected);
      const records = await this.readRecordsAsync();
      const findings = [
        ...records.filter(t => t.isSkippedWithoutReason).map(t => Resources.formatSkipWithoutReason(this.relativeOf(t.file), t.name)),
        ...this.repeatsOf(records),
        ...isWhole ? await new TestCitationCheck(this.root).findingsAsync(records) : []
      ];
      for (const [file, duration] of this.durationsOf(records))
        if (duration > Resources.testFileBudget && !Resources.acceptedSlowTestFiles.includes(file))
          this.report(Resources.formatTestFileSlow(file, Math.round(duration)));
      for (const finding of findings)
        this.report(finding);
      return exitCode !== 0 ? exitCode : findings.length > 0 ? 1 : 0;
    }
    catch (error) {
      if (!(error instanceof ProcessException || error instanceof TestRunException))
        throw error;
      this.report(error.message);
      return 1;
    }
  }

  public async timeAsync(filters: readonly string[]): Promise<number> {
    try {
      const selection = filters.length === 0 ? Resources.testFiles : filters;
      const durations = new Map<string, number[]>();
      for (let run = 1; run <= Resources.timingRuns; run++) {
        const exitCode = await this.runTestsAsync(selection);
        if (exitCode !== 0)
          return exitCode;
        for (const [file, duration] of this.durationsOf(await this.readRecordsAsync()))
          durations.set(file, [...durations.get(file) ?? [], duration]);
      }
      const slow: string[] = [];
      for (const [file, times] of [...durations].sort(([first], [second]) => first.localeCompare(second))) {
        const sorted = [...times].sort((first, second) => first - second);
        const median = Math.max(...sorted.slice(0, Math.floor(sorted.length / 2) + 1));
        this.report(Resources.formatTestFileTime(file, Math.round(median), sorted.length));
        if (median > Resources.testFileBudget * (1 + Resources.timingMargin) && !Resources.acceptedSlowTestFiles.includes(file))
          slow.push(Resources.formatTestFileOverBudget(file, Math.round(median)));
      }
      for (const line of slow)
        this.report(line);
      return slow.length > 0 ? 1 : 0;
    }
    catch (error) {
      if (!(error instanceof ProcessException || error instanceof TestRunException))
        throw error;
      this.report(error.message);
      return 1;
    }
  }

  private async typeCheckAsync(withConsumer: boolean): Promise<boolean> {
    const parts = await this.layout.readPartsAsync();
    const examples = withConsumer ? [await this.writeConsumerAsync(parts)] : [];
    const projects = [...Resources.sharedProjects, ...examples, ...parts.flatMap(t => Resources.partProjects.map(u => `${t.folder}${Resources.pathSeparator}${u}`))];
    const failed: string[] = [];
    for (const project of projects)
      if (await this.runner.runAsync(process.execPath, [path.join(this.root, ...PackageBuild.compiler), Resources.projectOption, project], this.root, Resources.compileTimeout) !== 0)
        failed.push(project);
    for (const project of failed)
      this.report(Resources.formatProjectNotTypeChecked(project));
    return failed.length === 0;
  }

  private async writeConsumerAsync(parts: readonly WorkspacePart[]): Promise<string> {
    const consumer = new ConsumerProject(this.root, new NpmCommand(this.runner, process.env));
    await consumer.installAsync(parts);
    return path.relative(this.root, await new ExampleWriter(this.root).writeAsync(parts, consumer.folder)).replaceAll(path.sep, Resources.pathSeparator);
  }

  private async runTestsAsync(selection: readonly string[]): Promise<number> {
    const temporary = path.join(this.root, Resources.buildWorkFolder, Resources.testTemporaryFolder);
    await rm(temporary, { recursive: true, force: true });
    await mkdir(temporary, { recursive: true });
    await rm(this.resultsFile, { force: true });
    const reporter = pathToFileURL(path.join(this.root, ...Resources.testRecordReporter)).href;
    const parameters = [...Resources.testParameters, Resources.formatTestTimeoutOption(Resources.testTimeout), ...Resources.formatTestReporterOptions(reporter, this.resultsFile), ...selection];
    const environment: NodeJS.ProcessEnv = { ...process.env, ...Object.fromEntries(Resources.temporaryVariables.map(t => [t, temporary])) };
    return process.platform === Resources.windowsPlatform
      ? await this.runner.runAsync(Resources.powerShellProgram, [...Resources.powerShellOptions, path.join(this.root, ...Resources.privilegesScript), process.execPath, ...parameters], this.root,
        undefined, environment)
      : await this.runner.runAsync(process.execPath, parameters, this.root, undefined, environment);
  }

  private async readRecordsAsync(): Promise<readonly TestRecord[]> {
    if (!existsSync(this.resultsFile))
      throw new TestResultsMissingException(this.resultsFile);
    return (await readFile(this.resultsFile, Resources.utf8Encoding)).split(Resources.lineFeed).filter(t => t !== "").map(t => TestRecord.parse(t, this.resultsFile));
  }

  private repeatsOf(records: readonly TestRecord[]): readonly string[] {
    const names = new Map<string, string[]>();
    for (const record of records)
      names.set(record.file, [...names.get(record.file) ?? [], record.name]);
    const findings: string[] = [];
    for (const [file, fileNames] of names)
      for (const name of new Set(fileNames.filter((t, i) => fileNames.indexOf(t) !== i)))
        findings.push(Resources.formatTestRepeated(this.relativeOf(file), name));
    return findings;
  }

  private durationsOf(records: readonly TestRecord[]): ReadonlyMap<string, number> {
    const durations = new Map<string, number>();
    for (const record of records.filter(t => t.isTopLevel))
      durations.set(this.relativeOf(record.file), (durations.get(this.relativeOf(record.file)) ?? 0) + record.duration);
    return durations;
  }

  private relativeOf(file: string): string {
    return path.relative(this.root, file).replaceAll(path.sep, Resources.pathSeparator);
  }
}
