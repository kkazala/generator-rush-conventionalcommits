var Generator = require('yeoman-generator');
const child_process = require('child_process');
const fs = require('fs');
const chalk = require('chalk');
const prompting = require('./promptConfig');
const utils = require('../app/utils.js');

module.exports = class extends Generator {
    _copyRushConfig() {

        this.log("Copying rush scripts");
        this.fs.copy(
            `${this.sourceRoot()}/rushCommon/scripts/.`,
            `${this.contextRoot}/common/scripts/.`,
        );

        this.log("Copying rush commands");
        utils._mergeJsonFiles(
            `${this.sourceRoot()}/rushCommon/config/rush/command-line.json`,
            `${this.contextRoot}/common/config/rush/command-line.json`,
            utils._mergeCommands
        );

        this.log("Copying rush autoinstallers");
        this.fs.copy(
            `${this.sourceRoot()}/rushCommon/autoinstallers/.`,
            `${this.contextRoot}/common/autoinstallers/.`
        );        

        this.log("Copying rush githooks");
        this.fs.copy(
            `${this.sourceRoot()}/rushCommon/git-hooks`,
            `${this.contextRoot}/common/git-hooks`
        );
        
        if (this.answers.githook_prepush) {
            this.log("Copying rush githooks");
            this.fs.copy(
                `${this.sourceRoot()}/rushCommon/git-hooks-optional/pre-push`,
                `${this.contextRoot}/common/git-hooks/pre-push`
            );
        }
        
        this.log("Copying commitlint.config");
        this.fs.copy(
            `${this.sourceRoot()}/commitlint.config.js`,
            `${this.contextRoot}/commitlint.config.js`
        );
    }

    _executeCommand(command) {
        return child_process.execSync(command, { stdio: 'inherit' });
    }
    _executeCommandAsync(command) {
        return child_process.exec(command, { stdio: 'inherit' });
    }

    initializing() {

        this.log(chalk.green("rush-conventionalcommits " +this.rootGeneratorVersion()))
       
        const rushJson = `${this.contextRoot}/rush.json`
        if (!this.fs.exists(rushJson)) {
            this.log(chalk.red('This generator needs to be invoked from rush root directory')); 
            process.exit(1)
        }
        if (!utils._assertRushVersion(rushJson)) { 
            this.log(chalk.red('This generator rush version 5.66.2 or newer. Please either upgrade rush, or use older version of the generator.'));
            process.exit(1)
        }
        if (!fs.existsSync(`${this.contextRoot}/common/temp/`)) {
            this.log(chalk.blue("Please invoke 'rush install' before running this generator"));
            process.exit(1)
        }
    } 

    async prompting() {
        this.answers = await this.prompt(
            prompting.config(this)
        );
    }

    writing() {
        this._copyRushConfig();
    }

    install() {
        this._executeCommand('rush update-autoinstaller --name rush-commitlint');
        this._executeCommand('rush update-autoinstaller --name rush-changemanager');
        this._executeCommand('rush update');
    }

    end() {

    }
};