const fs = require('fs');
const { Buffer } = require('buffer');


class Util {
    
    _stripJSONComments(data){
        var re = new RegExp("\/\/(.*)", "g");
        var commentEval = new RegExp(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm);
        return data.replace(commentEval, '');
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
            let found = targetJson.commands.filter((cmd) =>  cmd.name == newCmnd )

            if (found.length == 0) {
                targetJson.commands.push(sourceJson.commands[key]);
            }
        }

        for (let key in sourceJson.parameters) { 
            let newParam = sourceJson.parameters[key].longName
            let found = targetJson.parameters.filter((param) =>  param.longName == newParam )

            if (found.length == 0) {
                targetJson.parameters.push(sourceJson.parameters[key]);
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