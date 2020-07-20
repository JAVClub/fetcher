const fs = require('fs')
const path = require('path')
const sha256 = require('sha256')
const logger = require('./../module/logger')('Module: DB')

const db = {}

const dbPathname = path.join(__dirname, '../../database')
const saveList = ['downloaded', 'queue']

for (const i of saveList) {
  let hash = ''
  const filename = dbPathname + '/' + i + '.json'

  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename).toString()
    db[i] = JSON.parse(content)
    hash = JSON.stringify(sha256(db[i]))
  } else db[i] = []

  setInterval(() => {
    const newHash = sha256(JSON.stringify(db[i]))
    if (newHash !== hash) {
      hash = newHash
      fs.writeFile(filename, JSON.stringify(db[i]), () => {
        logger.debug(`File ${i}.json saved`)
      })
    }
  }, 5000)
}

module.exports = db
