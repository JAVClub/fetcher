const logger = require('./../../module/logger')('Module: OneJAV')
const DomParser = require('dom-parser')
const parser = new DomParser()
const fetch = require('node-fetch')
const pRetry = require('p-retry')
const sha256 = require('sha256')

class Onejav {
  constructor (url) {
    this._url = url
  }

  async run () {
    const content = await this.fetchContent()

    return await this.parseContent(content)
  }

  async fetchContent () {
    logger.debug('Fetching', this._url)
    const content = await pRetry(async () => {
      const response = await fetch(this._url, {
        timeout: 10000
      })
      logger.debug('Status code:', response.status)
      if (response.status === 404 || response.status === 403) {
        throw new pRetry.AbortError(response.statusText)
      }

      return response.text()
    }, {
      onFailedAttempt: error => {
        logger.warn(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`)
      },
      retries: 5
    })

    const dom = await parser.parseFromString(content)
    if (!dom) throw new Error('Invalid HTML')

    return dom
  }

  parseContent (dom) {
    const cards = dom.getElementsByClassName('card-content')
    console.log(cards)
    const processed = []

    for (const i in cards) {
      const card = cards[i]
      let JAVID = card.getElementsByTagName('a')[0]
      if (!JAVID) continue
      JAVID = JAVID.textContent
      JAVID = `${JAVID}`.replace(' ', '').replace('\n', '').trim()
      JAVID = JAVID.replace(/([a-zA-Z]+)(\d+)/, '$1-$2')
      logger.debug('Get JAVID', JAVID)

      let size = card.getElementsByClassName('is-size-6')[0]
      size = parseFloat(`${size.textContent}`.replace('GB', '').trim())
      logger.debug('Get size', size)

      let torrentURL = card.getElementsByClassName('is-fullwidth')[0]
      torrentURL = 'https://onejav.com' + `${torrentURL.getAttribute('href')}`.trim()
      logger.debug('Get torrent URL', torrentURL)

      const hash = sha256(torrentURL + size + JAVID)
      logger.debug('Get hash', hash)

      processed.push({
        hash,
        JAVID,
        size,
        torrentURL
      })
    }

    logger.debug('Processed', processed)
    return processed
  }
}

module.exports = Onejav
