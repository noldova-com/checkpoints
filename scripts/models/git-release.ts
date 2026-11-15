/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GitReleasePageInvalidException } from "../exceptions/git-release-page-invalid.exception.ts";
import { GitReleaseTagInvalidException } from "../exceptions/git-release-tag-invalid.exception.ts";
import { Resources } from "../resources.ts";
import { GitHubJson } from "../services/github-json.ts";

export class GitRelease {
  public readonly tag: string;
  public readonly url: string;

  public constructor(tag: string, url: string) {
    this.tag = tag;
    this.url = url;
  }

  public static fromJson(value: unknown, context: string): GitRelease {
    const fields = GitHubJson.object(value, context);
    const tag = GitHubJson.text(fields, Resources.tagNameField, context);
    if (!Resources.releaseTagPattern.test(tag))
      throw new GitReleaseTagInvalidException(context, tag);
    const url = GitHubJson.text(fields, Resources.htmlUrlField, context);
    if (!Resources.releasePagePattern.test(url))
      throw new GitReleasePageInvalidException(context, url);
    return new GitRelease(tag, url);
  }

  public static compareTags(tag: string, other: string): number {
    const numbers = GitRelease.numbersOf(tag);
    const others = GitRelease.numbersOf(other);
    for (let index = 0; index < Math.min(numbers.length, others.length); index++)
      if (numbers[index] !== others[index])
        return Number(numbers[index]) - Number(others[index]);
    return numbers.length - others.length;
  }

  private static numbersOf(tag: string): readonly number[] {
    return (tag.match(Resources.numberPattern) ?? []).map(t => Number(t));
  }
}
