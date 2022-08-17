var Generator = require('yeoman-generator');
const child_process = require('child_process');
const fs = require('fs');
const chalk = require('chalk');
const prompting = require('./promptConfig');
const utils = require('../app/utils.js');

module.exports = class extends Generator {

    initializing() {

        this.log(chalk.green("rush-conventionalcommits " + this.rootGeneratorVersion()))

        const rushJson = `${this.contextRoot}/rush.json`
        this.rushVer = utils._getRushVersion(rushJson);

        if (!this.fs.exists(rushJson)) {
            this.log(chalk.red('This generator needs to be invoked from rush root directory'));
            process.exit(1)
        }
        if (!utils._assertRushVersion(this.rushVer)) {
            this.log(chalk.red(`This generator requires rush version ${utils.rushVersionRequired} or newer. Please either upgrade rush, or use older version of the generator.`));
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
        this.log(chalk.green("Updating auto-installers"));
        let result = this.spawnCommandSync('rush', ['update-autoinstaller', '--name', 'rush-commitlint']);
        result = this.spawnCommandSync('rush', ['update-autoinstaller', '--name', 'rush-changemanager']);
        result = this.spawnCommandSync('rush', ['update']);
    }

    end() {

    }
    _copyRushConfig() {

        this.log(chalk.green("Copying rush scripts"));
        this.fs.copy(
            `${this.sourceRoot()}/rushCommon/scripts/.`,
            `${this.contextRoot}/common/scripts/.`,
        );

        this.log(chalk.green("Copying rush commands"));
        utils._mergeJsonFiles(
            `${this.sourceRoot()}/rushCommon/config/rush/command-line.json`,
            `${this.contextRoot}/common/config/rush/command-line.json`,
            utils._mergeCommands
        );

        this.log(chalk.green("Copying rush autoinstallers"));
        this.fs.copyTpl(
            this.templatePath(`${this.sourceRoot()}/rushCommon/templates/.`),
            this.destinationPath(`${this.contextRoot}/common/autoinstallers/.`),
            { rushVer: this.rushVer }
        );

        // this.fs.copy(
        //     `${this.sourceRoot()}/rushCommon/autoinstallers/.`,
        //     `${this.contextRoot}/common/autoinstallers/.`
        // );

        this.log(chalk.green("Copying rush githooks"));
        this.fs.copy(
            `${this.sourceRoot()}/rushCommon/git-hooks`,
            `${this.contextRoot}/common/git-hooks`
        );

        // Optional hooks
        if (this.answers.githook_prepush) {
            this.log(chalk.green("Copying rush pre-push hook"));
            this.fs.copy(
                `${this.sourceRoot()}/rushCommon/git-hooks-optional/pre-push`,
                `${this.contextRoot}/common/git-hooks/pre-push`
            );
        }

        this.log(chalk.green("Copying commitlint.config"));
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

};