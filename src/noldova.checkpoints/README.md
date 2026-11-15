# @noldova/checkpoints

The checkpoints module for apps on [Noldova Desktop](https://github.com/noldova-com/desktop): it keeps a working folder's files at chosen moments, so an app can show what changed since and put them back when the person asks.
It keeps its own copies with its own Git, in the app's data folder; it never runs the installed Git and never reads or changes the person's repository, branches or settings.

An app installs it pinned exactly and adds it as Noldova Desktop's module contract says:

```bash
npm install --save-exact @noldova/checkpoints
```

The package holds `module.json` and `settings.json`, and its `./runtime` gives Noldova Desktop the runtime part, `RuntimePart`, with the `CheckpointsService` it publishes and the module's exceptions, on `CheckpointsException`.
`module.json` contributes the runtime methods `checkpoints.capture`, `checkpoints.list`, `checkpoints.compare`, `checkpoints.read`, `checkpoints.previewRestore`, `checkpoints.restore`, `checkpoints.storage` and `checkpoints.deleteFolder`, their events, the `checkpoints.lowDiskSpace` notification and the `checkpoints.followIgnoreFiles` setting.
Their requests, results and events are in [`@noldova/checkpoints.protocol`](https://www.npmjs.com/package/@noldova/checkpoints.protocol), which the module pins at its own version.
It takes `@noldova/desktop.runtime`, `@noldova/desktop.protocol` and `@noldova/context.exceptions` as peers, and installs the Git build for its system from the optional `@noldova/checkpoints.git.<os>-<arch>` packages.

[documents/ARCHITECTURE.md](https://github.com/noldova-com/checkpoints/blob/main/documents/ARCHITECTURE.md) says how the module works, and the [README](https://github.com/noldova-com/checkpoints#readme) how to build and test it.
It is licensed under the [MIT License](https://github.com/noldova-com/checkpoints/blob/main/LICENSE).
