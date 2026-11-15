# Agent instructions

Noldova owns this repository and makes the final decisions.

## Documents

Read the owner before you work on its subject, and change a rule there.

| When you… | Read |
|---|---|
| explain what the module is or who uses it | [README.md](README.md) |
| change the module's parts, its API, its storage or its boundaries with Noldova Desktop and the app | [documents/ARCHITECTURE.md](documents/ARCHITECTURE.md) |
| write code, tests, styles, documents or commits | the organization's standards, `https://github.com/noldova-com/.github/blob/main/standards/AGENTS.md` |
| change the Git builds or their licences | [README.md, The Git builds](README.md#the-git-builds) and [Updating the Git builds](README.md#updating-the-git-builds) |
| prepare or run a release | [README.md, Releases](README.md#releases) |

## Work

- Every pull request names the issue it resolves in this repository, such as `Closes #N`, and passes the checks [README.md](README.md#checks) lists.

## Checkpoints

- The module names no app: an app adds it and decides when to capture and restore ([ARCHITECTURE.md](documents/ARCHITECTURE.md)).
- It never runs an installed Git and never reads, writes or depends on the person's repository storage, index, branches, references, configuration or hooks.
- It stores everything in its own folder of the app's data directory, and restores only when the person asks.
- It installs Noldova Desktop's packages as published versions; never copy, fork or override their files, and ask for a change through an issue in their repository.
- The Git packages ship third-party Git builds under their own licences, never MIT: a change to what a build holds keeps every component's licence text with it.
