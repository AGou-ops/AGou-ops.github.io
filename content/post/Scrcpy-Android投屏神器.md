---
title: "Scrcpy Android投屏神器"
date: 2020-05-28T20:22:13+08:00
lastmod: 2020-05-28T20:22:13+08:00
draft: false
description: "跨平台安卓投屏神器"
tags: ['Scrcpy','Android']
categories: ['Tools','Android','Ubuntu']
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

## Scrcpy 简介

应用程序可显示和控制通过USB（或通过TCP / IP）连接的Android设备。它不需要任何根访问权限。它适用于GNU / Linux，Windows和macOS。

github地址：[https://github.com/Genymobile/scrcpy](https://github.com/Genymobile/scrcpy)

<!--more-->

## 配置环境

1. 安装`adb`服务，使用数据线连接自己的安卓设备，并查看自己的安卓设备：

```bash
sudo apt-get install android-tools-adb
adb start-server
$ lsusb
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 005: ID 0bda:0821 Realtek Semiconductor Corp.
Bus 001 Device 004: ID 0bda:0129 Realtek Semiconductor Corp. RTS5129 Card Reader Controller
Bus 001 Device 003: ID 13d3:a745 IMC Networks
Bus 001 Device 054: ID `24ae:1813`
...
```

找到自己的安卓设备哪一行，`24ae`、`1813`在下面会用到。

2. 创建设备文件：

下面命令中的名称`71-android`是自定义的，我的这个代表安卓7.1的意思。

```bash
echo 0x12d1 > ~/.android/adb_usb.ini
touch /etc/udev/rules.d/71-android.rules
gedit /etc/udev/rules.d/71-android.rules
```

将以下内容写入刚刚创建的文件，注意，下面的`24ae`、`1813`要改成自己的安卓设备的id（见上）：

> SUBSYSTEM"usb", ATTRS{idVendor}"24ae", ATTRS{idProduct}=="1813", MODE="0666"

更改文件权限：

```bash
chmod 666 /etc/udev/rules.d/90-android.rules
```

3. 重启 ADB 服务：

```bash
service udev restart
adb kill-server
adb start-server
```

## Scrcpy 安装与使用

安装：

```bash
# 使用snap安装
sudo snap install scrcpy
# 或者
apt install scrcpy
```

列出设备：

```bash
scrcpy.adb devices
```

开始投屏：

```bash
scrcpy
```

## 设置无线连接Android设备

:information_source:先使用数据线将手机和电脑连接并在手机端开启「开发者选项」及「USB 调试」

```bash
# 开启手机端口
adb tcpip 6666
```

拔出数据线，开启无线连接：

```bash
adb connect 192.168.8.154:6666
```

`192.168.8.154`为你Android设备的IP地址，可以通过路由器后台获取或者在手机上使用相关软件进行获取。

启动 scrcpy ：

```bash
scrcpy
```

## Scrcpy 快捷键

| Action                                      | Shortcut                      | Shortcut (macOS)             |
| ------------------------------------------- | ----------------------------- | ---------------------------- |
| Switch fullscreen mode                      | `Ctrl`+`f`                    | `Cmd`+`f`                    |
| Rotate display left                         | `Ctrl`+`←` *(left)*           | `Cmd`+`←` *(left)*           |
| Rotate display right                        | `Ctrl`+`→` *(right)*          | `Cmd`+`→` *(right)*          |
| Resize window to 1:1 (pixel-perfect)        | `Ctrl`+`g`                    | `Cmd`+`g`                    |
| Resize window to remove black borders       | `Ctrl`+`x` \| *Double-click¹* | `Cmd`+`x` \| *Double-click¹* |
| Click on `HOME`                             | `Ctrl`+`h` \| *Middle-click*  | `Ctrl`+`h` \| *Middle-click* |
| Click on `BACK`                             | `Ctrl`+`b` \| *Right-click²*  | `Cmd`+`b` \| *Right-click²*  |
| Click on `APP_SWITCH`                       | `Ctrl`+`s`                    | `Cmd`+`s`                    |
| Click on `MENU`                             | `Ctrl`+`m`                    | `Ctrl`+`m`                   |
| Click on `VOLUME_UP`                        | `Ctrl`+`↑` *(up)*             | `Cmd`+`↑` *(up)*             |
| Click on `VOLUME_DOWN`                      | `Ctrl`+`↓` *(down)*           | `Cmd`+`↓` *(down)*           |
| Click on `POWER`                            | `Ctrl`+`p`                    | `Cmd`+`p`                    |
| Power on                                    | *Right-click²*                | *Right-click²*               |
| Turn device screen off (keep mirroring)     | `Ctrl`+`o`                    | `Cmd`+`o`                    |
| Turn device screen on                       | `Ctrl`+`Shift`+`o`            | `Cmd`+`Shift`+`o`            |
| Rotate device screen                        | `Ctrl`+`r`                    | `Cmd`+`r`                    |
| Expand notification panel                   | `Ctrl`+`n`                    | `Cmd`+`n`                    |
| Collapse notification panel                 | `Ctrl`+`Shift`+`n`            | `Cmd`+`Shift`+`n`            |
| Copy device clipboard to computer           | `Ctrl`+`c`                    | `Cmd`+`c`                    |
| Paste computer clipboard to device          | `Ctrl`+`v`                    | `Cmd`+`v`                    |
| Copy computer clipboard to device and paste | `Ctrl`+`Shift`+`v`            | `Cmd`+`Shift`+`v`            |
| Enable/disable FPS counter (on stdout)      | `Ctrl`+`i`                    | `Cmd`+`i`                    |

*¹Double-click on black borders to remove them.*
*²Right-click turns the screen on if it was off, presses BACK otherwise.*

## 参考链接

* Scrcpy Documentation: https://github.com/Genymobile/scrcpy