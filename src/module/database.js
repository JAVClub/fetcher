const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync(__dirname + '/../../database/db.json')
const db = low(adapter)

db.defaults({ contents: [], downloaded: [], processed: [] }).write()

module.exports = db
