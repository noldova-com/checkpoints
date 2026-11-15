/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class LicenceTextMissingException extends PackageException {
  public readonly file: string;
  public readonly component: string;
  public readonly text: string;
  public readonly inBuild: boolean;

  public constructor(file: string, component: string, text: string, inBuild: boolean) {
    super(Resources.formatLicenceTextMissing(file, component, text, inBuild));

    this.file = file;
    this.component = component;
    this.text = text;
    this.inBuild = inBuild;
  }
}
