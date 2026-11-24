# @noldova/checkpoints.protocol

The protocol of the checkpoints module's runtime methods: their requests, results and events, with the folders and checkpoints they name, and their JSON forms.
Each model reads its JSON form through `@noldova/context.json`'s `JsonReader` and refuses a field it doesn't have; a value that isn't its JSON form throws context's `JsonException`, whose path starts at the model's name, such as `ReadRequest.limit`.
A model built from values it refuses throws a subclass of `ProtocolException`, such as `InvalidCheckpointIdException`.
It takes `@noldova/context.core`, `@noldova/context.exceptions` and `@noldova/context.json` as peers.

[`@noldova/checkpoints`](https://www.npmjs.com/package/@noldova/checkpoints) depends on it and pins it at its own version; an app that calls the module's methods builds their requests and reads their results with it.
[documents/ARCHITECTURE.md](https://github.com/noldova-com/checkpoints/blob/main/documents/ARCHITECTURE.md) says what each method does, and the [README](https://github.com/noldova-com/checkpoints#readme) how to build and test it.
It is licensed under the [MIT License](https://github.com/noldova-com/checkpoints/blob/main/LICENSE).
