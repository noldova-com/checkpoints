/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { StoreAnswersMismatchException } from "../exceptions/store-answers-mismatch.exception.ts";
import { StoredObject } from "./stored-object.ts";

export class ObjectBatch {
  private readonly byName: ReadonlyMap<string, StoredObject>;

  public constructor(names: readonly string[], objects: readonly StoredObject[]) {
    const answers = [...objects];
    const byName = new Map<string, StoredObject>();
    for (const name of names) {
      const answer = answers.shift();
      if (Object.isUndefined(answer))
        throw new StoreAnswersMismatchException(names.length, objects.length);
      byName.set(name, answer);
    }
    if (answers.length > 0)
      throw new StoreAnswersMismatchException(names.length, objects.length);
    this.byName = byName;
  }

  public get(name: string): StoredObject {
    return this.byName.get(name) ?? StoredObject.Missing;
  }
}
