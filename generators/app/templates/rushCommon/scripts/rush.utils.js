const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-utils/node_modules');
const rushLib = require(path.join(node_modules, '@microsoft/rush-lib'));

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
    getRushConfig() { 
        return rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
    }
    getRushProjects(verPolicy) { 
        //it is necessary to reload the rushConfiguration after project versions are updated
        const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
        if (verPolicy === undefined) {
            return rushConfiguration.projects;
        }
        else { 
            return rushConfiguration.projects.filter(elem => elem.versionPolicyName == verPolicy);
        }
    }
    getScriptsFolder() { 
        const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
        return rushConfiguration.commonScriptsFolder;
    }
    getChangesFolder() { 
        const rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() });
        return rushConfiguration.changesFolder;  
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
    get whatChangedPath() { 
        const targetDir = path.join(this.getScriptsFolder(), "temp");
        if (!fs.existsSync(targetDir)) { 
            fs.mkdir(targetDir, (err) => { 
                console.log(this.Colors.Red + err.message +this.Colors.Reset)      
            });
        }
        return path.join(targetDir, "whatChanged.json");
    }
    
}
module.exports = new Util();
