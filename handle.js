const qBittorrent = require('./clients/qbittorrent');
const log = require('./modules/log');
const fs = require('fs');
const path = require('path');
const takeScreenshots = require('./modules/ffmpeg');
const objHash = require('object-hash');
const ffmpeg = require("fluent-ffmpeg");
const CONFIG = require('./modules/config');

let qb = new qBittorrent(CONFIG['host'],CONFIG['username'],CONFIG['password']);

const update = () => {
    qb.getTorrentList().then((response) => {
        if (response.statusCode != 200)
            return;
        log.debug(response.body);

        let list = JSON.parse(response.body);
        list.forEach((torrent) => {
            if (['uploading', 'downloading', 'queuedDL', 'queuedUP', 'stalledUP'].indexOf(torrent['state']) == -1)
            {
                qb.resumeTorrent(torrent['hash']);
                return;
            }

            if ((['uploading', 'queuedUP', 'stalledUP'].indexOf(torrent['state']) != -1) && torrent['ratio'] >= CONFIG['ratio'])
            {
                log.info('Starting handling process of torrent', torrent['hash']);
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
        log.debug('File list: ', files);

        files.forEach((file) => {
            if (!fs.existsSync(file))
            {
                log.error(`File ${file} not exists`);
                return;
            }

            if (!file.endsWith('.mp4'))
            {
                log.debug(`File ${file} is not a vaild mp4 file.`);
                return;
            }

            log.info('Getting metadata of', file);
            ffmpeg.ffprobe(file, (error, metadata) => {
                if (error)
                {
                    log.error(error);
                }

                metadata = metadata['streams'];
                let videoMetadata = {
                    video: {
                        width: metadata[0]['width'],
                        height: metadata[0]['height'],
                        codec: metadata[0]['codec_name'],
                        duration: Math.round(metadata[0]['duration']),
                        bitRate: metadata[0]['bit_rate'],
                        fps: Math.round(metadata[0]['nb_frames'] / metadata[0]['duration']),
                    },
                    audio: {
                        codec: metadata[1]['codec_name'],
                        duration: Math.round(metadata[1]['duration']),
                        bitRate: metadata[1]['bit_rate'],
                        channels: metadata[1]['channels'],
                    },
                };
            
                log.info('Staring process for', hash);
                singleProcess(file,videoMetadata);
            });

        })
    });
};

const singleProcess = (filename, videoMetadata) => {
    let regex = /([a-zA-Z]+)[-_.]{0,2}(\d+)[-_.]{0,2}((CD)?[-_.]?([A-F1-9])){0,1}/gmi;
    let basename = path.basename(filename);
    let regexResult = regex.exec(basename.replace('.' + basename.split('.')[basename.split('.').length - 1], ''));

    log.debug(regexResult);

    if (!regexResult || !regexResult[1] || !regexResult[2])
    {
        log.error('CANNOT detect JAV ID for', filename);
        return;
    }

    let videoInfo = {
        JAVID: regexResult[1].toUpperCase() + regexResult[2],
        company: regexResult[1].toUpperCase(),
        id: regexResult[2],
        episode: 'A',
        metadata: videoMetadata,
    };

    if (regexResult[5] && regexResult[5].length == 1)
    {
        let map = {'1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F',
                   'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F'};
        videoInfo['episode'] = map[regexResult[5]];
    }

    log.debug('Video info:', videoInfo);

    let sha = objHash(fs.statSync(filename));
    videoInfo['hash'] = sha;
    log.debug('Video hash:', sha);
        
    let dir = './cache/modified/' + sha;
    if (!fs.existsSync(dir))
    {
        log.info('Making foloder', dir);
        fs.mkdirSync(dir);
    }

    log.info('Move to modified foloder');
    fs.renameSync(filename, filename = path.join(dir, 'video' + path.extname(filename)));
    fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(videoInfo));

    log.info('Started to generate screenshots for', filename);
    takeScreenshots(filename, path.join(dir, 'storyboard/'),0 , () => {
        let finalDir = path.join('./cache/sync/', 
       `${sha.substr(0, 2)}/`, `${sha.substr(-2, 2)}/`, `${sha}/`);
       log.info('Moving', dir, 'to sync foloder');
        fs.mkdirSync(finalDir, { recursive: true });
        fs.renameSync(dir, finalDir);
    }).catch((reason) => {
        log.error(reason);
        fs.unlinkSync(dir);
        return;
    });
}

setTimeout(update, 5000);