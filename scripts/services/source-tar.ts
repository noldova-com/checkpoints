/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

// The blocks of a POSIX ustar archive of plain files whose names fit its 100-byte name field. Every entry has the mode
// 0644, the owner and group 0 and the time 0, so the same files in the same order always give the same bytes.
export class SourceTar {
  private static readonly BLOCK: number = 512;
  private static readonly NAME_LENGTH: number = 100;

  public static readonly end: Buffer = Buffer.alloc(SourceTar.BLOCK * 2);

  public static fits(name: string): boolean {
    return name !== "" && Buffer.byteLength(name) <= SourceTar.NAME_LENGTH;
  }

  public static headerOf(name: string, size: number): Buffer {
    const header = Buffer.alloc(SourceTar.BLOCK);
    header.write(name, 0, SourceTar.NAME_LENGTH, "utf8");
    header.write("0000644\0", 100, "ascii");
    header.write("0000000\0", 108, "ascii");
    header.write("0000000\0", 116, "ascii");
    header.write(`${size.toString(8).padStart(11, "0")}\0`, 124, "ascii");
    header.write("00000000000\0", 136, "ascii");
    header.write("        ", 148, "ascii");
    header.write("0", 156, "ascii");
    header.write("ustar\0", 257, "ascii");
    header.write("00", 263, "ascii");
    const sum = header.reduce((total, byte) => total + byte, 0);
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
    return header;
  }

  public static paddingOf(size: number): Buffer {
    return Buffer.alloc((SourceTar.BLOCK - size % SourceTar.BLOCK) % SourceTar.BLOCK);
  }
}
