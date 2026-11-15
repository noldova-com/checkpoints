/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class IssueNotFiledException extends GitHubException {
  public readonly title: string;
  public readonly status: number;
  public readonly body: string;

  public constructor(title: string, status: number, body: string) {
    super(Resources.formatIssueNotFiled(title, status, body));

    this.title = title;
    this.status = status;
    this.body = body;
  }
}
