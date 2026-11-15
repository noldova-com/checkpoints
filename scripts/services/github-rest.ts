/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GitHubBodyTooLongException } from "../exceptions/github-body-too-long.exception.ts";
import { GitHubTimeoutException } from "../exceptions/github-timeout.exception.ts";
import { GitHubUnreachableException } from "../exceptions/github-unreachable.exception.ts";
import { Resources } from "../resources.ts";

export class GitHubRest {
  private readonly address: string;
  private readonly token: string;

  public constructor(address: string, token: string) {
    this.address = address;
    this.token = token;
  }

  public async requestAsync(method: string, resource: string, body?: Readonly<Record<string, unknown>>): Promise<Response> {
    try {
      return await fetch(Resources.formatResourceAddress(this.address, resource), {
        method,
        headers: {
          [Resources.acceptHeader]: Resources.gitHubMediaType,
          [Resources.authorizationHeader]: Resources.formatBearer(this.token),
          [Resources.apiVersionHeader]: Resources.gitHubApiVersion
        },
        signal: AbortSignal.timeout(Resources.gitHubTimeout),
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    }
    catch (error) {
      if (GitHubRest.isTimeout(error))
        throw new GitHubTimeoutException(this.address, Resources.gitHubTimeout, error);
      if (!(error instanceof TypeError && error.message === Resources.fetchFailedMessage && error.cause instanceof Error))
        throw error;
      throw new GitHubUnreachableException(this.address, error);
    }
  }

  public async readTextAsync(response: Response, context: string): Promise<string> {
    if (Number(response.headers.get(Resources.contentLengthHeader)) > Resources.gitHubBodyLimit)
      throw new GitHubBodyTooLongException(context, Resources.gitHubBodyLimit);
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (let read = await reader?.read(); read !== undefined && !read.done; read = await reader?.read()) {
        const chunk = Buffer.from(read.value);
        size += chunk.length;
        if (size > Resources.gitHubBodyLimit)
          throw new GitHubBodyTooLongException(context, Resources.gitHubBodyLimit);
        chunks.push(chunk);
      }
    }
    catch (error) {
      if (!GitHubRest.isTimeout(error))
        throw error;
      throw new GitHubTimeoutException(this.address, Resources.gitHubTimeout, error);
    }
    return Buffer.concat(chunks).toString(Resources.utf8Encoding);
  }

  private static isTimeout(error: unknown): boolean {
    return error instanceof DOMException && error.name === Resources.timeoutErrorName;
  }
}
