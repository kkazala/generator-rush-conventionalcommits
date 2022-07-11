const path = require('path');
const utils = require('./rush-changefiles-utils.js');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');

async function ShowCommits(targetBranchParam) {
    try {
        const targetBranch = targetBranchParam || utils.getRemoteDefaultBranch();
        //(ProjectChangeAnalyzer) this._git.getMergeBase(targetBranchName, terminal, shouldFetch);
        const mergeHash = utils.executeCommandReturn(`git --no-optional-locks merge-base -- HEAD ${targetBranch}`);

        const changedProjects = await utils.getChangedProjectsAsync(targetBranch);
        changedProjects.forEach(project => {
            utils.executeCommand(`git shortlog ${mergeHash}... -- "${project.projectRelativeFolder}"`);
        });

    }
    catch (ex) {
        console.log(this.Colors.Red + ex + this.Colors.Reset)
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
    ShowCommits(targetBranchParam);
}

if (recommendChangeTypeParam) {
    RecommendChangeType(targetBranchParam);
}