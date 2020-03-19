#!/bin/bash

cd /data/torrent/fetcher/

if [ "$1" = 'pull' ]; then
    COMMAND="/usr/bin/node /data/torrent/fetcher/pull.js"
    REGEX='pull.js$'
else
    COMMAND="/usr/bin/node /data/torrent/fetcher/handle.js"
    REGEX='handle.js$'
fi

if ps aux | grep -e "$REGEX" >/dev/null; then
    exit 1
else
    cd /data/torrent/fetcher/
    $COMMAND
fi