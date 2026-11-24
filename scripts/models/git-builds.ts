/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { BuildsEmptyException } from "../exceptions/builds-empty.exception.ts";
import { FieldNotObjectException } from "../exceptions/field-not-object.exception.ts";
import { SourcesFieldInvalidException } from "../exceptions/sources-field-invalid.exception.ts";
import { Resources } from "../resources.ts";
import { GitSources } from "./git-sources.ts";
import { GitTarget } from "./git-target.ts";

export class GitBuilds {
  public readonly sources: GitSources;
  public readonly targets: readonly GitTarget[];

  public constructor(targets: readonly GitTarget[], sources: GitSources) {
    this.sources = sources;
    this.targets = targets;
  }

  public static parse(json: unknown, file: string): GitBuilds {
    const fields = GitBuilds.readObject(json, Resources.rootContext, file);
    const targets = Object.entries(GitBuilds.readObject(fields[Resources.targetsField], Resources.targetsField, file))
      .map(([target, value]) => new GitTarget(target, GitBuilds.readObject(value, target, file), file));
    if (targets.length === 0)
      throw new BuildsEmptyException(file);
    const sources = GitSources.parse(fields[Resources.sourcesField], file);
    const unknown = targets.find(t => !sources.archives.has(t.sourceArchive));
    if (unknown !== undefined)
      throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(unknown.target, Resources.sourceArchiveField));

    return new GitBuilds(targets, sources);
  }

  private static readObject(value: unknown, field: string, file: string): Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new FieldNotObjectException(file, field);
    return Object.fromEntries(Object.entries(value));
  }
}
