# JAVClub fetcher
🔞 Data fetcher for JAVClub core

## 简介

嘛这是一个涩情(划掉) Repo，用来配合涩情(划掉)核心工作

~~配置没多少, 就只有 `.env` 中的一点点~~

~~这个项目差不多是糊出来的, 不过稳得很, 之后可能会考虑重写吧~~

如你们所见已经重写过了, 目前仅支持 RSS 订阅, 后续会补回 OneJAV 订阅

## 使用

近日完整支持 Docker, 仅需几部即可完成部署

### Docker 安装

```bash
# 安装 Docker-ce
curl https://get.docker.com | sudo bash

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.25.4/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 下载项目
git clone https://github.com/JAVClub/fetcher -b RSS
cd fetcher

# 配置项目
cp config/dev.example.json dev.json
vi config/dev.json

# 配置 qBittorrent
cp config/qbittorrent/qBittorrent/qBittorrent.example.conf config/qbittorrent/qBittorrent/qBittorrent.conf

# 启动并进一步配置 qBittorrent
sudo docker-compose up -d qbittorrent
# qBittorrent 已在端口 8585 运行, 默认用户名/密码 admin/adminadmin

# 启动项目
# sudo docker-compose up -d
```

若使用 Docker 则默认配置中 qBittorrent 的地址可以不用更改, 仅需添加下载源即可

下载保存的目录为 `./tmp/downloads`, 处理完保存的目录为 `./tmp/sync`, 使用 Docker 安装完成后仅需使用 `rclone move` 监听 `./tmp/sync` 目录即可

简单讲一下非 Docker 的使用方法好了

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
git clone -b RSS https://github.com/JAVClub/fetcher.git
cd fetcher
npm i
```

### 配置

```json
{
    "system": {
        "logLevel": "debug"
    },
    "remote": [
        {
            "driver": "RSS",
            "type": "MT",
            "url": "https://pt.m-team.cc/torrentrss.php?https=1&rows=50&cat410=1&isize=1&search=-&search_mode=1&linktype=dl&passkey=yourkeyhere"
        }
    ],
    "qbittorrent": {
        "baseURL": "http://127.0.0.1:8080",
        "username": "admin",
        "password": "adminadmin"
    },
    "handler": {
        "queueNum": 5
    }
}
```

在 `config.json` 文件中填写你的服务器信息, 应该看一眼就明白了, 只对一些细节做解释

- **remote[]**
  - **driver:** 目前仅支持 RSS 订阅
  - **type:** RSS 的解析方法 (仅在驱动为 RSS 时生效)
    - **MT:** MT 代表 PT 站 M-Team 的 RSS 格式; 具体: 以车牌号开头(XXX-0NN), 车牌号后紧跟空格, 以大小结尾([xx.xxG]), 可在 Nexus RSS 订阅中勾选包括大小得到
  - **url:** 订阅地址
- **handler.queueNum:** 处理器一次抓取的种子数量, 保持默认即可

### 运行

重构后不再需要从视频中截取分镜, 而是直接从 JAVbus 读取 DMM 的数据, 所以性能消耗有所下降

目前将监测模式更改为了 qBittorrent 自带的指定条件自动暂停, 在使用前请在 qBittorrent 的选项 -> BitTorrent 中按照你的需求勾选做种限制中的任意一项(或两项一起)

运行只需执行 `NODE_ENV=dev node src/app.js` 即可, 可以使用 systemd 等持久化运行工具

当种子处理完毕后, 脚本会自动将处理好的文件移植 `./tmp/sync` 目录, 只需要使用 `rclone move` 监听此目录即可

## 捐赠

嘛写这个虽然不算麻烦但还是挺繁琐的, 所以如果想请咱喝一杯咖啡也是可以哒

用[爱发电](https://afdian.net/@isXiaoLin) (大雾

## 免责声明

本程序仅供学习了解, 请于下载后 24 小时内删除, 不得用作任何商业用途, 文字、数据及图片均有所属版权, 如转载须注明来源

使用本程序必循遵守部署服务器所在地、所在国家和用户所在国家的法律法规, 程序作者不对使用者任何不当行为负责