const path = require('path');
const fs = require('fs');
const utils = require('./rush-changefiles-utils.js');

const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');
const rushLib = require(path.join(node_modules, '@microsoft/rush-lib'));
const gitlog = require(path.join(node_modules, 'gitlog')).default;
const recommendedBump = require(path.join(node_modules, 'recommended-bump'));

function parseLastCommit(repoPath) {
    const lastCommit = gitlog({ repo: repoPath, file: repoPath, number: 1, fields: ["subject", "body", "rawBody", "authorEmail", "hash"] });
    let result = false;
    //fix, feat or BREAKING?
    try {
        const { increment } = recommendedBump([lastCommit[0].rawBody]);
        if (increment) {
            result = {
                increment: increment,
                subject: lastCommit[0].subject,
                emailAddress: lastCommit[0].authorEmail,
                lastMessage: lastCommit[0].rawBody,
                hash: lastCommit[0].hash,
            }
        }
    }
    catch (ex) {
        console.log(this.Colors.Red + `"${commit.subject}" does not follow conventional commits convention.` + this.Colors.Reset)
    }
    finally {
        return result;
    }
}

function parseRecentCommits(projectName, projectPath, lastCommitInfo, repoPath, defaultCommitMessage) {

    const commits = gitlog({ repo: repoPath, file: projectPath, number: 2, fields: ["subject", "body", "rawBody", "authorEmail", "hash"] });
    //if the last two messages are the same, skip change file generation
    const commitMsgPass = (commits.length == 2 && commits[0].rawBody != commits[1].rawBody || commits.length == 1) && commits[0].body != defaultCommitMessage;
    const projectInCommit = lastCommitInfo.hash == commits[0].hash;

    //The project was included in the last commit & commit msg changed
    if (commitMsgPass && projectInCommit) {
        return {
            ...lastCommitInfo,
            projectName: projectName,
        };
    }
    //no changes for this project were included in the last commit, or the last 2 commits identical
    else {
        if (!commitMsgPass) {
            console.log(utils.Colors.Gray + "The last two commit messages are the same, skipping change file generation" + utils.Colors.Reset)
        }
        if (!projectInCommit) {
            console.log(utils.Colors.Gray + `Project ${projectName} is not included in the current commit` + utils.Colors.Reset)
        }
        return false;
    }
}

async function getChangedProjectNamesAsync() {

    let rushProjects = new Map()

    try {
        const currentBranch = utils.getCurrentBranch();
        console.log(utils.Colors.Green + `Checking for updates to ${currentBranch}` + utils.Colors.Reset);

        if (currentBranch) {
            const changedProjects = await utils.getChangedProjectsAsync(currentBranch);

            changedProjects.forEach(project => {
                //projects within the Rush configuration which declare this project as a dependency.
                let consumingProjects = new Map()
                project.consumingProjects.forEach(project => {
                    consumingProjects.set(project.packageName, project.projectFolder);
                });

                //a list of projects that have changed in the current state of the repo when compared to the specified branch.
                rushProjects.set(project.packageName,
                    {
                        'projectFolder': project.projectFolder,
                        'consumingProjects': consumingProjects
                    }
                );
            });
            console.log(utils.Colors.Green + `Found changes in ${rushProjects.size} project(s)` + utils.Colors.Reset);
        }
        return rushProjects;

    } catch (error) {
        console.error(error);
        return rushProjects;
    }
}
function createChangeFile(rushConfig, bumpInfo) {
    let changeFilePath = rushLib.ChangeManager.createEmptyChangeFiles(rushConfig, bumpInfo.projectName, bumpInfo.emailAddress);
    const file = require(changeFilePath);
    file.changes[0].comment = bumpInfo.lastMessage;
    file.changes[0].type = bumpInfo.increment;
    fs.writeFileSync(changeFilePath, JSON.stringify(file, null, 2));
}

function generateChangeFiles(rushConfig, bumpInfo, projectInfo) {

    console.log(utils.Colors.Green + `Generating change file for "${bumpInfo.increment}": "${bumpInfo.subject}" for project ${bumpInfo.projectName}` + utils.Colors.Reset);
    createChangeFile(rushConfig, bumpInfo);
    //create change files for consuming projects
    let patchInfo = { ...bumpInfo }
    patchInfo.increment = "patch"
    patchInfo.subject = `[dependency] ${bumpInfo.subject}`

    projectInfo.consumingProjects.forEach((value, key) => {
        patchInfo.projectName = key
        console.log(utils.Colors.Green + `Generating change file for "${patchInfo.increment}": "${patchInfo.subject}" for project ${patchInfo.projectName}` + utils.Colors.Reset);
        createChangeFile(rushConfig, patchInfo);
    })
}

function generateChangeFilesFromCommit() {
    const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
    //parse last commit to see if change file is necessary
    const lastCommitInfo = parseLastCommit(rushConfiguration.rushJsonFolder);

    if (lastCommitInfo) {
        //get changed projects managed by rush
        getChangedProjectNamesAsync().then((changedProjects) => {
            let fileAdded = false;
            console.log(changedProjects)

            changedProjects.forEach((value, key) => {
                //parse last 2 commits: was last commit for the project the last hash?
                const result = parseRecentCommits(key, value.projectFolder, lastCommitInfo, rushConfiguration.rushJsonFolder, rushConfiguration.gitChangeLogUpdateCommitMessage);
                if (result) {
                    generateChangeFiles(rushConfiguration, result, value);
                    fileAdded = true;
                }
                else {
                    console.log(utils.Colors.Yellow + `Change file not required for project ${key}.` + utils.Colors.Reset);
                }
            });
            if (fileAdded) {

                console.log(utils.Colors.Green + "Automatically adding change files" + utils.Colors.Reset);
                utils.executeCommand(`git add "${rushConfiguration.changesFolder}"`);

                console.log(utils.Colors.Green + `Commiting change files with 'git commit --no-edit --no-verify --amend'` + utils.Colors.Reset);
                utils.executeCommandAsync(`git commit --no-edit --no-verify --amend `);

                console.log(utils.Colors.Green + "All done!" + utils.Colors.Reset);
            }
        });
    }
    else {
        console.log(`Change file not required for this commit`)
    }
}

generateChangeFilesFromCommit();
