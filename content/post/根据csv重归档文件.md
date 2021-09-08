---
title: "根据csv重归档文件"
date: 2021-08-11T11:04:05+08:00
lastmod: 2021-08-11T11:04:05+08:00
draft: false
description: ""
tags: ["Shell"]
categories: ["Shell"]
keywords: []

author: "AGou-ops"

# weight:
# menu: "main"
# comment: true
toc: true
autoCollapseToc: true
contentCopyright: '<a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" rel="noopener" target="_blank">CC BY-NC-ND 4.0</a>'
# contentCopyright: '<a href="YOUR_URL" rel="noopener" target="_blank">See origin</a>'
reward: true
mathjax: false
# menu:
#   main:
#     parent: "docs"
#     weight: 1
---

**需求：根据excel中的文件列表，将excel进行简单处理成csv格式，使用sed、awk等结合正则对图片文件按照年月的格式来进行重新归档并输出相关日志。**

<!--more-->

代码如下：

{{< gist "https://gist.github.com/AGou-ops/8943c03635e47c1fc1a3d78de85bd84e.js" >}}