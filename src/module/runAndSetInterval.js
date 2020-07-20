const logger = require('./logger')('Module: runAndSetInterval')

async function runAndSetInterval (fn, time, name, handler) {
  logger.info(`[${name}] Starting job`)
  try {
    const content = await fn()
    if (handler) handler(content)
  } catch (error) {
    logger.error(`[${name}] Job threw an error`, error)
  }
  logger.info(`[${name}] Job finished, setting timer`)

  setTimeout(() => {
    runAndSetInterval(fn, time, name, handler)
  }, time * 1000)
}

module.exports = runAndSetInterval
