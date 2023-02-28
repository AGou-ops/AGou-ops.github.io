---
title: "网站简单自动部署（git hook）"
date: 2022-04-06T11:29:12+08:00
lastmod: 2022-04-06T11:29:12+08:00
draft: false
description: "从gitee私有仓库拉取代码，通过本地jenkins将代码push到指定的git服务器（通过ssh），最后rsync同步到指定的网站目录当中。"
tags: ["Git", "hook"]
categories: ["Git"]
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

## 大致流程

![autodeploy001](http://cdn.agou-ops.cn/others/autodeploy001.png)

从gitee私有仓库拉取代码，通过本地jenkins将代码push到指定的git服务器（通过ssh），最后rsync同步到指定的网站目录当中。

<!--more-->

## 脚本相关(jenkins)

### git hooks

内容很简单，在此不再赘述，初始化空的服务端git仓库，参考我之前写的一篇博文：[git-hook介绍与使用](https://agou-ops.cn/post/git-hook%E4%BB%8B%E7%BB%8D%E4%B8%8E%E4%BD%BF%E7%94%A8/)

```shell
[dmy@www2020 ~]$ cat ~/web.com.git/hooks/post-receive 
#!/bin/bash
GIT_REPO=/home/dmy/web.com.git
TMP_GIT_CLONE=/tmp/web.com.git
PUBLIC_WWW=/var/www/html/test
rm -rf ${TMP_GIT_CLONE}
git clone -b main ${GIT_REPO} ${TMP_GIT_CLONE}
sleep 1
cd ${TMP_GIT_CLONE}
# rm -rf ${PUBLIC_WWW}/*
# cp -rf ${TMP_GIT_CLONE}/* ${PUBLIC_WWW}
rsync -av --progress ${TMP_GIT_CLONE}/* ${PUBLIC_WWW}
```

### shell脚本

1. 从`gitee`私有仓库拉取最新`main`分支代码到`jenkins`服务器本地；
2. 检测`jenkins`本地仓库是否存在，如果存在，则直接pull，如果不存在，则clone一份；
3. 添加官网git服务器的地址（通过ssh进行连接，这里可以新建一个无login shell的专门用户），远程git仓库名称`deploy`，分支同样为`main`；
4. 使用`expect`免交互自动输入ssh密码；
5. 另，如果jenkins本地仓库有变更，添加本地文件，提交并push到官网git服务器上；

```shell
#!/bin/bash
#
#**************************************************
# Author:         AGou-ops                        *
# E-mail:         agou-ops@foxmail.com            *
# Date:           2022-04-02                      *
# Description:                              *
# Copyright 2022 by AGou-ops.All Rights Reserved  *
#**************************************************

# jenkins 服务器
localDir=~/Documents/web-workspace/web_web/www2022

rmAndInitRemote() {
    cd ${localDir} 
    # 官网远程git仓库地址,通过ssh连接
    git remote add deploy ssh://<YOUR_SSH_USERNAME>@<YOUR_GIT_SERVER_NAME_OR_IP_HERE>:/home/dmy/web.com.git
}

# ([ -d ${localDir} ] || echo "目录不存在") && mkdir -pv ${localDir}

ls  ${localDir}/.git/config > /dev/null 2>&1
if [ $? -eq 0 ]  
then  
    cd ${localDir}
    # MacOS
    sed -i '' -e '14,$d'   ${localDir}/.git/config
    # Linux 
    # sed -i '14,$d'   ${localDir}/.git/config
    git pull origin main
    rmAndInitRemote
else
    git clone -b main <YOUR_REMOTE_PRIVATE_GIT_REPO_HERE> ${localDir}
    rmAndInitRemote
fi  

sleep 1
cd ${localDir}
# --- 临时
git add -A
git commit -m "rebuilding site $(date)" || true
# ---

# 推送到远程
PASS=<YOUR_SSH_PASSWORD_HERE>

expect << EOF
set timeout 5
spawn git push -f -u deploy main
expect {
    "(yes/no)" {send "yes\r"; exp_continue}
    "password:" {send "$PASS\r"}
}
expect eof
EOF
```

## jenkins中构建运行结果

![image-20220406103914712](http://cdn.agou-ops.cn/others/image-20220406103914712.png)

Done.

