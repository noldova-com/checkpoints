/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidBase64Exception } from "../exceptions/invalid-base64.exception.ts";
import { Resources } from "../resources.ts";

export class Base64 {
  public static decode(text: string): Uint8Array {
    if (!Resources.base64Pattern.test(text))
      throw new InvalidBase64Exception();

    const digits = text.replace(Resources.base64TrailingPadding, "");
    const bytes = new Uint8Array(Math.floor(digits.length * Resources.bitsPerBase64Digit / Resources.bitsPerByte));
    let bits = 0;
    let count = 0;
    let index = 0;
    for (const digit of digits) {
      bits = bits << Resources.bitsPerBase64Digit | Resources.base64Alphabet.indexOf(digit);
      count += Resources.bitsPerBase64Digit;
      if (count >= Resources.bitsPerByte) {
        count -= Resources.bitsPerByte;
        bytes[index++] = bits >> count & Resources.byteMask;
        bits &= (1 << count) - 1;
      }
    }
    return bytes;
  }

  public static encode(bytes: Uint8Array): string {
    const digits: string[] = [];
    let bits = 0;
    let count = 0;
    for (const byte of bytes) {
      bits = bits << Resources.bitsPerByte | byte;
      count += Resources.bitsPerByte;
      while (count >= Resources.bitsPerBase64Digit) {
        count -= Resources.bitsPerBase64Digit;
        digits.push(Resources.base64Alphabet.charAt(bits >> count & Resources.base64DigitMask));
      }
      bits &= (1 << count) - 1;
    }
    if (count > 0)
      digits.push(Resources.base64Alphabet.charAt(bits << Resources.bitsPerBase64Digit - count & Resources.base64DigitMask));
    return digits.join("") + Resources.base64Padding.repeat((Resources.base64GroupLength - digits.length % Resources.base64GroupLength) % Resources.base64GroupLength);
  }
}
