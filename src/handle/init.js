const fs = require('fs')
const path = require('path')
const objHash = require('object-hash')
const config = require('./../module/config')
const qb = require('./../module/qbittorrent')
const db = require('./../module/database')
const ffmpeg = require('fluent-ffmpeg')
const logger = require('./../module/logger')('Handle: Init')

const runAndSetInterval = async (fn, time) => {
  logger.debug('[Check torrent status] Starting job')
  try {
    await fn()
  } catch (error) {
    logger.error('[Check torrent status] Job threw an error', error)
  }
  logger.info('[Check torrent status] Job finished, setting timer')

  setTimeout(() => {
    runAndSetInterval(fn, time)
  }, time * 1000)
}

const process = async () => {
  const torrentList = await qb.getTorrentList()

  for (const i in torrentList) {
    const item = torrentList[i]
    const hash = item.hash

    const JAVcontent = db.get('contents').find({ hash }).value()
    logger.debug('JAV torrent content', JAVcontent)

    if (!JAVcontent) {
      logger.error('Torrent info not found')

      logger.debug(`Deleting torrent ${hash}`)
      await qb.deleteTorrent(hash, true)

      db.get('downloaded').push({ hash }).write()

      continue
    }

    const JAVinfo = db.get('metadatas').find({ JAVID: JAVcontent.JAVID }).value()
    if (!JAVinfo) {
      logger.error(`[${JAVcontent.JAVID}] JAV info not found`)
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
    const customPath = config.get('qbittorrent.savePath')
    const filePath = (customPath || item.save_path) + videoFileInfo.name

    let videoMetadata

    try {
      videoMetadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (error, metadata) => {
          if (error || !metadata) {
            reject(error)
          }

          metadata = metadata.streams
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
      logger.debug(`Deleting torrent ${hash}`)
      await qb.deleteTorrent(hash, true)
      continue
    }

    const dotInfoFile = {
      version: 2,
      JAVID: JAVcontent.JAVID,
      videoMetadata: videoMetadata,
      JAVMetadata: JAVinfo,
      processTime: (new Date()).getTime(),
      hash: hash,
      episode: 'A'
    }

    logger.debug('info.json content', dotInfoFile)

    const fileHash = objHash(dotInfoFile)
    const dirName = path.join(__dirname, `../../tmp/sync/${fileHash.substr(0, 2)}/`, `${fileHash.substr(-2, 2)}/`, `${fileHash}/`)
    fs.mkdirSync(dirName, { recursive: true })
    fs.writeFileSync(dirName + 'info.json', JSON.stringify(dotInfoFile))

    logger.debug(`Moving ${filePath} to ${dirName}video.mp4`)
    fs.renameSync(filePath, dirName + 'video.mp4')

    logger.debug(`Deleting torrent ${hash}`)
    await qb.deleteTorrent(hash)

    db.get('downloaded').push({ hash }).write()
  }
}

runAndSetInterval(async () => {
  await process()
}, 60)
