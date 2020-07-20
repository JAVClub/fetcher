const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const pRetry = require('p-retry')
const db = require('./../module/db')
const javbus = require('./../module/javbus')
const config = require('./../module/config')
const qb = require('./../module/qbittorrent')
const parseTorrent = require('parse-torrent')
const logger = require('./../module/logger')('Pull: Init')
const runAndSetInterval = require('./../module/runAndSetInterval')

let contentList = []
let processedList = []

function addContent (content) {
  contentList = contentList.concat(content)
}

function handleContent () {
  logger.debug('Handling content')

  let data = JSON.parse(JSON.stringify(contentList))
  contentList = []

  data = _.uniqBy(data, 'hash')

  const noNeed = _.unionBy(db.downloaded, db.queue, 'hash')
  data = _.differenceBy(data, noNeed, 'hash')

  processedList = data
}

/**
 * Pull queue filler
 */
const DriverRSS = require('./driver/rss')
const DriverOnejav = require('./driver/onejav')
const driverStack = []

const remoteList = config.get('remote')
logger.info('Remote list', remoteList)

for (const i in remoteList) {
  const item = remoteList[i]

  switch (item.driver) {
  case 'RSS':
    logger.debug(`[${i}] Creating RSS driver stack`)
    driverStack[i] = new DriverRSS(item.url, item.type)
    runAndSetInterval(async () => {
      const res = await driverStack[i].run()
      return res
    }, item.interval, 'RSS: ' + i, addContent)
    break

  case 'OneJAV':
    logger.debug(`[${i}] Creating OneJAV driver stack`)
    driverStack[i] = new DriverOnejav(item.url)
    runAndSetInterval(async () => {
      const res = await driverStack[i].run()
      return res
    }, item.interval, 'OneJAV: ' + i, addContent)
    break
  default:
    logger.warn(`Unknown driver ${item.driver}`)
  }
}

/**
 * Pull queue handler
 */
runAndSetInterval(async () => {
  await contentHandler()
}, 60, 'Download queue')

function skipItem (msg = '') {
  logger.info(msg)
}

async function contentHandler () {
  const list = JSON.parse(JSON.stringify(processedList))

  const noNeed = _.unionBy(db.downloaded, db.queue, 'hash')
  const final = _.differenceBy(list, noNeed, 'hash')

  await qb.addNewCategory('JAVClub')

  const tmpFolder = path.join(__dirname, '../../tmp/torrents')

  for (const i in final) {
    const item = final[i]

    const torrentURL = item.torrentURL
    const JAVID = item.JAVID
    const size = item.size
    const hash = item.hash

    logger.info(`Handling ${JAVID}'s torrent, hash ${hash}`)

    if (size > 10) {
      skipItem(`[${JAVID}] File oversized, skipped`)
      continue
    }

    const JAVinfo = await javbus(JAVID)
    if (!JAVinfo) {
      skipItem(`[${JAVID}] JAV info invalid, skipped`)
      continue
    }
    JAVinfo.JAVID = JAVID
    item.metadata = JAVinfo

    const torrentFilePath = `${tmpFolder}/${hash}.torrent`

    if (!fs.existsSync(torrentFilePath)) {
      let res
      try {
        res = await pRetry(async () => {
          const result = await fetch(torrentURL)

          return result
        }, {
          onFailedAttempt: async () => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve()
              }, 5000)
            })
          },
          retries: 5
        })
      } catch (e) {
        skipItem(`[${JAVID}] Download torrent failed, skipped`)
        continue
      }

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(torrentFilePath + '.tmp')
        res.body.pipe(fileStream)
        res.body.on('error', (err) => {
          reject(err)
        })

        fileStream.on('finish', () => {
          fs.renameSync(torrentFilePath + '.tmp', torrentFilePath)
          resolve()
        })
      })
    }

    logger.debug(`[${JAVID}] Parsing torrent info`)
    let torrentInfo
    try {
      torrentInfo = parseTorrent(fs.readFileSync(torrentFilePath))
      fs.unlinkSync(torrentFilePath)
      if (!torrentInfo.files) {
        skipItem(`[${JAVID}] Torrent invalid, skipped`)
        continue
      }
    } catch (e) {
      skipItem(`[${JAVID}] Parse torrent failed, skipped`)
    }
    item.hash = torrentInfo.infoHash

    let videoFileCount = 0

    logger.debug(`[${JAVID}] Torrent files`, torrentInfo.files)
    for (const index in torrentInfo.files) {
      const fileInfo = torrentInfo.files[index]

      if (`${fileInfo.name}`.indexOf('.mp4') !== -1) {
        videoFileCount = videoFileCount + 1
      }
    }

    if (videoFileCount !== 1) {
      skipItem(`[${JAVID}] Torrent has no video file or has multiple video files, skipped`)
      continue
    }

    logger.info(`[${JAVID}] Adding to qBittorrent`)
    await qb.addTorrentLink(torrentURL)

    db.queue.push(item)
  }
  handleContent()
}
