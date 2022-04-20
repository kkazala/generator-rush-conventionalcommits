# Change Log - generator-rush-conventionalcommits

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
