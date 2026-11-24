/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { ComponentFieldNotTextException } from "../exceptions/component-field-not-text.exception.ts";
import { ComponentTextsMissingException } from "../exceptions/component-texts-missing.exception.ts";
import { ComponentsMissingException } from "../exceptions/components-missing.exception.ts";
import { Resources } from "../resources.ts";

export class GitComponent {
  public readonly license: string;
  public readonly name: string;
  public readonly texts: readonly string[];
  public readonly version: string;

  public constructor(name: string, version: string, license: string, texts: readonly string[]) {
    this.license = license;
    this.name = name;
    this.texts = texts;
    this.version = version;
  }

  public static parseList(json: unknown, file: string): readonly GitComponent[] {
    if (!Array.isArray(json) || json.length === 0)
      throw new ComponentsMissingException(file);
    return json.map((value: unknown, index) => {
      const fields: Readonly<Record<string, unknown>> = Object.isObject(value) && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
      const text = (field: string): string => {
        const found = fields[field];
        if (!Object.isString(found) || found === "")
          throw new ComponentFieldNotTextException(file, index, field);
        return found;
      };
      const listed = fields[Resources.textsField];
      const texts = Array.isArray(listed)
        ? listed.filter((t: unknown): t is string => Object.isString(t) && (t.startsWith(Resources.buildTextPrefix) || t.startsWith(Resources.pinnedTextPrefix)))
        : [];
      if (!Array.isArray(listed) || texts.length === 0 || texts.length !== listed.length)
        throw new ComponentTextsMissingException(file, index);
      return new GitComponent(text(Resources.nameField), text(Resources.versionField), text(Resources.licenseField), texts);
    });
  }

  public static licenseOf(components: readonly GitComponent[]): string {
    const terms = components.flatMap(t => GitComponent.splitTopLevel(t.license, Resources.licenseAndSeparator))
      .map(t => GitComponent.splitTopLevel(t, Resources.licenseOrSeparator).length > 1 ? Resources.formatLicenseGroup(t) : t);
    return [...new Set(terms)].join(Resources.licenseAndSeparator);
  }

  private static splitTopLevel(expression: string, separator: string): readonly string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < expression.length; index++)
      if (expression.startsWith(Resources.licenseGroupOpen, index))
        depth++;
      else if (expression.startsWith(Resources.licenseGroupClose, index))
        depth--;
      else if (depth === 0 && expression.startsWith(separator, index)) {
        parts.push(expression.slice(start, index));
        start = index + separator.length;
        index = start - 1;
      }
    parts.push(expression.slice(start));
    return parts;
  }
}
