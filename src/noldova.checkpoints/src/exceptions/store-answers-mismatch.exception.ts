/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class StoreAnswersMismatchException extends StoreException {
  public readonly answered: number;
  public readonly asked: number;

  public constructor(asked: number, answered: number) {
    super(Resources.formatStoreAnswersMismatch(asked, answered));

    this.answered = answered;
    this.asked = asked;
  }
}
