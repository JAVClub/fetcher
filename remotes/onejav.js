const request = require('request');
const log = require('./../modules/log');
const domParser = require('dom-parser');
const parser = new domParser();
const CONFIG = require('./../modules/config');

class onejav
{
    getPageJAV(URI)
    {
        let JAVList = [];

        return new Promise((resolve, reject) => {
            request.get('https://onejav.com/' + URI,{
                headers: {
                    'Accept': 'text/html',
                    'Accept-Encoding': 'deflate',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Host': 'onejav.com',
                    'Pragma': 'no-cache',
                    'Referer': 'https://onejav.com/new?page=7',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
                },
            },(error, response, body) => {
                if (error || response.statusCode != 200)
                {
                    log.warn(error);
                    reject(error);
                }

                let dom = parser.parseFromString(body);

                let cards = dom.getElementsByClassName('card-content');

                cards.forEach((card) => {
                    let JAVID = card.getElementsByTagName('a')[0].textContent.replace(/\s/g, '');
                    log.debug(`JAVID: ${JAVID}`);

                    let downloadLink = '';
                    card.getElementsByClassName('fa-download')[0].parentNode.attributes.forEach((item) => {
                        if (item.name == 'href')  downloadLink = 'https://onejav.com' + item.value;
                    });
                    log.debug(`Download Link: ${downloadLink}`);
                    if (!downloadLink)
                    {
                        log.error(`CANNOT find the download link of ${JAVID}`);
                        return;
                    }
                    JAVList[JAVList.length] = {
                        id: JAVID,
                        link: downloadLink,
                    };
                });

                resolve(JAVList);
            });
        });
    }
}

module.exports = onejav;