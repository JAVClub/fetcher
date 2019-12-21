const log = require('log4js').getLogger('fetcher');
const CONFIG = require('./config');

log.level = CONFIG['logLevel'];

module.exports = log;