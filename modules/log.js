const log = require('log4js').getLogger();
const CONFIG = require('./config');

log.level = CONFIG['logLevel'];

module.exports = log;