/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";

import { EventChannel } from "@noldova/desktop.runtime";

import { CheckpointsHost } from "../../src/services/checkpoints-host.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { CheckpointsContext } from "./checkpoints-context.fixture.ts";
import { JsonFixture } from "./json.fixture.ts";
import { ManualClock } from "./manual-clock.fixture.ts";
import { RestoreFolder } from "./restore-folder.fixture.ts";
import { ScriptedJournal } from "./scripted-journal.fixture.ts";
import { ServiceSeams } from "./service-seams.fixture.ts";
import { StoppedRestore } from "./stopped-restore.fixture.ts";

const restore = StoppedRestore.fromJson(JsonFixture.parse(await readFile(process.argv[2] ?? "", "utf8")));
const action = new RestoreFolder(restore.folder, restore.store).actionOf(restore.action);
const seams = (restore.noHardLinks ? ServiceSeams.system.withoutHardLinks() : ServiceSeams.system).withJournals(file => new ScriptedJournal(file, action, restore.stop));
const nowhere = (): EventChannel => new EventChannel(() => undefined, () => undefined);
const context = new CheckpointsContext(null, restore.moduleFolder);
context.watchStart = (_command, recorded) => {
  process.stdout.write(`${StoppedRestore.recordedLine}${JSON.stringify(recorded.map(t => t.toJson()))}\n`);
};
const service = new CheckpointsHost(context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), process.platform, nowhere(), nowhere(), nowhere(), nowhere(),
  seams.journals, seams.hasRoom, seams.hardLink, seams.readFree, seams.renameFolder, seams.removeFolder, seams.statFile, seams.readNames, new ManualClock(restore.time));
const result = await service.restoreAsync(restore.request);
process.stdout.write(`The restore ended as ${result.outcome.value}.\n`);
await service.stopAsync();
await context.disposeAsync();
