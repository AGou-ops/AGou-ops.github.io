---
title: "Linux 生成随机数"
date: 2020-06-01T10:01:51+08:00
lastmod: 2020-06-01T10:01:51+08:00
draft: false
description: ""
tags: ['Linux','随机数', 'openssl']
categories: ['Linux']
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

[TOC]

## 通过 openssl 生成

```bash
[root@myhost ~]\# openssl rand -base64 3
xsSp

[root@myhost ~]\# openssl rand -base64 8
8SlHCsBAiYw=

[root@myhost ~]\# openssl rand -base64 10
nUzBw8ngKGGqWw==

`openssl rand -base64 32|tr A-Z a-z|cut -c 1-10`
```

## 使用 date 命令生成

```bash
[root@myhost ~]\# date +%s
1539071518

[root@myhost ~]\# date +%N
801398716

[root@myhost ~]\# date +%s%N
1539071555311467855

`date +%s |sha256sum |base64 |head -c 10 ;echo`
```

## 使用 md5sum 生成随机数

```bash
date | md5sum
```

## 使用 dd 命令生成随机数

```bash
dd if=/dev/urandom bs=1 count=15|base64 -w 0
```

## 通过/dev/random设备产生uuid

```bash
[root@myhost ~]\# cat /proc/sys/kernel/random/uuid
a3dfb0f2-f893-4e57-9d67-184a88d4cb5d

[root@myhost ~]\# cat /proc/sys/kernel/random/uuid |cut -c 1-8
b80c60d8
```

## 使用系统环境变量 RANDOM

```bash
[root@myhost ~]\# echo $RANDOM
14535

##说明：linux系统下的环境变量$RANDOM的取值范围是：0–32767 。
```

1.  产生0-25范围内的数，用这个环境变量对26取余即可。

```bash
[root@myhost ~]\# echo $(($RANDOM%26))
6

[root@myhost ~]\# echo $((RANDOM%26))
11

##说明：第二个表达式RANDOM前面无$符号好像也可以。
```

2.  产生6位数的整数，用这个环境变量加上100000即可。

```bash
[root@myhost ~]\# echo $(($RANDOM+100000))
117482

[root@myhost ~]\# echo $((RANDOM+100000))
126058

##说明：第二个表达式RANDOM前面无$符号好像也可以。
```

3.  产生加密的随机数码，将随机数管道给命令md5sum命令即可。

```bash
[root@myhost ~]\# echo $RANDOM |md5sum
6ee8cd13547eb044ad13ba014573af6f  -
```

4.  需要固定位数的随机数码，将随机数管道给命令md5sum命令再管道给cut命令即可。

```bash
[root@myhost ~]\# echo $RANDOM |md5sum|cut -c 1-8
de3cfe23
```

## 使用第三方工具

1. expect 非交互式程序控制下用`mkpasswd`命令：

```bash
yum install -y expect

mkpasswd   -l 7		# 生成七位密码包含大小写加特殊字符
```

2. 使用`pwgen`生成随机可读的密码：

```bash
yum install pwgen

# 生成长度8，含有数字，含有大小写字母的密码4个，列打印
pwgen -ncC 8 4
# 生成长度8，含有数字，含有小写字母，不包含歧义的密码4个，列打印
pwgen -nABC 8 4

# 生成长度16，含有数字，含有大小写字母，含有特殊字符的密码8个，行打印
pwgen -ncy1 16 8
```

参数说明：

* `-c or –capitalize`密码中至少包含一个大写字母
* `-A or –no-capitalize`密码中不包含大写字母
* `-n or –numerals`密码中至少包含一个数字
* `-0 or –no-numerals`密码中不包含数字
* `-y or –symbols`密码中至少包含一个特殊符号
* `-s or –secure`生成完全随机密码
* `-B or –ambiguous`密码中不包含歧义字符（例如1,l,O,0）
* `-H or –sha1=path/to/file[#seed]`使用SHA1 hash给定的文件作为一个随机种子
* `-C`在列中打印生成的密码
* `-1`不要在列中打印生成的密码，即一行一个密码
* `-v or –no-vowels`不要使用任何元音，以避免偶然的脏话

3. 其他第三方工具：

```
randpw、spw、gpg、xkcdpass
```

## 参考链接

* https://blog.csdn.net/yuki5233/article/details/82997001