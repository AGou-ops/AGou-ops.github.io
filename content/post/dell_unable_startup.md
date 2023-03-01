---
title: "记戴尔品牌机开机黑屏无logo故障"
date: 2021-07-26T19:43:31+08:00
lastmod: 2021-07-26T19:43:31+08:00
draft: false
description: ""
tags: ["故障", "硬件"]
categories: ["故障","桌面运维"]
keywords: []

author: "AGou-ops"

# weight:
# menu: "main"
# comment: true
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

今天白天同事钉钉上联系我，说电脑无法正常开机，约定好时间之后，我去到该同事工位看了看。其确切故障是电脑按下开机键之后无任何反应，显示器上连品牌logo都不显示。我的初步判断是：

- 显示屏是否有问题，或者是不是HDMI线接触不良？
- 主板上显卡是不是接触不良？
<!--more-->

问同事和自己亲手检查线之后排除显示屏的问题，随后拆机看了看显卡，显卡是内嵌在主板上的，没有独立显卡，所以先暂时排除显卡的问题。接下来将注意力转移到`内存条`上面来，强制关闭电脑并断电之后，重新拔插了内存条然后开机，按下电源键`短暂显示logo之后就没反应了，强制重启之后logo不显示`，尝试将内存条切换到另外一个插槽之后，还是相同的故障。

通过网站查询故障以及联系戴尔售后技术支持，最终解决了这个问题，具体步骤如下：

1. 电脑完全断电关机之后，拔掉下图中的蓝色JUMP跳线帽，然后接上电源开机；

![pic1](https://cdn.agou-ops.cn/blog-images/dell/dell_1.jpg?x-oss-process=style/images)

2. 开机会自动进入BIOS自检，会提示一个警告信息，内容为`警告，上次启动时未检测到内存`，实际意思大概就是`内存有变动`，不用管这个警告，点击下一步continue即可；


![pic2](https://cdn.agou-ops.cn/blog-images/dell/dell_2.jpg?x-oss-process=style/images)

3. 如若未插跳线帽，每次开机会提示以下信息，意思很简单，就不翻译了；


![pic3](https://cdn.agou-ops.cn/blog-images/dell/dell_3.jpg?x-oss-process=style/images)

4. 电脑正常开机之后，关机完全断电，然后将JUMP蓝色跳线帽接回原来位置，合好机箱，正常开机即可。

## 总结

故障处理很简单，原因可能是内存条金手指接触不良原因导致，学了一手插拔跳线帽操作，针不戳。