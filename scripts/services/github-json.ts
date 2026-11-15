/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GitHubFieldNotTextException } from "../exceptions/github-field-not-text.exception.ts";
import { GitHubNotObjectException } from "../exceptions/github-not-object.exception.ts";
import { Resources } from "../resources.ts";

export class GitHubJson {
  public static object(value: unknown, context: string): Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new GitHubNotObjectException(context);
    return Object.fromEntries(Object.entries(value));
  }

  public static child(source: Readonly<Record<string, unknown>>, key: string, context: string): Readonly<Record<string, unknown>> {
    return GitHubJson.object(source[key], Resources.formatFieldPath(context, key));
  }

  public static nullableChild(source: Readonly<Record<string, unknown>>, key: string, context: string): Readonly<Record<string, unknown>> | null {
    return source[key] === null ? null : GitHubJson.child(source, key, context);
  }

  public static text(source: Readonly<Record<string, unknown>>, key: string, context: string): string {
    const value = source[key];
    if (typeof value !== "string")
      throw new GitHubFieldNotTextException(context, key);
    return value;
  }
}
