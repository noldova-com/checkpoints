/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonFixture, type JsonFields } from "./json.fixture.ts";

export class ScriptViewStep {
  public readonly aside: string | null;
  public readonly path: string;
  public readonly stage: string | null;

  public constructor(path: string, stage: string | null, aside: string | null) {
    this.aside = aside;
    this.path = path;
    this.stage = stage;
  }

  public static fromJson(fields: JsonFields): ScriptViewStep {
    return new ScriptViewStep(JsonFixture.textOf(fields["path"]), ScriptViewStep.textOrNullOf(fields["stage"]), ScriptViewStep.textOrNullOf(fields["aside"]));
  }

  private static textOrNullOf(value: unknown): string | null {
    return value === null ? null : JsonFixture.textOf(value);
  }
}
