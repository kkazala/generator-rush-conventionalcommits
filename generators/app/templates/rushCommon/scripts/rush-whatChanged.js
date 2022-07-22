const fs = require("fs");
const path = require('path');
const { utils, rushUtils } = require('./rush-changefiles-utils.js');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');


async function rushChangeInfo(_showCommitsParam, _recommendChangetypeParam, _targetBranchParam) {

    function printChangesSummary(projectName, commitsCount, stagedChangesCount) {
        console.log('\n' + utils.Colors.Yellow + `- ${projectName}:` + utils.Colors.Reset + ` commits: ${commitsCount}, staged files: ${stagedChangesCount}`)
    }
    function printChangeFileInfo(changeFileName) {
        if (changeFileName !== undefined) {
            console.log(`  rush will ` + utils.Colors.Yellow + `NOT` + utils.Colors.Reset + ` request change files for this project, because a change file already exists`)
        }
    }
    function printRecommendedChangeType(changeType, info) {
        const infoMsg = (info) ? ` (${info})` : '';
        console.log(`  recommended change type: ` + utils.Colors.Green + changeType + utils.Colors.Reset + infoMsg);
    }
    function printCommits(logFormat, mergeBaseHash, since, changeFileName, projectRelativeFolder, targetPath) {

        const getCommitsHeader = (changeFileName === undefined) ? `commits history` : `commits history since '${changeFileName}'`;
        switch (logFormat) {
            case 'full':
                utils.executeCommand(`git --no-pager log ${mergeBaseHash}... ${since} -- "${projectRelativeFolder}" > ${targetPath}`);
                console.log(`  ${getCommitsHeader}: '` + utils.Colors.Yellow + targetPath + utils.Colors.Reset + `'`)
                break;
            case 'shortlog':
                console.log(`  ${getCommitsHeader}: `)
                utils.executeCommand(`git shortlog ${mergeBaseHash}... ${since} -- "${projectRelativeFolder}"`);
                break;
        }
    }
    function getChangeFiles(targetBranch) {
        const changesFolder = rushUtils.getChangesFolder;
        const changeFiles = utils.executeCommandReturn(`git diff ${targetBranch}... --name-only --no-renames --diff-filter=A -- "${changesFolder}"`).split('\n');

        const result = changeFiles.reduce((acc, obj) => {
            const parsed = path.parse(path.relative(changesFolder, obj));
            const key = parsed.dir;

            acc[key] = (acc[key]) ? [acc[key], parsed.base].reverse()[0] : parsed.base;

            return acc;
        }, {})

        return result;
    }
    function getDateFromChangeFile(fileName) {
        if (fileName === undefined) {
            return '';
        }
        //always _YYYY-MM-DD-HH-MM.json
        const res = fileName.match("_(?<dateTime>.*).json")
        const val = res.groups.dateTime.split('-');

        return `--since=${val[0]}-${val[1]}-${val[2]}T${val[3]}:${val[4]}:00`;
    }
    function getCommitsCount(_mergeBaseHash, _since, _projectRelativeFolder) {
        return utils.executeCommandReturn(`git rev-list ${_mergeBaseHash}... --count ${_since} -- "${_projectRelativeFolder}"`);
    }
    function getStagedInfo(_changedProjects) {
        let result = {}
        _changedProjects.forEach(project => {
            // utils.executeCommand(`git diff --cached --stat -- "${project.projectRelativeFolder}"`);
            result[project.packageName] = utils.executeCommandReturn(`git diff --cached --name-only -- "${project.projectRelativeFolder}"`).split('\n').length;
        });
        return result;
    }
    //---
    function showCommits(_logFormat, _mergeHash, _since, _project, _commitsCount, _changeFileName) {

        function _ensureDestinationFolder() {
            const targetFolder = path.join(rushUtils.getTempFolder, "gitlog");
            fs.mkdirSync(targetFolder, { recursive: true });
            return targetFolder;
        }

        if (_commitsCount > 0) {
            const destFolder = _ensureDestinationFolder();
            const fileName = _project.projectRelativeFolder.replace('/', '_').replace('\\', '_')
            printCommits(_logFormat, _mergeHash, _since, _changeFileName, _project.projectRelativeFolder, path.join(destFolder, `${fileName}.txt`))
        }
    }

    function recommendChangeType(_mergeHash, _project, _commitsCount) {
        function _getChangeType(mergeHash, projectFolder) {
            function _getRevListRegex(mergeCommitHash, regex, projectFolder) {
                return [
                    'rev-list',
                    `${mergeCommitHash}...`,
                    '--count',
                    '--extended-regexp',
                    '--grep',
                    regex,
                    '--',
                    projectFolder
                ];
            }
            function _isMajor(mergeCommitHash, projectFolder) {
                const cctypes = require(path.join(node_modules, 'conventional-commit-types'));
                const types = Object.keys(cctypes.types).join('|');
                const result = utils.spawnCommandReturn('git', _getRevListRegex(mergeCommitHash, `(^(${types})(\(.*?\))?!:.*|^BREAKING CHANGE: )`, projectFolder))
                return parseInt(result) > 0;
            }
            function _isMinor(mergeCommitHash, projectFolder) {
                const result = utils.spawnCommandReturn('git', _getRevListRegex(mergeCommitHash, '^feat((.*?))?:', projectFolder))
                return parseInt(result) > 0;
            }
            function _isPatch(mergeCommitHash, projectFolder) {
                const result = utils.spawnCommandReturn('git', _getRevListRegex(mergeCommitHash, '^fix((.*?))?:', projectFolder))
                return parseInt(result) > 0;
            }

            if (utils.hotfixChangeEnabled) {
                return { changeType: "none, hotfix", info: "if 'hotfixChangeEnabled' is set in rush.json, 'rush change' only allows a 'hotfix' change types" }

            }
            else if (_isMajor(mergeHash, projectFolder)) {
                return { changeType: "major", info: "" };
            }
            else if (_isMinor(mergeHash, projectFolder)) {
                return { changeType: "minor", info: "" };
            }
            else if (_isPatch(mergeHash, projectFolder)) {
                return { changeType: "patch", info: "" };
            }
            else {
                return { changeType: "none", info: "" };
            }
        }

        const { changeType, info } = (_commitsCount == 0) ?
            { changeType: "N/A", info: "there are no commits to parse" } :
            _getChangeType(_mergeHash, _project.projectRelativeFolder);

        printRecommendedChangeType(changeType, info);
    }

    if (_showCommitsParam !== undefined || _recommendChangetypeParam !== undefined) {

        const targetBranch = _targetBranchParam || rushUtils.getRemoteDefaultBranch;
        const mergeHash = utils.getmergeHash(targetBranch);

        const changedProjects = await rushUtils.getChangedProjectsAsync(targetBranch);  //RushConfigurationProject
        const changeFiles = getChangeFiles(targetBranch);                               //{'packageName':'<branchname>-<timestamp>.json','packageName':'<branchname>-<timestamp>.json' }
        const stagedFiles = getStagedInfo(changedProjects);                             //{'packageName':count,'packageName':count }

        changedProjects.forEach(project => {

            const since = getDateFromChangeFile(changeFiles[project.packageName]);
            const commitsCount = getCommitsCount(mergeHash, since, project.projectRelativeFolder)

            printChangesSummary(project.projectRelativeFolder, commitsCount, stagedFiles[project.packageName]);
            printChangeFileInfo(changeFiles[project.packageName]);

            if (_recommendChangetypeParam !== undefined) {
                recommendChangeType(mergeHash, project, commitsCount)
            }
            if (_showCommitsParam !== undefined) {
                showCommits(_showCommitsParam, mergeHash, since, project, commitsCount, changeFiles[project.packageName]);
            }

        });
    }
}

rushChangeInfo(
    utils.getArg("showCommits"),
    utils.getArg("recommendChangetype"),
    utils.getArg("targetBranch")
)