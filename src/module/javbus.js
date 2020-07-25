const pRetry = require('p-retry')
const parser = new (require('dom-parser'))()
const logger = require('./logger')('Module: JAVBus')
const fetch = require('node-fetch')

module.exports = async (JAVID) => {
  logger.debug('Request URL', 'https://www.javbus.com/ja/' + JAVID)
  const result = await pRetry(async () => {
    const res = await fetch('https://www.javbus.com/ja/' + JAVID, {
      headers: {
        'Cache-Control': 'max-age=0',
        Host: 'www.javbus.com',
        Referer: 'https://www.javbus.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36'
      },
      timeout: 7000
    }).then((res) => res.text())

    return res
  }, {
    onFailedAttempt: async (error) => {
      logger.debug(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left`)

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 20000)
      })
    },
    retries: 5
  })

  logger.debug('Result length', result.length)

  const dom = parser.parseFromString(result)

  const data = {
    title: '',
    cover: '',
    studio: '',
    series: '',
    tags: [],
    stars: [],
    releaseDate: '',
    screenshots: []
  }

  if (!dom.getElementsByClassName('info')[0]) {
    logger.debug('JAV not found')
    return
  }

  const a = dom.getElementsByClassName('info')[0].getElementsByTagName('a')
  for (const i in a) {
    const item = a[i]
    const at = item.attributes
    for (const x in at) {
      const attr = at[x]
      if (attr.name === 'href') {
        const v = attr.value
        if (!data.studio && v.indexOf('/ja/studio/') !== -1) {
          logger.debug(JAVID, 'Got studio info', item.textContent)
          data.studio = item.textContent
        } else if (!data.series && v.indexOf('/ja/series/') !== -1) {
          logger.debug(JAVID, 'Got series info', item.textContent)
          data.series = item.textContent
        } else if (v.indexOf('/ja/genre/') !== -1) {
          logger.debug(JAVID, 'Got tag info', item.textContent)
          data.tags.push(item.textContent)
        }
      }
    }
  }

  const imgs = dom.getElementsByClassName('movie')[0].getElementsByTagName('img')
  for (const i in imgs) {
    const item = imgs[i]
    const attrs = item.attributes
    if (attrs[0] && (attrs[0].value.indexOf('/actress/') !== -1 || attrs[0].value.indexOf('nowprinting') !== -1)) {
      logger.debug(JAVID, 'Got star name', attrs[1].value.trim())
      data.stars.push({
        name: attrs[1].value.trim(),
        img: attrs[0].value.trim()
      })
    } else if (attrs[0] && (attrs[0].value.indexOf('/cover/') !== -1 || attrs[0].value.indexOf('digital/video') !== -1)) {
      logger.debug(JAVID, 'Got JAV name', attrs[1].value)
      data.title = attrs[1].value
      logger.debug(JAVID, 'Got JAV cover', attrs[0].value)
      data.cover = attrs[0].value
    }
  }

  const p = dom.getElementsByClassName('info')[0].getElementsByTagName('p')
  for (const i in p) {
    if (data.releaseDate) continue
    const item = p[i]
    if (item.firstChild && item.firstChild.textContent.indexOf('発売日:') !== -1) {
      logger.debug(JAVID, 'Got JAV release date', item.lastChild.textContent.trim())
      data.releaseDate = item.lastChild.textContent.trim()
    }
  }

  let s = dom.getElementById('sample-waterfall')
  if (s) {
    s = s.getElementsByTagName('a')
    for (const i in s) {
      const item = s[i]
      logger.debug(item.attributes)
      if (item.attributes[1]) data.screenshots.push(item.attributes[1].value)
    }
  }

  logger.debug(JAVID, data)

  if (!data || !data.tags.length) {
    logger.warn('Invalid info for', data)
    return
  }
  
  if (!data.stars.length) {
    data.stars = [
      {
        name: '素人',
        img: 'https://pics.dmm.co.jp/mono/actjpgs/nowprinting.gif'
      }
    ]
  }

  return data
}
