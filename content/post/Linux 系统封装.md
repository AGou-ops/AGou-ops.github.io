---
title: "Linux 系统封装"
date: 2020-07-10T21:16:31+08:00
lastmod: 2020-07-10T21:16:31+08:00
draft: false
description: ""
tags: ["Linux", "系统封装"]
categories: ["Linux","CentOS","Ubuntu"]
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

## Mondo Rescue

Mondo Rescue（简称 Mondo）：是一款开源免费的故障恢复和备份工具，可以说是 Linux 操作系统下的 Ghost ，你可以轻松地创建系统（Linux 或 Windows）克隆或备份的 ISO 镜像，可以将这些镜像存放在 CD、DVD、磁带、USB 设备、硬盘和 NFS 上。

官方站点:http://www.mondorescue.org/


<!--more-->

### 安装 mondo

从[官方指定的仓库](http://mondo.mirror.pclark.com/ftp/pub/mondorescue/)下载

```bash
wget http://mondo.mirror.pclark.com/ftp/pub/mondorescue/centos/7/x86_64/mondorescue.repo -O /etc/yum.repos.d/mondorescue.repo
yum install -y mondo
```

或者直接安装`rpm`包:

```bash
yum install -y http://mondo.mirror.pclark.com/ftp/pub/mondorescue/centos/7/x86_64/mondo-3.3.0-1.centos7.x86_64.rpm
```

使用该方法安装可能会缺少依赖包文件,在这里手动解决依赖关系即可(太多了,说着玩的,还是推荐用在线仓库安装吧...):

```bash
yum install -y http://ftp.mondorescue.org/centos/7/x86_64/afio-2.5-1.centos7.x86_64.rpm
yum install -y http://ftp.mondorescue.org/centos/7/x86_64/mindi-3.3.0-1.centos7.x86_64.rpm
yum install -y http://ftp.mondorescue.org/centos/7/x86_64/buffer-1.19-8.centos7.x86_64.rpm
...
```

### 制作光盘镜像

安装完毕后，在终端下输入`mondoarchive`，即可进入图形安装界面。

```bash
mondoarchive
See /var/log/mondoarchive.log for details of backup run.
Checking sanity of your Linux distribution
.......
````

随后,按照引导一步步设置即可.

## Remastersys 

Remastersys 可以将你安装的 Ubuntu、Debian 及其衍生版打包成一个可以用来安装的 Live CD/DVD 的 ISO 镜像文件，可打包一个包含个人数据的 ISO 镜像文件作为操作系统备份，也可以打包一个不包含个人数据的 ISO 镜像文件发布给其他人安装。

### **Remastersys 包下载**

```
$ mkdir tools
$ cd tools/
$ wget ftp://ftp.gwdg.de/pub/linux/easyvdr/mirror/remastersys/ubuntu/remastersys/remastersys_3.0.4-2_all.deb 
$ wget ftp://ftp.gwdg.de/pub/linux/easyvdr/mirror/remastersys/ubuntu/remastersys-gui/remastersys-gui_3.0.4-1_amd64.deb
```

### **安装 Remastersys 依赖**

```
$ sudo apt-get install syslinux-utils isolinux squashfs-tools casper libdebian-installer4 ubiquity-frontend-debconf user-setup discover xresprobe systemd
```

### **安装 Remastersys-gui 依赖**

```
$ sudo apt-get install libvte-common libvte9 plymouth-x11

```

### **开始安装 Remastersys**

```
$ cd tools/
$ sudo dpkg -i remastersys_3.0.4-2_all.deb
$ sudo dpkg -i remastersys-gui_3.0.4-1_amd64.deb
```

**Remastersys 备份操作系统**

**命令行模式：**

```java
$ sudo remastersys backup
```

**图形化模式：**

```java
$ sudo remastersys-gui
```

