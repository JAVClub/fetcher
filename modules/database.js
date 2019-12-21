const fs = require('fs');
const path = require('path');
const appDir = path.dirname(require.main.filename);
const log = require('./../modules/log');
const dbPath = appDir + '/database/torrents.json';

if (!fs.existsSync(dbPath))
{
    log.info('DB not exists, creating one');
    fs.appendFileSync(dbPath,'[]');
}

log.info('Loading data from disk file');
let data = fs.readFileSync(dbPath);
data = JSON.parse(data);

setInterval(() => {
    // log.debug('Saving DB to the disk');
    fs.writeFileSync(dbPath,JSON.stringify(data));
},1000);

module.exports = {
    isDownloaded(hash)
    {
        if (data.indexOf(hash) == -1)
            return false;
        return true;
    },

    markAsDownloaded(hash)
    {
        data[data.length] = hash;
    },
};