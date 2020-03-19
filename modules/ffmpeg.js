// From https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/449#issuecomment-285759269
const ffmpeg = require("fluent-ffmpeg");
const log = require('./log');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const count = 50;
const timestamps = [];
const startPositionPercent = 1;
const endPositionPercent = 99;
const addPercent = (endPositionPercent - startPositionPercent) / (count - 1);

if (!timestamps.length) {
    let i = 0;
    while (i < count) {
        timestamps.push(`${startPositionPercent + addPercent * i}%`);
        i = i + 1;
    }
}

function compressImage(num, dir)
{
    log.debug('Compressing screenshot', path.join(dir, `${num}.png`));
    return sharp(path.join(dir, `${num}.png`))
        .resize({ width: 1080 })
        .webp({ nearLossless: true })
        .toFile(path.join(dir, `${num}.webp`))
        .then(() => {
            fs.unlinkSync(path.join(dir, `${num}.png`));
        });
}

function takeScreenshots(file, dir, num = 0, callback) {
    log.debug(`Generating #${num} screenshot for video ${file}`);
    return new Promise((resolve, reject) => {
        ffmpeg(file)
        .on("end", () => {
            if (num < count) {
                if (!fs.existsSync(path.join(dir, `${num + 1}.png`)))
                {
                    reject(`Screenshot ${num + 1} not found`);
                }

                if (num + 1 != count)
                {
                    takeScreenshots(file, dir, num + 1, callback);
                }
                
                compressImage(num + 1, dir).then(() => {
                    if (num == count - 1) {
                        log.info(`Taken ${num + 1} screenshots for ${file}`);
                        callback();
                        resolve();
                    }
                });
            }
        })
        .screenshots({
            count: 1,
            timemarks: [timestamps[num]],
            filename: `${num + 1}.png`
        }, dir);
    });
}

module.exports = takeScreenshots;