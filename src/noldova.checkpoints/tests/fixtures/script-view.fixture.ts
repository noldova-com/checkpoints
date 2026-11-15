/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonFixture, type JsonFields } from "./json.fixture.ts";
import { ScriptViewStep } from "./script-view-step.fixture.ts";

export class ScriptView {
  public readonly before: string;
  public readonly restoreId: string;
  public readonly steps: readonly ScriptViewStep[];

  public constructor(restoreId: string, before: string, steps: readonly ScriptViewStep[]) {
    this.before = before;
    this.restoreId = restoreId;
    this.steps = steps;
  }

  public static fromJson(fields: JsonFields): ScriptView {
    return new ScriptView(JsonFixture.textOf(fields["restoreId"]), JsonFixture.textOf(fields["before"]), JsonFixture.objectsOf(fields["steps"]).map(t => ScriptViewStep.fromJson(t)));
  }
}
