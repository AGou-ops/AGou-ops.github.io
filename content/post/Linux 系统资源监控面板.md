---
title: "Linux 系统资源监控面板"
date: 2020-06-12T19:40:55+08:00
lastmod: 2020-06-12T19:40:55+08:00
draft: false
description: ""
tags: ['Linux','监控']
categories: ['Linux','Tools']
keywords: []

author: "AGou-ops"

# weight:
# menu: "main"
comment: true
toc: true
autoCollapseToc: true
contentCopyright: '<a href="http://www.wtfpl.net/about/" rel="noopener" target="_blank">WTFPL v2</a>'
# contentCopyright: '<a href="YOUR_URL" rel="noopener" target="_blank">See origin</a>'
reward: true
mathjax: false
# menu:
#   main:
#     parent: "docs"
#     weight: 1
---

`WTF`和`bashtop`是我个人目前在用的系统资源管理面板，界面非常的美观，极具极客风范，在这里我分别做简单介绍。 

## WTF

> WTF（又名“wtfutil”）是终端的个人信息仪表板，可快速访问您非常重要但不常需要的统计信息和数据。

项目地址：[https://github.com/wtfutil/wtf](https://github.com/wtfutil/wtf)

官方站点：[https://wtfutil.com/](https://wtfutil.com/)

<!--more-->

先放一张截图吧：

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/Linux%20%E7%9B%91%E6%8E%A7%E9%9D%A2%E6%9D%BF/WTF.png "WTF截图")

面板中有以下展示模块：

* 世界时间
* 我的IP地址信息
* TODO List（待办事件）
* 系统安全状态
* 当前城市天气
* 电源使用情况
* docker 运行状态
* 资源使用情况
* 硬盘占用情况
* 开机时长

好了，废话不多说，直接开始吧。

### 安装与使用

首先打开项目的 [release仓库](https://github.com/wtfutil/wtf/releases) 下载可直接使用的二进制包.

```bash
wget https://github.com/wtfutil/wtf/releases/download/v0.30.0/wtf_0.30.0_linux_amd64.tar.gz
tar xf wtf_0.30.0_linux_amd64.tar.gz
```

解压完成之后，直接运行`./wtfutil`即可，为了日后方便使用，可以将该程序软连接到用户`bin`目录进行使用：

```bash
ln -sv /root/wtfutil /usr/bin/
```

### 配置文件

下面是我的配置文件，配置文件的目录是`$HOME/.config/wtf/config.yml`，可以拿来参考参考：

:information_source:文件比较长，单击[>>> 这里 <<<](#官方支持模块)可直接跳到下一节

```yaml
wtf:
  colors:
    background: black
    border:
      focusable: darkslateblue
      focused: orange
      normal: gray
    checked: yellow
    highlight: 
      fore: black
      back: gray
    rows:
      even: yellow
      odd: white
  grid:
    columns: [40, 35, 35, 55]
    rows: [10, 10, 10, 10, 4]
  refreshInterval: 1
  openFileUtil: "open"
  mods:
    digitalclock:
      color: red
      enabled: true
      font: digitalfont
      hourFormat: 24
      position:
        top: 0
        left: 0
        height: 1
        width: 1
      refreshInterval: 1
      title: "big clock"
      type: "digitalclock"
    world_time:
      title: "World Time"
      type: clocks
      colors:
        rows:
          even: "lightblue"
          odd: "white"
      enabled: true
      locations:
        UTC: "Etc/UTC"
        London: "Europe/London"
        Berlin: "Europe/Berlin"
        New_York: "America/New_York"
        China: "Asia/Shanghai"
      position:
        top: 0
        left: 1
        height: 1
        width: 1
      refreshInterval: 15
      sort: "alphabetical"
    battery:
      type: power
      title: "⚡️"
      enabled: true
      position:
        top: 1
        left: 3
        height: 1
        width: 1
      refreshInterval: 15
    todolist:
      type: todo
      checkedIcon: "X"
      colors:
        checked: gray
        highlight:
          fore: "black"
          back: "orange"
      enabled: true
      filename: "todo.yml"
      position:
        top: 1
        left: 0
        height: 2
        width: 1
      refreshInterval: 3600
    ip:
      type: ipinfo
      title: "My IP"
      colors:
        name: "lightblue"
        value: "white"
      enabled: true
      position:
        top: 0
        left: 2
        height: 1
        width: 2
      refreshInterval: 150
    prettyweather:
      enabled: true
      city: "临沂"
      position:
        top: 1
        left: 2
        height: 1
        width: 1
      refreshInterval: 300
      unit: "m"
      view: 0
      language: "en"
    security:
      enabled: true
      position:
        top: 1
        left: 1
        height: 1
        width: 1
      refreshInterval: 3600
    docker:
      type: docker
      enabled: true
      labelColor: lightblue
      position:
        top: 2
        left: 1
        height: 1
        width: 3
      refreshInterval: 1
    resources:
      type: resourceusage
      enabled: true
      position:
        top: 3
        left: 0
        height: 2
        width: 1
      refreshInterval: 1
    uptime:
      type: cmdrunner
      args: [""]
      cmd: "uptime"
      enabled: true
      position:
        top: 4
        left: 1
        height: 1
        width: 3
      refreshInterval: 30
    disks:
      type: cmdrunner
      cmd: "df"
      args: ["-h"]
      enabled: true
      position:
        top: 3
        left: 1
        height: 1
        width: 3
      refreshInterval: 3600
```

### 官方支持模块

{{< expand "单击以展开" >}}

Azure DevOps
BambooHR
Buildkite
CDS
CircleCI
Clocks
CmdRunner
Crypto Currencies
Datadog
DEV (dev.to)
Digital Clock
DigitalOcean
Docker
Exchange Rates
Feed Reader
Gerrit
Git
GitHub
GitLab
Gitter
Google Apps
Hacker News
Have I Been Pwned (HIBP)
IP Addresses
Jenkins
Jira
Kubernetes
Logger
Mercurial
New Relic
OpsGenie
Pagerduty
Pi-hole
Power
Resource Usage
Rollbar
Security
Sports
Spotify
Subreddit
Textfile
Todo
Todoist
Transmission
TravisCI
Trello
Twitter
VictorOps OnCall
Weather Services
Zendesk

{{< /expand >}}

## bashtop

官方开源仓库：[https://github.com/aristocratos/bashtos](https://github.com/aristocratos/bashtos)

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/Linux%20%E7%9B%91%E6%8E%A7%E9%9D%A2%E6%9D%BF/bashtop.png "截图")

主菜单：
![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/Linux%20%E7%9B%91%E6%8E%A7%E9%9D%A2%E6%9D%BF/bashtop-1.png "主菜单")

选项菜单：
![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/Linux%20%E7%9B%91%E6%8E%A7%E9%9D%A2%E6%9D%BF/bashtop-1.png "选项菜单")

### 安装与使用

Add PPA repository and install bashtop

```bash
 sudo add-apt-repository ppa:bashtop-monitor/bashtop
 sudo apt update
 sudo apt install bashtop
```

安装完毕之后，直接在终端运行`bashtop`即可。

**使用`ESC`键可以呼出菜单，按下`q`键退出。**

### 配置文件

All options changeable from within UI. Config files stored in "`$HOME/.config/bashtop`" folder

#### bashtop.cfg: (auto generated if not found)

```bash
#? Config file for bashtop v. 0.9.9

#* Color theme, looks for a .theme file in "$HOME/.config/bashtop/themes" and "$HOME/.config/bashtop/user_themes", "Default" for builtin default theme
color_theme="Default"

#* Update time in milliseconds, increases automatically if set below internal loops processing time, recommended 2000 ms or above for better sample times for graphs
update_ms="2500"

#* Processes sorting, "pid" "program" "arguments" "threads" "user" "memory" "cpu lazy" "cpu responsive" "tree"
#* "cpu lazy" updates sorting over time, "cpu responsive" updates sorting directly at a cpu usage cost
proc_sorting="cpu lazy"

#* Reverse sorting order, "true" or "false"
proc_reversed="false"

#* Check cpu temperature, only works if "sensors", "vcgencmd" or "osx-cpu-temp" commands is available
check_temp="true"

#* Draw a clock at top of screen, formatting according to strftime, empty string to disable
draw_clock="%X"

#* Update main ui when menus are showing, set this to false if the menus is flickering too much for comfort
background_update="true"

#* Custom cpu model name, empty string to disable
custom_cpu_name=""

#* Enable error logging to "$HOME/.config/bashtop/error.log", "true" or "false"
error_logging="true"

#* Show color gradient in process list, "true" or "false"
proc_gradient="true"

#* If process cpu usage should be of the core it's running on or usage of the total available cpu power
proc_per_core="false"

#* Optional filter for shown disks, should be names of mountpoints, "root" replaces "/", separate multiple values with space
disks_filter=""

#* Enable check for new version from github.com/aristocratos/bashtop at start
update_check="true"

#* Enable graphs with double the horizontal resolution, increases cpu usage
hires_graphs="false"

#* Enable the use of psutil python3 module for data collection, default on OSX
use_psutil="true"
```