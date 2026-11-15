/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class IssueNotClosedException extends GitHubException {
  public readonly url: string;
  public readonly status: number;
  public readonly body: string;

  public constructor(url: string, status: number, body: string) {
    super(Resources.formatIssueNotClosed(url, status, body));

    this.url = url;
    this.status = status;
    this.body = body;
  }
}
