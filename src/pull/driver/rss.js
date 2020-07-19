const logger = require('./../../module/logger')('Module: RSS')
const parser = new (require('rss-parser'))()
const fetch = require('node-fetch')
const pRetry = require('p-retry')

class RSS {
  /**
     * Create RSS fetcher object
     *
     * @param {String} url Feed URL
     * @param {String} type Feed format
     */
  constructor (url, type) {
    this._url = url
    this._type = type
  }

  async run () {
    const rssContent = await this.fetchContent()

    switch (this._type) {
    case 'MT':
      return this.feedParserMT(rssContent)
    }
  }

  /**
     * Fetch RSS feed
     *
     * @returns {Object} RSS Contents
     */
  async fetchContent () {
    logger.debug('Fetching', this._url)
    const res = await pRetry(async () => {
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

    const content = await parser.parseString(res)
    if (!content) throw new Error('Invalid RSS Feed')

    return Object.assign({}, content)
  }

  /**
     * RSS parser for MT
     *
     * @param {Object} content RSS content
     *
     * @returns {Array}
     */
  feedParserMT (content) {
    const regexStr = /^([a-zA-Z]{2,7}-\d+) (.*)\[(\d+\.\d+) GB\]$/
    const processed = []

    for (const i in content.items) {
      const item = content.items[i]
      const title = `${item.title}`
      const torrentURL = item.enclosure.url
      const hash = item.guid

      const regexResult = title.match(regexStr)
      if (!hash || !torrentURL || !regexResult || !regexResult[1] ||
                (regexResult[1].indexOf('-') === -1) ||
                !regexResult[3] || (regexResult[3].indexOf('.') === -1)) {
        logger.warn('Invalid item', title)
        continue
      }

      const JAVID = `${regexResult[1]}`.toUpperCase()
      const size = parseFloat(regexResult[3])

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

module.exports = RSS
