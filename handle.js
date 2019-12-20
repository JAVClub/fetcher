const qBittorrent = require('./clients/qbittorrent');
const log = require('./modules/log');
const CONFIG = require('./modules/config');
const fs = require('fs');

let qb = new qBittorrent(CONFIG['host'],CONFIG['username'],CONFIG['password']);

const update = () => {
    qb.getTorrentList().then((response) => {
        if (response.statusCode != 200)
            return;
        // log.debug(response.body);
        fs.writeFileSync('data.json',response.body);

        let list = JSON.parse(response.body);
        list.forEach((torrent) => {
            if (['uploading', 'downloading'].indexOf(torrent['state']) == -1)
            {
                qb.resumeTorrent(torrent['hash']);
                return;
            }

            if (torrent['state'] == 'uploading' && torrent['ratio'] >= CONFIG['ratio'])
            {
                log.info('Starting handling process of torrent ' + torrent['hash']);
                startProcess(torrent['hash']);
            }
        });
    });
};

const startProcess = (hash) => {

};

setTimeout(update, 5000);