/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { TextDecoder } from "node:util";

import "@noldova/context.core";
import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import type { WalkResult } from "../models/walk-result.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import { RelativePath } from "./relative-path.ts";

export class NameDecoder {
  private static readonly DECODER: TextDecoder = new TextDecoder(Resources.utf8Encoding, { fatal: true, ignoreBOM: true });

  public static decode(names: readonly Buffer[], folderPath: string, result: WalkResult): readonly string[] {
    const decoded: string[] = [];
    for (const name of names) {
      const text = NameDecoder.decodeOrNull(name);
      if (Object.isNull(text))
        result.addUnreadPath(new UnreadPath(RelativePath.join(folderPath, name.toString(Resources.utf8Encoding)), UnreadReason.InvalidName, null));
      else
        decoded.push(text);
    }
    return decoded;
  }

  private static decodeOrNull(name: Buffer): string | null {
    return Failures.recover(() => NameDecoder.DECODER.decode(name), t => t instanceof TypeError, null);
  }
}
