---
title: "编写shell帮助信息通用小技巧"
date: 2020-07-14T11:00:31+08:00
lastmod: 2020-07-14T11:00:31+08:00
draft: false
description: "为你的shell脚本编写帮助信息文档"
tags: ["Linux","shell","脚本","帮助文档","技巧"]
categories: ["Linux","shell"]
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


废话少说， 直接上脚本：

```bash
#!/bin/bash
###
### Some shell version or description here.
###
### Usage:
###   test <input> <output>
###
### Options:
###   <input>   Input file to read.
###   <output>  Output file to write. Use '-' for stdout.
###   -h | --help       Show this message.


help() {
    sed -rn 's/^### ?//;T;p' "$0"
}

# 如果用户输入“-h”或者无参数，执行help函数
if [[ $# == 0 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    help
    exit 1
fi
```

效果：

```bash
╭─agou-ops@ideapad-15ISK ~/tmp 
╰─$ bash test.sh --help

Some shell version or description here.

Usage:
  test <input> <output>

Options:
  <input>   Input file to read.
  <output>  Output file to write. Use '-' for stdout.
  -h | --help       Show this message.
```