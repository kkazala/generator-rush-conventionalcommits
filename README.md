# generator-rush-conventionalcommits

[![rush](https://img.shields.io/badge/rush-5.66.2-brightgreen)](https://rushjs.io/)
[![yeoman generator](https://img.shields.io/badge/yeoman--generator-5.6.1-brightgreen)](https://yeoman.io/generators/)

Add change file generation based on [conventional commits](https://conventionalcommits.org/) convention to your rush monorepos.
See the [Rush and Conventional Commits Series](https://dev.to/kkazala/series/17133) for detailed description.

>Important: This solution is using [ProjectChangeAnalyzer](https://api.rushstack.io/pages/rush-lib.projectchangeanalyzer/) class which is still in BETA and may change. It is NOT recommended to use this API in a production environment.

## Prerequisites

This generator requires that your project is managed with [rush](https://rushjs.io/pages/maintainer/setup_new_repo).
Run the following commands to initialize it:

- `rush init`
- `rush update`

## Installation

First, install [Yeoman](http://yeoman.io) and **generator-rush-conventionalcommits** using [npm](https://www.npmjs.com/).

```bash
npm install -g yo
npm install -g generator-rush-conventionalcommits
```

If not already done, configure git and rush:

```bash
git init
rush init
rush update
```

and follow [Adding projects to a repo](https://rushjs.io/pages/maintainer/add_to_repo/) to configure which projects are managed by rush.

Then add the conventional commits support:

```bash
yo rush-conventionalcommits
```

## About the rush-conventionalcommits configuration

This generator creates the following resources:

### autoinstallers

- **rush-commitlint**: rush autoinstaller installing `@commitlint/cli` and `@commitlint/config-conventional`
- **rush-changemanager**: rush autoinstaller installing `@microsoft/rush-lib`, `@rushstack/node-core-library`, `gitlog` and `recommended-bump`

### custom commands

- **commitlint** runs `commitlint` on the commit messages; used by the commit-msg Git hook.
- **changefiles** executes the custom `rush-changefiles.js` script to create rush change files, if necessary

### git-hooks

- **commit-msg** invokes `rush commitlint` custom command to ensure the commit message has correct format
- **post-commit** invokes `rush changefiles` custom command to generate rush change files, if necessary
- **pre-push** (optional) invokes `rush change -v` to verify change files are generated for changed projects

> **Important**: Rush will install the git hooks during `rush update` executed as part of this generator. For this step to succeed, you must initialize the git repo first. Otherwise, please execute the `rush update` command manually, once you are ready.

### scripts

- **scripts/rush-changefiles.js** this is where the magic happens. Invoked by `rush changefiles` during `post-commit`, parses the commit message and based on the conventional commits specification, decides whether a new change file should be created.
Types `fix:`, `feat:` or `BREAKING CHANGE:` will cause generation of a new change file, if the commit message has not been used just before.

> **Important**: If you want to generate change files for other commit messages types, install the `pre-push` hook. It will remind you to generate change files before `git push`, if none exist for the project.

## Testing

- make a change in any of the projects managed by rush (listed in rush.json)
- `git add .`
- `git commit -m "fix: testing rush change file generation"`
- observe the information printed to the terminal. The first time a rush command depending on an autoinstaller is executed, rush will install Rush engine, package manager, dependencies defined in the autoinstaller. The next time, the command will execute much faster.
- ensure that a new {branchName}_{timestamp}.json file has been created in the common/changes/project-name folder.

## Older version of rush?

This generator requires **rush 5.66.2**.
If you are using older version, and are not yet ready to upgrade, you may "downgrade" this solution.

### rush v5.64.0

Update the **common\autoinstallers\rush-changemanager\package.json** file. Change:

```json
    "@microsoft/rush-lib": "^5.66.2",
    "@rushstack/node-core-library": "^3.45.2",
```

to:

```json
    "@microsoft/rush-lib": "^5.64.0",
    "@rushstack/node-core-library": "^3.45.0",
```

### rush v5.63.1 or older

Rush **5.64.0** introduces `--quiet` command for suppressing startup information.
Apart from updating **common\autoinstallers\rush-changemanager\package.json** to reference correct version of rush modules, update the `git hooks` to remove the `--quiet` flag.
