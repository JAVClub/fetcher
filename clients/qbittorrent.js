const request = require('request');
const querystring = require('querystring');
const log = require('./../modules/log');
const CONFIG = require('./../modules/config');

class qbittorrent {
    constructor(baseURL, username, password) {
        this._baseURL = baseURL;
        this._cookie = '';

        this.getCookie(username, password).then(() => this.addNewCategory('JAVClub'));
    }

    getRequestPromise(uri)
    {
        log.debug('GET ' + uri);
        return new Promise((resolve, reject) => {
            request({
                method: 'get',
                url: this._baseURL + uri,
                headers: {
                    'Cookie': this._cookie,
                },
            },(error, response, body) => {
                if (error)
                    reject(error);

                log.debug('GET Body: ', body);
                resolve(response);
            });
        });
    }

    postRequestPromise(uri, body, type = 'application/x-www-form-urlencoded', formData = {})
    {
        log.debug('POST ' + uri);
        return new Promise((resolve, reject) => {
            let data = {
                method: 'post',
                url: this._baseURL + uri,
                headers: {
                    'Content-Type': type,
                    'Cookie': this._cookie,
                },
                body: body,
            };

            if (formData)
            {
                data.formData = formData;
                delete data.body;
            }

            log.debug('POST Data: ', data);

            request(data,(error, response, body) => {
                if (error)
                    reject(error);

                log.debug('POST Body: ', body);
                resolve(response);
            });
        });
    }

    getCookie(username, password)
    {
        return new Promise((resolve) => {
            request.post(this._baseURL + '/api/v2/auth/login',{
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password)
            },(error, response) => {
                log.debug('Auth body:', response.body);
                if (response.body == 'Ok.')
                {
                    response.headers['set-cookie'].forEach((item) => 
                        this._cookie = this._cookie + item.split(';')[0] + ';'
                    );
                    this._cookie = this._cookie.substr(0, this._cookie.length - 1);
                    log.info('Cookie: ' + this._cookie);
                    resolve();
                } else {
                    log.error('Qbittorrent login failed.');
                    process.exit(1);
                }
            });
        });
    }

    getTorrentList()
    {
        log.info('Getting torrent list');
        return this.getRequestPromise('/api/v2/torrents/info?limit=' + CONFIG['handlerQueueNum'] + '&category=JAVClub&sort=completion_on&reverse=true');
    }

    getTorrentInfo(hash)
    {
        log.info('Getting torrent ' + hash + ' info');
        return this.getRequestPromise('/api/v2/torrents/properties?hash=' + hash);
    }

    getTorrentContent(hash)
    {
        log.info('Getting torrent ' + hash + ' content');
        return this.getRequestPromise('/api/v2/torrents/files?hash=' + hash);
    }

    addTorrentLink(url)
    {
        return this.postRequestPromise('/api/v2/torrents/add', '','multipart/form-data',{
            urls: url,
            category: 'JAVClub',
            upLimit: CONFIG['upLimit']
        });
    }

    addNewCategory(name)
    {
        log.info('Adding category ' + name);
        return this.postRequestPromise('/api/v2/torrents/createCategory', 
        '', 'application/x-www-form-urlencoded', {category: name, savePath: name});
    }

    pauseTorrent(hash)
    {
        log.info('Pausing torrent ' + hash);
        return this.postRequestPromise('/api/v2/torrents/pause', '', 'application/x-www-form-urlencoded', {hashes: hash});      
    }

    resumeTorrent(hash)
    {
        log.info('Resuming torrent ' + hash);
        return this.postRequestPromise('/api/v2/torrents/resume', '', 'application/x-www-form-urlencoded', {hashes: hash});  
    }

    deleteTorrent(hash)
    {
        log.info('Deleting torrent ' + hash);
        return this.postRequestPromise('/api/v2/torrents/delete', '', 'application/x-www-form-urlencoded', {hashes: hash, deleteFiles: 'false'});  
    }
}

module.exports = qbittorrent;