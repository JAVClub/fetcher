const low = require('lowdb')
const path = require('path')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync(path.join(__dirname, '/../../database/db.json'))
const db = low(adapter)

db.defaults({ contents: [], downloaded: [], processed: [], metadatas: [] }).write()

module.exports = db
