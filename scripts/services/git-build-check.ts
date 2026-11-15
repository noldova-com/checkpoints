/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Writable } from "node:stream";

import { GitHubNotJsonException } from "../exceptions/github-not-json.exception.ts";
import { GitHubNotListException } from "../exceptions/github-not-list.exception.ts";
import { GitHubUnreadableException } from "../exceptions/github-unreadable.exception.ts";
import { GitHubException } from "../exceptions/github.exception.ts";
import { IssueNotClosedException } from "../exceptions/issue-not-closed.exception.ts";
import { IssueNotFiledException } from "../exceptions/issue-not-filed.exception.ts";
import { IssueNumberInvalidException } from "../exceptions/issue-number-invalid.exception.ts";
import { IssueUnlabelledException } from "../exceptions/issue-unlabelled.exception.ts";
import { PackageException } from "../exceptions/package.exception.ts";
import { ReleaseException } from "../exceptions/release.exception.ts";
import { TargetSourceUnknownException } from "../exceptions/target-source-unknown.exception.ts";
import { WorkflowVariableMissingException } from "../exceptions/workflow-variable-missing.exception.ts";
import { FiledIssue } from "../models/filed-issue.ts";
import { GitBuildSource } from "../models/git-build-source.ts";
import type { GitBuilds } from "../models/git-builds.ts";
import { GitRelease } from "../models/git-release.ts";
import { NewerRelease } from "../models/newer-release.ts";
import { PinnedTag } from "../models/pinned-tag.ts";
import { Resources } from "../resources.ts";
import { GitHubJson } from "./github-json.ts";
import { GitHubRest } from "./github-rest.ts";
import { WorkspaceLayout } from "./workspace-layout.ts";

export class GitBuildCheck {
  private readonly environment: NodeJS.ProcessEnv;
  private readonly output: Writable;
  private readonly root: string;

  public constructor(root: string, environment: NodeJS.ProcessEnv, output: Writable) {
    this.environment = environment;
    this.output = output;
    this.root = root;
  }

  public async runAsync(): Promise<number> {
    try {
      const builds = await new WorkspaceLayout(this.root).readBuildsAsync();
      GitBuildCheck.checkSources(builds);
      const api = new GitHubRest(this.readVariable(Resources.apiUrlVariable), this.readVariable(Resources.tokenVariable));
      const repository = this.readVariable(Resources.repositoryVariable);
      const filed = await GitBuildCheck.listFiledAsync(api, repository);
      const newer: NewerRelease[] = [];
      for (const source of GitBuildSource.all) {
        const found = await this.findNewerAsync(api, builds, source);
        if (found !== null)
          newer.push(found);
      }
      for (const found of newer)
        await this.fileAsync(api, repository, found, filed);
      return 0;
    }
    catch (error) {
      if (!(error instanceof GitHubException || error instanceof PackageException || error instanceof ReleaseException))
        throw error;
      this.output.write(Resources.formatLine(error.message));
      return 1;
    }
  }

  private static checkSources(builds: GitBuilds): void {
    for (const target of builds.targets)
      if (GitBuildSource.all.every(t => t.tagOf(target) === null))
        throw new TargetSourceUnknownException(target.target, target.url, GitBuildSource.all.map(t => t.repository));
  }

  private static async listFiledAsync(api: GitHubRest, repository: string): Promise<readonly FiledIssue[]> {
    const filed: FiledIssue[] = [];
    const context = Resources.formatIssuesContext(repository);
    for (let page = 1, count = Resources.issuesPageSize; count >= Resources.issuesPageSize; page++) {
      const response = await api.requestAsync(Resources.readMethod, Resources.formatIssuesQuery(repository, page));
      if (response.status !== Resources.foundStatus)
        throw new GitHubUnreadableException(context, response.status, await api.readTextAsync(response, context));
      const issues = await GitBuildCheck.readJsonAsync(api, response, context);
      if (!Array.isArray(issues))
        throw new GitHubNotListException(context);
      for (const item of issues) {
        const issue = GitHubJson.object(item, context);
        const marker = Resources.issueMarkerPattern.exec(issue[Resources.bodyField] === null ? "" : GitHubJson.text(issue, Resources.bodyField, context));
        const source = marker?.groups?.[Resources.markerSourceGroup];
        const tag = marker?.groups?.[Resources.markerTagGroup];
        if (source !== undefined && tag !== undefined)
          filed.push(new FiledIssue(GitBuildCheck.numberOf(issue, context), GitHubJson.text(issue, Resources.htmlUrlField, context),
            GitHubJson.text(issue, Resources.stateField, context) === Resources.openState, source, tag));
      }
      count = issues.length;
    }
    return filed;
  }

  private static async readLatestAsync(api: GitHubRest, source: GitBuildSource): Promise<GitRelease> {
    const context = Resources.formatLatestReleaseContext(source.name);
    const response = await api.requestAsync(Resources.readMethod, Resources.formatLatestReleaseResource(source.repository));
    if (response.status !== Resources.foundStatus)
      throw new GitHubUnreadableException(context, response.status, await api.readTextAsync(response, context));
    return GitRelease.fromJson(await GitBuildCheck.readJsonAsync(api, response, context), context);
  }

