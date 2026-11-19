/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { LinkProbe } from "../../src/services/link-probe.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";

const withoutLinks = await LinkFixture.withoutLinksAsync();

describe("LinkProbe", { concurrency: true }, () => {
  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "link-probe-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return folder;
  };

  it("says a system that creates the link allows links, and removes the link it created in the folder given", { skip: withoutLinks }, async t => {
    const folder = await folderAsync(t);

    const allowed = await LinkProbe.canCreateLinksAsync(folder);

    assert.equal(allowed, true);
    assert.deepEqual(await readdir(folder), []);
  });

  it("says a folder the system refuses the link in doesn't allow links, and leaves nothing", { skip: AccessFixture.isRoot ? "root writes past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    let allowed = true;

    await AccessFixture.whileReadOnlyAsync(folder, async () => {
      allowed = await LinkProbe.canCreateLinksAsync(folder);
    });

    assert.equal(allowed, false);
    assert.deepEqual(await readdir(folder), []);
  });

  it("says a process the system lets create no links doesn't allow links, and leaves nothing", { skip: withoutLinks === false ? LinkFixture.withLinks : false }, async t => {
    const folder = await folderAsync(t);

    const allowed = await LinkProbe.canCreateLinksAsync(folder);

    assert.equal(allowed, false);
    assert.deepEqual(await readdir(folder), []);
  });
});
