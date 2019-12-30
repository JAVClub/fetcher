const OneJav = require('./remotes/onejav');
const qBittorrent = require('./clients/qbittorrent');
const log = require('./modules/log');
const db = require('./modules/database');
const hash = require('object-hash');
const CONFIG = require('./modules/config');

let one = new OneJav();
let qb = new qBittorrent(CONFIG['host'],CONFIG['username'],CONFIG['password']);

const update = () => {
    log.info('Fetching new JAV...');
    one.getPageJAV(`${CONFIG['onejavPage']}?page=${Math.round(Math.random() * 4 + 1)}`).then((data) => {
        let newNum = 0;
        log.debug(JSON.stringify(data));
        log.info('Fetched ' + data.length + ' JAV');

        data.forEach((JAV) => {
            let objHash = hash(JAV);
            if (!db.isDownloaded(objHash))
            {
                newNum += 1;
                qb.addTorrentLink(JAV.link).then((response) => {
                    if (response.body.indexOf('Ok') == -1)
                    {
                        log.error('Fails downloading JAV ' + JAV['id']);
                        return;
                    }
                    db.markAsDownloaded(objHash);
                    log.info(`Added ${JAV['id']} to download list`);
                });
            }
        });
        log.info('Added', newNum, 'torrents');
    });
};

setTimeout(update, 5000);
