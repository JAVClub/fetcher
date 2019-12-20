const log = require('simple-node-logger').createSimpleLogger();
const CONFIG = require('./config');

log.setLevel(CONFIG['logLevel']);

module.exports = log;