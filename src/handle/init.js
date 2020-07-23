const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const objectHash = require('object-hash')
const config = require('./../module/config')
const qb = require('./../module/qbittorrent')
const db = require('./../module/db')
const ffmpeg = require('fluent-ffmpeg')
const logger = require('./../module/logger')('Handle: Init')
const runAndSetInterval = require('./../module/runAndSetInterval')

runAndSetInterval(async () => {
  await process()
}, 60, 'Check torrent status')

async function removeTorrent (hash, removeFile = true) {
  logger.debug(`Deleting torrent ${hash}`)
  await qb.deleteTorrent(hash, removeFile)

  db.downloaded.push({ hash })
}

async function process () {
  const torrentList = await qb.getTorrentList()

  for (const i in torrentList) {
    const item = torrentList[i]
    const hash = item.hash

    const queueInfo = _.find(db.queue, { torrentHash: hash })
    logger.info('Processing torrent', hash)
    logger.debug('JAV queue info', queueInfo)

    if (!queueInfo) {
      logger.error('Torrent info not found')

      await removeTorrent(hash)
      continue
    }

    const JAVinfo = queueInfo.metadata
    if (!JAVinfo) {
      logger.warn(`[${queueInfo.JAVID}] JAV info not found`)
      await removeTorrent(hash)
      continue
    }

    const torrentContent = await qb.getTorrentContent(hash)
    let videoFileInfo
    for (const index in torrentContent) {
      const file = torrentContent[index]

      if (`${file.name}`.endsWith('.mp4')) {
        videoFileInfo = file
        break
      }
    }
    if (!videoFileInfo) {
      logger.warn('No matched video file for', hash)
      await removeTorrent(hash)
      continue
    }

    console.log(queueInfo, JAVinfo)
    const customPath = config.get('qbittorrent.savePath')
    const filePath = (customPath || item.save_path) + videoFileInfo.name

    let videoMetadata

    try {
      videoMetadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (error, metadata) => {
          if (error) {
            reject(error)
            return
          }

          metadata = metadata.streams
          if (!metadata[0] || !metadata[1]) {
            resolve({
              video: {
                width: 0,
                height: 0,
                codec: '',
                duration: 0,
                bitRate: 0,
                fps: 0
              },
              audio: {
                codec: '',
                duration: 0,
                bitRate: 0,
                channels: 0
              }
            })
            return
          }
          const videoMetadata = {
            video: {
              width: metadata[0].width,
              height: metadata[0].height,
              codec: metadata[0].codec_name,
              duration: Math.round(metadata[0].duration),
              bitRate: metadata[0].bit_rate,
              fps: parseFloat(metadata[0].nb_frames / metadata[0].duration).toFixed(2)
            },
            audio: {
              codec: metadata[1].codec_name,
              duration: Math.round(metadata[1].duration),
              bitRate: metadata[1].bit_rate,
              channels: metadata[1].channels
            }
          }

          resolve(videoMetadata)
        })
      })
    } catch (error) {
      logger.error('FFMpeg threw an error', error)
      await removeTorrent(hash)
      continue
    }

    const dotInfoFile = {
      version: 2,
      JAVID: queueInfo.JAVID,
      videoMetadata: videoMetadata,
      JAVMetadata: JAVinfo,
      processTime: (new Date()).getTime(),
      hash: hash,
      episode: 'A'
    }

    logger.debug('info.json content', dotInfoFile)

    const fileHash = objectHash(dotInfoFile)
    const dirName = path.join(__dirname, `../../tmp/sync/${fileHash.substr(0, 2)}/`, `${fileHash.substr(-2, 2)}/`, `${fileHash}/`)
    fs.mkdirSync(dirName, { recursive: true })
    fs.writeFileSync(dirName + 'info.json', JSON.stringify(dotInfoFile))

    logger.debug(`Moving ${filePath} to ${dirName}video.mp4`)
    fs.renameSync(filePath, dirName + 'video.mp4')

    await removeTorrent(hash, false)

    db.downloaded.push({ hash: queueInfo.hash })
    logger.info('Torrent', hash, 'processed!')
  }
}
