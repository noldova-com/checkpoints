# @noldova/checkpoints.protocol

The protocol of the checkpoints module's runtime methods: their requests, results and events, with the folders and checkpoints they name, and their JSON forms.
A model built from values it refuses, or from a value that isn't its JSON form, throws a subclass of `ProtocolException`, such as `InvalidCheckpointIdException` or `NotAnObjectException`.
It takes `@noldova/context.exceptions` as a peer.

[`@noldova/checkpoints`](https://www.npmjs.com/package/@noldova/checkpoints) depends on it and pins it at its own version; an app that calls the module's methods builds their requests and reads their results with it.
[documents/ARCHITECTURE.md](https://github.com/noldova-com/checkpoints/blob/main/documents/ARCHITECTURE.md) says what each method does, and the [README](https://github.com/noldova-com/checkpoints#readme) how to build and test it.
It is licensed under the [MIT License](https://github.com/noldova-com/checkpoints/blob/main/LICENSE).
