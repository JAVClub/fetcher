# JAVClub fetcher
🔞 Data fetcher for JAVClub core

## 简介

嘛这是一个涩情(划掉) Repo，用来配合涩情(划掉)核心工作

配置没多少, 就只有 `.env` 中的一点点

这个项目差不多是糊出来的, 不过稳得很, 之后可能会考虑重写吧

## 使用

简单讲一下使用方法好了

### 环境

- 任意 Linux 发行版
- Node.js 10+
- qBittorrent
- rclone
- ffmpeg
- Your brain

### 安装

直接 clone 加 npm i 一梭子就好

```bash
git clone https://github.com/JAVClub/fetcher.git
cd fetcher
npm i
```

### 配置

在 `.env` 文件中填写你的服务器信息, 其中 `ratio` 是上传/下载比, 为了维护 BT 社区的生态还是建议调到 1 以上 (至少不是吸血鬼吧 (小声

`onejavPage` 这一栏的话是持续抓取的页面 path, 目前仅支持单页面抓取, 可直接将想要监控下载的页面 path 填入其中

### 运行

因为 qBittorrent 运行以及 ffmpeg 裁片都很耗性能, 所以有必要写一个小脚本来限制, 使用 crontab 来当 watchdog

crontab: 
```crontab
# fetcher pull
*/10 * * * * screen -d -m "/data/torrent/fetcher/daemon.sh" pull

# fetcher handle
*/3 * * * * screen -d -m "/data/torrent/fetcher/daemon.sh" handle

# fetcher upload
*/10 * * * * screen -d -m "/data/torrent/fetcher/sync.sh"
```

其中 pull 是用来拉取种子并添加到 qBittorrent 队列中的

handle 是用来检测 qBittorrent 下载列表中符合要求的种子并处理

最后一个 `sync.sh` 是用来让 rclone 定时上传的, 建议定期 (一个月左右) 更换一块云端硬盘进行上传, 避免过度滥用触发风控 (不确定有没有

## 捐赠

嘛写这个虽然不算麻烦但还是挺繁琐的, 所以如果想请咱喝一杯咖啡也是可以哒

如果有意向的话可以给咱发邮件嘛 (i#amxiaol.in (小声

## 免责声明

本程序仅供学习了解, 请于下载后 24 小时内删除, 不得用作任何商业用途, 文字、数据及图片均有所属版权, 如转载须注明来源

使用本程序必循遵守部署服务器所在地、所在国家和用户所在国家的法律法规, 程序作者不对使用者任何不当行为负责