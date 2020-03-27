const _ = require('lodash')
const fs = require('fs')
const fetch = require('node-fetch')
const pRetry = require('p-retry')
const javbus = require('./../module/javbus')
const config = require('./../module/config')
const qb = require('./../module/qbittorrent')
const db = require('./../module/database')
const parseTorrent = require('parse-torrent')
const logger = require('./../module/logger')('Pull: Init')

const handleContent = (content) => {
    logger.debug('Handling content')

    content = _.uniqBy(content, 'hash')
    const oriDb = db.get('contents').uniqBy('hash').value()

    db.get('contents').assign(_.unionBy(content, oriDb, 'hash')).write()
}

const runAndSetInterval = async (fn, time, name, handle = true) => {
    logger.debug(`[${name}] Starting job`)
    try {
        const content = await fn()
        if (handle) handleContent(content)
    } catch (error) {
        logger.error(`[${name}] Job threw an error`, error)
    }
    logger.info(`[${name}] Job finished, setting timer`)
    setTimeout(fn, time * 1000)
}

runAndSetInterval(async () => {
    await contentHandler()
}, 60, 'Download queue', false)

const contentHandler = async () => {
    const dbContent = db.get('contents').value()
    const downloaded = db.get('downloaded').value()
    const processed = db.get('processed').value()

    const noNeed = _.unionBy(downloaded, processed, 'hash')
    const final = _.differenceBy(dbContent, noNeed, 'hash')

    await qb.addNewCategory('JAVClub')

    const tmpFolder = __dirname + '/../../tmp/torrents'

    for (const i in final) {
        const item = final[i]

        const torrentURL = item.torrentURL
        const JAVID = item.JAVID
        const size = item.size
        const hash = item.hash

        if (size > 10) {
            logger.info(`[${JAVID}] File oversize, skipped`)
            continue
        }

        if (!db.get('metadatas').find({ JAVID }).value()) {
            const JAVinfo = await javbus(JAVID)
            if (!JAVinfo) {
                logger.warn(`[${JAVID}] JAV info invalid, skipped`)
                continue
            }
    
            JAVinfo.JAVID = JAVID
    
            db.get('metadatas').push(JAVinfo).write()
        }

        const torrentFilePath = `${tmpFolder}/${hash}.torrent`

        if (!fs.existsSync(torrentFilePath)) {
            const res = await pRetry(async () => {
                const res = await fetch(torrentURL)
        
                return res
            }, {
                onFailedAttempt: async (error) => {
                    logger.error(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left`)
        
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve()
                        }, 10000)
                    })
                },
                retries: 5
            })

            await new Promise((resolve, reject) => {
                const fileStream = fs.createWriteStream(torrentFilePath + '.tmp');
                res.body.pipe(fileStream);
                res.body.on("error", (err) => {
                    reject(err)
                })

                fileStream.on("finish", () => {
                    resolve()
                    fs.renameSync(torrentFilePath + '.tmp', torrentFilePath)
                })
            })
        }

        const torrentInfo = parseTorrent(fs.readFileSync(torrentFilePath))
        if (!torrentInfo.files) {
            logger.warn(`[${JAVID}] Torrent invalid, skipped`)
            continue
        }

        let videoFileCount = 0

        for (const index in torrentInfo.files) {
            const fileInfo = torrentInfo.files[index]

            if (`${fileInfo.name}`.indexOf('.mp4') !== -1) {
                videoFileCount = videoFileCount + 1
            }
        }

        if (videoFileCount !== 1) {
            logger.info(`[${JAVID}] Torrent has no video file or has multiple video files, skipped`)
            continue
        }

        await qb.addTorrentLink(torrentURL)

        db.get('processed').push({
            hash
        }).write()
    }
}

contentHandler()

const driverRSS = require('./driver/rss')
const driverStack = []

const remoteList = config.get('remote')
logger.debug('Remote list', remoteList)

for (const i in remoteList) {
    const item = remoteList[i]

    switch (item.driver) {
        case 'RSS':
            logger.info(`[${i}] Creating RSS driver stack`)
            driverStack[i] = new driverRSS(item.url, item.type)
            runAndSetInterval(async () => {
                const res = await driverStack[i].run()
                return res
            }, item.interval, 'RSS: ' + i)
            break
    }
}
