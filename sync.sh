#!/bin/bash

if ps aux | grep -e 'JAVGD:/$' >/dev/null; then
  exit 1
else
  rclone move -P /data/torrent/fetcher/cache/sync JAVGD:/
fi