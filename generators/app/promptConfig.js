const fs = require('fs');
// importing utilities
const util = require('../app/utils.js');

const promptConfig = () => { 

    const _getConfigOptions = (generator) => { 
        return [
            {
                type: 'confirm',
                default:false,
                name: 'githook_prepush',
                message:"Do you want to install pre-push hook to ensure change files exist? 'rush change -v' will be invoked on every 'git push'."
            }
        ]
    }

    return {
        config: _getConfigOptions
    }

};

module.exports = promptConfig();  
