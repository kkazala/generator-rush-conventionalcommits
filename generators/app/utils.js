const fs = require('fs');
const compareVersions = require('compare-versions');

class Util {

    get rushVersionRequired() {
        return "5.66.2"
    }

    _stripJSONComments(data) {
        var commentEval = new RegExp(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm);
        var commaEval = new RegExp(/,([\s\n]+[}\]])/gm);
        return data.replace(commentEval, '').replace(commaEval, '$1');
    }
    _getRushVersion(filePath) {
        const rushJson = JSON.parse(
            this._stripJSONComments(
                fs.readFileSync(filePath, 'utf-8')
            ));
        return rushJson.rushVersion;
    }

    _assertRushVersion(rushVersion) {
        return (compareVersions(rushVersion, this.rushVersionRequired) >= 0);
    }

    _mergeJsonFiles(sourceFile, targetFile, mergingLogic) {

        this._ensureFileExists(sourceFile);
        this._ensureFileExists(targetFile);

        try {
            const sourceJson = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
            let targetJson = JSON.parse(
                this._stripJSONComments(
                    fs.readFileSync(targetFile, 'utf-8')
                ));

            const newJson = mergingLogic(sourceJson, targetJson)
            fs.writeFileSync(targetFile, JSON.stringify(newJson, null, 2));
        }
        catch (err) {
            throw err;
        }
    }

    _mergeCommands(sourceJson, targetJson) {

        for (let key in sourceJson.commands) {
            let newCmnd = sourceJson.commands[key].name
            let found = targetJson.commands.filter((cmd) => cmd.name == newCmnd)

            if (found.length == 0) {
                targetJson.commands.push(sourceJson.commands[key]);
            }
        }

        for (let key in sourceJson.parameters) {
            let newParam = sourceJson.parameters[key].longName
            let found = targetJson.parameters.filter((param) => param.longName == newParam)

            if (found.length == 0) {
                targetJson.parameters.push(sourceJson.parameters[key]);
            }
            else {
                let associatedCmds = sourceJson.parameters[key].associatedCommands;
                let unique = [... new Set(found[0].associatedCommands.concat(associatedCmds))];
                found[0].associatedCommands = unique;
            }
        }

        return targetJson;
    }

    _ensureFileExists(filePath) {
        if (!fs.existsSync(filePath)) {
            const error = 'Error: File names ' + filePath + ' cannot be found';
            throw error;
        }
        else
            return true;
    }
}

module.exports = new Util();
