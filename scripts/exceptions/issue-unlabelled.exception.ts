/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class IssueUnlabelledException extends GitHubException {
  public readonly title: string;
  public readonly url: string;

  public constructor(title: string, url: string) {
    super(Resources.formatIssueUnlabelled(title, url));

    this.title = title;
    this.url = url;
  }
}
