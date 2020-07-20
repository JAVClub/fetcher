const fetch = require('node-fetch')
const logger = require('./logger')('Module: Qbittorrent')
const config = require('./config')

class Qbittorrent {
  constructor () {
    this._baseURL = config.get('qbittorrent.baseURL')
    this._username = config.get('qbittorrent.username')
    this._password = config.get('qbittorrent.password')
  }

  get _cookie () {
    return (async () => {
      if (this.__cookie_value) {
        return this.__cookie_value
      }

      const response = await fetch(this._baseURL + '/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: 'username=' + encodeURIComponent(this._username) + '&password=' + encodeURIComponent(this._password)
      })

      const body = await response.text()

      logger.debug('Auth body:', body)

      if (body === 'Ok.') {
        const cookieHeader = `${response.headers.get('set-cookie')}`

        this.__cookie_value = cookieHeader.split(';')[0]

        logger.debug('Cookie: ' + this.__cookie_value)

        return this.__cookie_value
      } else {
        logger.error('Qbittorrent login failed')
        throw new Error('Qbittorrent login failed')
      }
    })()
  }

  async sendRequest (uri, data = {}, parse = true) {
    if (!data.method) data.method = 'GET'

    logger.debug(data.method.toUpperCase(), uri)

    if (data.headers) data.headers.Cookie = await this._cookie
    else data.headers = { Cookie: await this._cookie }

    logger.debug(data.method.toUpperCase(), 'data: ', data)

    let response = await fetch(this._baseURL + uri, data)
    if (parse) response = await response.json()
    logger.debug(data.method.toUpperCase(), 'response body', response)

    return response
  }

  async getTorrentList () {
    logger.debug('Getting torrent list')

    const apiURI = '/api/v2/torrents/info?limit=10'
    const uri = apiURI + '&category=JAVClub&filter=paused&sort=completion_on&reverse=true'

    const result = await this.sendRequest(uri)
    return result
  }

  async getTorrentInfo (hash) {
    logger.debug('Getting torrent ' + hash + ' info')

    const uri = '/api/v2/torrents/properties?hash=' + hash

    const result = await this.sendRequest(uri)
    return result
  }

  async getTorrentContent (hash) {
    logger.debug('Getting torrent ' + hash + ' content')

    const uri = '/api/v2/torrents/files?hash=' + hash

    const result = await this.sendRequest(uri)
    return result
  }

  async addTorrentLink (url) {
    logger.debug('Adding new torrent', url)

    const uri = '/api/v2/torrents/add'
    const body = new URLSearchParams()
    body.append('urls', url)
    body.append('category', 'JAVClub')

    const result = await this.sendRequest(uri, {
      method: 'POST',
      body
    }, false)

    return result
  }

  async addNewCategory (name) {
    logger.debug('Adding category ' + name)

    const uri = '/api/v2/torrents/createCategory'
    const body = new URLSearchParams()
    body.append('category', name)
    body.append('savePath', name)

    const result = await this.sendRequest(uri, {
      method: 'POST',
      body
    }, false)

    return result
  }

  async pauseTorrent (hash) {
    logger.debug('Pausing torrent ' + hash)

    const uri = '/api/v2/torrents/pause'
    const body = new URLSearchParams()
    body.append('hashes', hash)

    const result = await this.sendRequest(uri, {
      method: 'POST',
      body
    }, false)

    return result
  }

  async resumeTorrent (hash) {
    logger.debug('Resuming torrent ' + hash)

    const uri = '/api/v2/torrents/resume'
    const body = new URLSearchParams()
    body.append('hashes', hash)

    const result = await this.sendRequest(uri, {
      method: 'POST',
      body
    }, false)

    return result
  }

  async deleteTorrent (hash, deleteFiles = false) {
    logger.debug('Deleting torrent ' + hash)

    const uri = '/api/v2/torrents/delete'
    const body = new URLSearchParams()
    body.append('hashes', hash)
    body.append('deleteFiles', (deleteFiles) ? 'true' : 'false')

    const result = await this.sendRequest(uri, {
      method: 'POST',
      body
    }, false)

    return result
  }
}

module.exports = new Qbittorrent()
