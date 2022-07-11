const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-changemanager/node_modules');
const rushLib = require(path.join(node_modules, '@microsoft/rush-lib'));
const rushCore = require(path.join(node_modules, '@rushstack/node-core-library'));
const { validateHeader, parseHeader } = require(path.join(node_modules, 'parse-commit-message'));

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
    parseGitLog(output, delimiter) {
        let arr = output.split(delimiter)
        // return unique
        return [...new Set(arr)].filter(e => e);
    }
    parseCommitsToRawBody(output) {
        const commitsRawBody = [];
        output.forEach(commit => {
            try {
                const { error } = validateHeader(parseHeader(commit.subject), true);
                if (error === undefined) {
                    commitsRawBody.push(commit.rawBody)
                }
            }
            catch (ex) {
                console.log(this.Colors.Red + `"${commit.subject}" does not follow conventional commits convention` + this.Colors.Reset)
            }
        })
        return commitsRawBody;
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
    getCurrentBranch() {
        const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
        const defaultRemote = rushConfiguration.repositoryDefaultRemote;
        const currBranch = child_process.execSync("git branch --show-current").toString().trim();
        try {
            return child_process.execSync(`git rev-parse --symbolic-full-name --abbrev-ref "${currBranch}@{u}"`).toString().trim();
        } catch (error) {
            console.log(this.Colors.Red + "Error fetching git remote branch features/versions. Detected changed files may be incorrect." + this.Colors.Reset)
            console.log(this.Colors.Yellow + `Execute 'git push --set-upstream ${defaultRemote} ${currBranch}' or 'git checkout --track ${defaultRemote}/${currBranch}' to set upstream branch` + this.Colors.Reset);
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
module.exports = new Util();
