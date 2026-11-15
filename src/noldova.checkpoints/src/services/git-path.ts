/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class GitPath {
  public static ofEntry(relativePath: string): string {
    return [Resources.filesFolder, relativePath].join(Resources.relativePathSeparator);
  }

  public static ofRule(folderPath: string): string {
    return [Resources.rulesFolder, folderPath, Resources.ignoreFileName].filter(t => t !== "").join(Resources.relativePathSeparator);
  }

  public static quote(path: string): string {
    const quoted = path.replace(Resources.gitQuotedCharacters,
      t => t === Resources.gitQuote || t === Resources.gitEscape ? `${Resources.gitEscape}${t}` : Resources.formatOctalEscape(t.charCodeAt(0)));
    return `${Resources.gitQuote}${quoted}${Resources.gitQuote}`;
  }
}