  private static async readJsonAsync(api: GitHubRest, response: Response, context: string): Promise<unknown> {
    const text = await api.readTextAsync(response, context);
    try {
      return JSON.parse(text);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new GitHubNotJsonException(context, text, error);
    }
  }

  private static bodyOf(newer: NewerRelease): string {
    const targets = newer.older.map(t => Resources.formatCode(t.target)).join(Resources.listSeparator);
    const replaced = [...new Set(newer.older.map(t => t.tag))]
      .map(t => Resources.formatReplacedRelease(t, newer.older.filter(u => u.tag === t).map(u => Resources.formatCode(u.target)).join(Resources.listSeparator)));
    return Resources.formatIssueBody(newer.source.name, newer.release.tag, newer.release.url, replaced.join(Resources.clauseSeparator), targets);
  }

  private static numberOf(issue: Readonly<Record<string, unknown>>, context: string): number {
    const number = issue[Resources.numberField];
    if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 1)
      throw new IssueNumberInvalidException(context);
    return number;
  }

  private static labelsOf(issue: Readonly<Record<string, unknown>>, context: string): string[] {
    const labels = issue[Resources.labelsField];
    const labelsContext = Resources.formatFieldPath(context, Resources.labelsField);
    if (!Array.isArray(labels))
      throw new GitHubNotListException(labelsContext);
    return labels.map(t => GitHubJson.text(GitHubJson.object(t, labelsContext), Resources.nameField, labelsContext));
  }

  private async findNewerAsync(api: GitHubRest, builds: GitBuilds, source: GitBuildSource): Promise<NewerRelease | null> {
    const pinned = builds.targets.flatMap(t => {
      const tag = source.tagOf(t);
      return tag === null ? [] : [new PinnedTag(t.target, tag)];
    });
    if (pinned.length === 0)
      return null;

    const release = await GitBuildCheck.readLatestAsync(api, source);
    const older = pinned.filter(t => GitRelease.compareTags(release.tag, t.tag) > 0);
    if (older.length === 0) {
      this.output.write(Resources.formatLine(Resources.formatUpToDate(source.name, release.tag)));
      return null;
    }
    return new NewerRelease(source, release, older);
  }

  private async fileAsync(api: GitHubRest, repository: string, newer: NewerRelease, filed: readonly FiledIssue[]): Promise<void> {
    const title = Resources.formatIssueTitle(newer.source.name, newer.release.tag);
    const existing = filed.find(t => t.source === newer.source.name && t.tag === newer.release.tag);
    if (existing !== undefined)
      this.output.write(Resources.formatLine(Resources.formatAlreadyFiled(title, existing.url)));
    const url = existing?.url ?? await this.createAsync(api, repository, newer, title);
    for (const superseded of filed.filter(t => t.isOpen && t.source === newer.source.name && GitRelease.compareTags(newer.release.tag, t.tag) > 0))
      await this.closeAsync(api, repository, superseded, title, url);
  }

  private async createAsync(api: GitHubRest, repository: string, newer: NewerRelease, title: string): Promise<string> {
    const created = await api.requestAsync(Resources.createMethod, Resources.formatIssuesResource(repository),
      { title, body: GitBuildCheck.bodyOf(newer), labels: [Resources.issueLabel] });
    if (created.status !== Resources.createdStatus)
      throw new IssueNotFiledException(title, created.status, await api.readTextAsync(created, title));
    const issue = GitHubJson.object(await GitBuildCheck.readJsonAsync(api, created, title), title);
    const url = GitHubJson.text(issue, Resources.htmlUrlField, title);
    if (!GitBuildCheck.labelsOf(issue, title).includes(Resources.issueLabel))
      throw new IssueUnlabelledException(title, url);
    this.output.write(Resources.formatLine(Resources.formatFiledAs(title, url)));
    return url;
  }

  private async closeAsync(api: GitHubRest, repository: string, superseded: FiledIssue, title: string, url: string): Promise<void> {
    const resource = Resources.formatIssueResource(repository, superseded.number);
    const commented = await api.requestAsync(Resources.createMethod, Resources.formatCommentsResource(resource), { body: Resources.formatSupersededBy(title, url) });
    if (commented.status !== Resources.createdStatus)
      throw new IssueNotClosedException(superseded.url, commented.status, await api.readTextAsync(commented, superseded.url));
    const closed = await api.requestAsync(Resources.updateMethod, resource, { state: Resources.closedState, state_reason: Resources.notPlannedReason });
    if (closed.status !== Resources.foundStatus)
      throw new IssueNotClosedException(superseded.url, closed.status, await api.readTextAsync(closed, superseded.url));
    this.output.write(Resources.formatLine(Resources.formatClosedAs(superseded.url, title)));
  }

  private readVariable(name: string): string {
    const value = this.environment[name];
    if (value === undefined || value.length === 0)
      throw new WorkflowVariableMissingException(name);
    return value;
  }
}
