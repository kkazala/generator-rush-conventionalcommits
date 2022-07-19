const fs = require("fs");
const path = require('path');
const utils = require('./rush-changefiles-utils.js');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');

async function ShowCommits(targetBranchParam, showCommitsParam) {

    function _exportLog(mergeBaseHash, projectRelativeFolder, projectName, changeFileName, logFormat, targetFolder) {

        const since = _getSince(changeFileName);
        const commitsCount = utils.executeCommandReturn(`git rev-list ${mergeBaseHash}... --count ${since} -- "${projectRelativeFolder}"`);
        if (commitsCount > 0) {
            console.log(utils.Colors.Yellow + `- ${projectName}` + utils.Colors.Reset);
            if (changeFileName !== undefined) {
                console.log(`     Change file(s) already exist. Retrieving commits after "${changeFileName}"`)
            }

            switch (logFormat) {
                case 'full':
                    const targetPath = path.join(targetFolder, `${projectName}.txt`)
                    utils.executeCommand(`git --no-pager log ${mergeBaseHash}... ${since} -- "${projectRelativeFolder}" > ${targetPath}`);
                    console.log(`     Commits history saved to "` + utils.Colors.Yellow + targetPath + utils.Colors.Reset + `"`)

                    break;
                case 'shortlog':
                    utils.executeCommand(`git shortlog ${mergeBaseHash}... ${since} -- "${projectRelativeFolder}"`);
                    break;
            }
        }
    }
    function _getChangeFiles(targetBranch) {
        const changesFolder = utils.getChangesFolder();
        const changeFiles = utils.executeCommandReturn(`git diff ${targetBranch}... --name-only --no-renames --diff-filter=A -- "${changesFolder}"`).split('\n');

        const result = changeFiles.reduce((acc, obj) => {
            const parsed = path.parse(path.relative(changesFolder, obj));
            const key = parsed.dir;

            acc[key] = (acc[key]) ? [acc[key], parsed.base].reverse()[0] : parsed.base;

            return acc;
        }, {})

        return result;
    }
    function _getSince(fileName) {
        if (fileName === undefined) {
            return '';
        }
        //always _YYYY-MM-DD-HH-MM.json
        const res = fileName.match("_(?<dateTime>.*).json")
        const val = res.groups.dateTime.split('-');

        return `--since=${val[0]}-${val[1]}-${val[2]}T${val[3]}:${val[4]}:00`;
    }


    try {
        const targetBranch = targetBranchParam || utils.getRemoteDefaultBranch();
        //(ProjectChangeAnalyzer) this._git.getMergeBase(targetBranchName, terminal, shouldFetch);
        const mergeHash = utils.executeCommandReturn(`git --no-optional-locks merge-base -- HEAD ${targetBranch}`);
        const changedProjects = await utils.getChangedProjectsAsync(targetBranch);
        const changeFiles = _getChangeFiles(targetBranch);

        const targetFolder = path.join(utils.getTempFolder(), "gitlog");
        fs.mkdirSync(targetFolder, { recursive: true });    //ensure folder exists

        changedProjects.forEach(project => {
            _exportLog(mergeHash, project.projectRelativeFolder, project.packageName, changeFiles[project.packageName], showCommitsParam, targetFolder)
        });
    }
    catch (ex) {
        console.log(utils.Colors.Red + ex + utils.Colors.Reset)
    }
}

async function RecommendChangeType(targetBranchParam) {

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

    function _getChangeType(mergeHash, projectFolder) {
        if (_isMajor(mergeHash, projectFolder)) {
            return "major";
        }
        else if (_isMinor(mergeHash, projectFolder)) {
            return "minor";
        }
        else if (_isPatch(mergeHash, projectFolder)) {
            return "patch";
        }
        else {
            return "none";
        }
    }

    try {
        const targetBranch = targetBranchParam || utils.getRemoteDefaultBranch();
        const mergeHash = utils.executeCommandReturn(`git --no-optional-locks merge-base HEAD ${targetBranch}`);

        const changedProjects = await utils.getChangedProjectsAsync(targetBranch);

        if (changedProjects.size > 0) {
            console.log(utils.Colors.Yellow + 'Based on conventional commits convention, we recommend the following change types: ' + utils.Colors.Reset);
            changedProjects.forEach(project => {
                console.log(`- ${project.packageName}: ` + utils.Colors.Green + _getChangeType(mergeHash, project.projectRelativeFolder) + utils.Colors.Reset);
            });
        }
    }
    catch (ex) {
        console.log(utils.Colors.Red + ex + utils.Colors.Reset)
    }
}

const showCommitsParam = utils.getArg("showCommits");
const recommendChangeTypeParam = utils.getArg("recommendChangetype");
const targetBranchParam = utils.getArg("targetBranch");

if (showCommitsParam) {
    ShowCommits(targetBranchParam, showCommitsParam);
}

if (recommendChangeTypeParam) {
    RecommendChangeType(targetBranchParam);
}