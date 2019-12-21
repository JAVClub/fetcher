const qBittorrent = require('./clients/qbittorrent');
const log = require('./modules/log');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const takeScreenshots = require('./modules/ffmpeg');
const objHash = require('object-hash');
const CONFIG = require('./modules/config');

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
                startProcess(torrent['hash'], torrent['save_path']);
            }
        });
    });
};

const startProcess = (hash, savePath) => {
    qb.getTorrentContent(hash).then((contents) => {
        qb.deleteTorrent(hash);
        contents = JSON.parse(contents.body);

        let files = [];
        contents.forEach((file) => files[files.length] = path.join(savePath, file['name']));
        log.debug(`File list: ${JSON.stringify(files)}`);

        files.forEach((file) => {
            log.info('Staring process for ' + hash);
            singleProcess(file);
        })
    });
};

const singleProcess = (filename) => {
    if (!fs.existsSync(filename))
    {
        log.error(`File ${filename} not exists`);
        return;
    }
    let regex = /([a-zA-Z]+)[-_.]{0,2}(\d+)[-_.]{0,2}((CD)?[-_.]?([A-F1-9])){0,1}/gmi;
    let regexResult = regex.exec(path.basename(filename).split('.')[0]);

    log.debug(JSON.stringify(regexResult));

    if (!regexResult || !regexResult[1] || !regexResult[2])
    {
        log.error('CANNOT detect JAV ID for ' + filename);
        return;
    }

    let videoInfo = {
        JAVID: regexResult[1].toUpperCase() + regexResult[2],
        company: regexResult[1].toUpperCase(),
        id: regexResult[2],
        episode: 'A'
    };

    if (regexResult[5] && regexResult[5].length == 1)
    {
        let map = {'1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F',
                   'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F'};
        videoInfo['episode'] = map[regexResult[5]];
    }

    log.debug('Video info: ' + JSON.stringify(videoInfo));

    let sha = objHash(fs.statSync(filename));
    videoInfo['hash'] = sha;
    log.debug('Video hash: ' + sha);
        
    let dir = './cache/modified/' + sha;
    if (!fs.existsSync(dir))
    {
        log.info('Making foloder ' + dir);
        fs.mkdirSync(dir);
    }

    fs.renameSync(filename, filename = path.join(dir, 'video' + path.extname(filename)));
    fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(videoInfo));

    takeScreenshots(filename, path.join(dir, 'storyboard/'), () => {
        let finalDir = path.join('./cache/sync/', 
       `${sha.substr(0, 2)}/`, `${sha.substr(-2, 2)}/`, `${sha}/`);
       log.info('Moving video to synv foloder');
        fs.mkdirSync(finalDir, { recursive: true });
        fs.renameSync(dir, finalDir);
    });
}

setTimeout(update, 5000);