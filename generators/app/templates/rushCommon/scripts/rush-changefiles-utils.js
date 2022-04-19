const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');
const rushLib = require(path.join(node_modules, '@microsoft/rush-lib'));
const rushCore = require(path.join(node_modules, '@rushstack/node-core-library'));

class Util {

    Colors = {
        Red: '\u001B[31m',
        Purple: '\u001B[35m',
        Green: '\u001B[32m',
        Yellow: '\u001B[33m',
        Gray: '\u001B[30;1m',
        Reset: '\u001B[0m'
    };
    getArg(argName) { 
        const yargs = require(path.join(node_modules, 'yargs'));
        return yargs(process.argv).argv[argName];
    }

    executeCommand(command) {
        //stdio: 'inherit': process will use the parent's stdin, stdout and stderr streams
        return child_process.execSync(command, { stdio: 'inherit' });
    }
    executeCommandReturn(command) {
        //stdio: 'inherit': process will use the parent's stdin, stdout and stderr streams
        return child_process.execSync(command).toString().trim();;
    }
    executeCommandAsync(command) {
        //stdio: 'inherit': process will use the parent's stdin, stdout and stderr streams
        return child_process.exec(command, { stdio: 'inherit' });
    }
    getCurrentBranch() {
        const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
        const defaultRemote = rushConfiguration.repositoryDefaultRemote;
        const currBranch = child_process.execSync("git branch --show-current").toString().trim();
        try {
            return child_process.execSync(`git rev-parse --symbolic-full-name --abbrev-ref "${currBranch}@{u}"`).toString().trim();
        } catch (error) {
            console.log(Colors.Red + "Error fetching git remote branch features/versions. Detected changed files may be incorrect."+Colors.Reset)      
            console.log(Colors.Yellow + `Execute 'git push --set-upstream ${defaultRemote} ${currBranch}' or 'git checkout --track ${defaultRemote}/${currBranch}' to set upstream branch` + Colors.Reset);
            return null;
        }
    }
    async getChangedProjectsAsync(currentBranch) {
        const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
        const projectAnalyzer = new rushLib.ProjectChangeAnalyzer(rushConfiguration);
        const terminal = new rushCore.Terminal(new rushCore.ConsoleTerminalProvider({ verboseEnabled: false }));

         const changedProjects = await projectAnalyzer.getChangedProjectsAsync({
                targetBranchName: currentBranch, 
                terminal: terminal,
                enableFiltering: false,
                includeExternalDependencies: false
         });
        return changedProjects;
    }
}
module.exports = new Util();
