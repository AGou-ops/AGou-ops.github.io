---
title: "Web 压测工具"
date: 2020-07-14T10:23:47+08:00
lastmod: 2020-07-14T10:23:47+08:00
draft: false
description: ""
tags: ["压测","web","http","工具","持续更新"]
categories: ["benchmark","web","Tools"]
keywords: []

author: "AGou-ops"

# weight:
# menu: "main"
comment: true
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

## web benchmark tools

### Apache Bench

> ApacheBench 是一个用来衡量http服务器性能的单线程命令行工具。原本针对Apache http服务器，但是也适用于其他http服务器。

如果你的操作系统没有`ab`工具， 那么只需安装`httpd-tools`(CentOS)或者`apache-utils`(Ubuntu)即可。

<!--more-->

常用参数说明：
* -n：执行的请求次数
* -c：并发数量
* -s：响应的超时时间
* -p：post请求的数据文件路径，需要设置-T参数
* -T：Content-Type
* -C：设置cookie，格式为"name=zhou"

常用组合：

```bash
ab -n 10000 -c 1000 http://localhost/index.html
```



### wrk 

> wrk HTTP是一个现代的基准测试工具能产生显著的负载运行时在一个多核CPU。它结合了多线程设计可伸缩的系统如epoll和kqueue事件通知。

官方github仓库： https://github.com/wg/wrk

编译安装：

```bash
wget https://github.com/wg/wrk/archive/4.1.0.tar.gz
tar xf 4.1.0.tar.gz
cd 4.1.0/deps
tar xf LuaJIT-2.1.0-beta3.tar.gz -C /usr/local
tar xf openssl-1.1.0g.tar.gz -C /usr/local
cd ..
make WITH_LUAJIT=/usr/local/LuaJIT-2.1.0-beta3 WITH_OPENSSL=/usr/local/openssl-1.1.0g
make install
```

常用参数说明：

* -t：线程数
* -c：http总请求数量
* -d：测试时长，e.g. 2s, 2m, 2h

简单使用：

```bash
wrk -t12 -c400 -d30s http://127.0.0.1:8080/index.html
```

### 待续。。。