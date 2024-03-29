# Change Log - generator-rush-conventionalcommits

## 1.4.1

### Features

- `rush whatchanged` command: analyzes the change files created for the current branch. This functionality is aligned with how `rush change` detects change files
- the references to `rush` libraries in autoinstaller's package.json is now set to rush version retrieved from `rush.json`. Note: the package version is [defined](https://nodejs.dev/en/learn/semantic-versioning-using-npm) as `^x.y.z`, allowing updates of minor or major versions

### Fixes

- Removed warning "rush will NOT request change files for this project, because a change file already exists". This was incorrect; projects with existing change files are ignored only if `rush change -v` is invoked. `rush change` is correctly detecting these projects and asks users whether the new description should be appended to the existing file.

## 1.4.0

### Breaking changes

- `rush changefiles` command and `post-commit` git hook **removed**

### Features

- `rush whatchanged` command added; it detects existing change files and parses commits made after the last change file's creation date (based on the date in the file name)

## 1.3.0

### Features

- `rush whatchanged` command added.
`rush whatchanged --show-commits` displays the history of commits that may be used for change files generation.
`rush whatchanged--recommend-changetype` parses commeits and suggests change type based on the [conventional commits convention](https://www.conventionalcommits.org/en/v1.0.0/)

### Fixes

- When automatically generating change files, the `recommendedBump` was throwing error if the commit didn't follow conventional commits (as a result of merge for example). Error handling is now added

## 1.2.3

Support for repositories with white space in local path

## 1.2.2

Installation of `pre-push` git hook invoking `rush change -v` changed to **No** by default

## 1.2.1

fix: reference to the correct autoinstaller in rush.changefiles.utils.js

## 1.2.0

### Change file generation

Added change file generation for consuming projects, even if they are not directly included in the commit:

- change type is set to "patch"
- change comment is set to "[dependency] commitMessage"

`ProjectChangeAnalyzer` returns a list of projects that have changed in the current state of the repo when compared to the specified branch.
If the first commit includes Project_A, and the second commit includes project_B, both projects will be returned as "changed projects" during second commit.
This is why during the change file generation, the projects returned by `ProjectChangeAnalyzer` are parsed to ensure they were included in the last commit.
> New: For each such project, consuming projects (projects within the Rush configuration which declare this project as a dependency) are additionally included in the list of changed projects, even if not specifically returned by the `ProjectChangeAnalyzer`.

## 1.1.1

Dependency on rush **5.66.2** added; see [rush changelog](https://github.com/microsoft/rushstack/blob/main/apps/rush/CHANGELOG.md) for details.
Rush **5.64.0** introduces `--quiet` command for suppressing startup information to invocations of `rush`, `rushx`, and the `install-run-rush` scripts.
Rush **5.66.0** includes BREAKING CHANGE: references to the default branch to reference "main" instead of "master".

## 1.0.1

README.md updates

## 1.0.0

Initial version
