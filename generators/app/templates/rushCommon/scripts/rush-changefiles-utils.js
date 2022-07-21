const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');
const rushLib = require(path.join(node_modules, '@microsoft/rush-lib'));
const rushCore = require(path.join(node_modules, '@rushstack/node-core-library'));

class RushUtil {

    constructor() {
        this.rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() })
    }
    get getChangesFolder() {
        return this.rushConfiguration.changesFolder;
    }
    get getTempFolder() {
        return this.rushConfiguration.commonTempFolder;
    }
    get getHotfixChangeEnabled() {
        return this.rushConfiguration.hotfixChangeEnabled;
    }
    get getRemoteDefaultBranch() {
        return `${this.rushConfiguration.repositoryDefaultRemote}/${this.rushConfiguration.repositoryDefaultBranch}`;
    }
    get getDefaultRemote() {
        return this.rushConfiguration.repositoryDefaultRemote;
    }
    async getChangedProjectsAsync(currentBranch) {
        const projectAnalyzer = new rushLib.ProjectChangeAnalyzer(this.rushConfiguration);
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
    spawnCommandReturn(command, args) {
        const escapedArgs = args.map((x) => this._escapeShellParameter(x));
        const result = child_process.spawnSync(command, escapedArgs, {
            shell: true,
            cwd: process.cwd(),
            env: process.env,
            stdio: 'pipe'
        });
        this._processResult(result);
        return result.stdout.toString();
    }
    detectEmail() {
        try {
            return this.executeCommandReturn('git config user.email').replace(/(\r\n|\n|\r)/gm, '');
        } catch (err) {
            console.log('There was an issue detecting your Git email...');
            return undefined;
        }
    }
    detectName() {
        try {
            return this.executeCommandReturn('git config user.name').replace(/(\r\n|\n|\r)/gm, '');
        } catch (err) {
            console.log('There was an issue detecting your Git name...');
            return undefined;
        }
    }
    getmergeHash(targetBranch) {
        return this.executeCommandReturn(`git --no-optional-locks merge-base -- HEAD ${targetBranch}`);
    }

    _escapeShellParameter(parameter) {
        // This approach is based on what NPM 7 now does:
        // https://github.com/npm/run-script/blob/47a4d539fb07220e7215cc0e482683b76407ef9b/lib/run-script-pkg.js#L34
        return JSON.stringify(parameter);
    }

    _processResult(result) {
        //rushstack\libraries\rush-lib\src\utilities\Utilities.ts
        if (result.error) {
            result.error.message += os.EOL + (result.stderr ? result.stderr.toString() + os.EOL : '');
            throw result.error;
        }

        if (result.status) {
            throw new Error('The command failed with exit code ' + result.status + os.EOL + (result.stderr ? result.stderr.toString() : ''));
        }
    }
}

exports.utils = new Util();
exports.rushUtils = new RushUtil();
