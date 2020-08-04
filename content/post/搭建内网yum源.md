---
title: "搭建内网yum源"
date: 2020-08-04T10:23:39+08:00
lastmod: 2020-08-04T10:23:39+08:00
draft: false
description: ""
tags: ["yum"]
categories: ["CentOS"]
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

> 搭建内网yum源，摆脱软件包困扰。 

## 选择合适稳定的公网yum仓库
建议选择对运营商网络友好的yum仓库

国内可供选择的有:
* 阿里云：http://mirrors.aliyun.com/  (这里我使用阿里云)
* 网易：http://mirrors.163.com/

更多国内镜像仓库参考：https://blog.csdn.net/wyqwilliam/article/details/90581159

<!--more-->

## 安装nginx并修改配置文件
为了方便起见，我这里使用yum仓库进行安装.
```bash
[root@centos-7 ~]# yum install nginx -y
[root@centos-7 ~]# vi /etc/nginx/conf.d/default.conf
# -----在server段添加以下内容
# 自动在index.html的索引打开
autoindex on;
# 如果有文件则显示文件大小
autoindex_exact_size on; 
# 显示更改时间，以当前系统时间为准
autoindex_localtime on
```
具体位置在下面这个位置
![内网yum源搭建-1](https://s1.ax1x.com/2020/03/18/8wx7Ax.png)
启动nginx，使用`service nignx start `即可

## 创建自定义index.html文件
修改默认`index.html`为以下内容：
```html
<p style="font-weight:bolder;color:green;font-size:30px;">ALL of the packages in the below:</p>
<br/>
<a href="http://192.168.1.128/CentOS-YUM/Aliyun">Aliyun</a><br/>
These packagers from of CentOS ISO.<br/>
<a href="http://192.168.1.128/CentOS7-aliyun">CentOS</a><br/>
These packagers from of "Internet service provider".<br/>
<p style="font-weight:bolder;color:red;font-size:18px;">Please replace the file and fill in the following content:</p>
<p style="font-weight:bolder;color:blue;font-size:15px;">Way: /etc/yum.repos.d/CentOS-Base.repo</p>

```
在站点目录中创建`CentOS-YUM/Aliyun`（本地ISO文件仓库）和`CentOS7-aliyun`目录
## 添加并同步阿里云yum源
添加阿里云CentOS7 yum源
```bash
# 注意备份原仓库源
curl -o /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
```
同步阿里云CentOS7 yum源到之前创建好的目录当中，使用命令`reposync -p /usr/share/nginx/html/CentOS7-aliyun`
接着，使用`createrepo -p /usr/share/nginx/html/CentOS7-aliyun`来创建repodata文件
## 客户端配置
使用以下命令为客户端添加内网仓库地址
```bash
yum-config-manager --add-repo="http://192.168.1.128/CentOS7-aliyun/base/Packages"
yum makecache			# 更新缓存
```
## 在yum仓库服务器端创建定时任务
新建shell更新脚本`update-aliyun.sh`，内容如下：
```bash
#!/bin/bash
/usr/bin/reposync -np /usr/share/nginx/html/CentOS7-aliyun
```
使用`chmod +x update-aliyun.sh`为其添加执行权限
添加定时任务(每5min执行一次)
```bash
5 * * * * root run-parts  /root/update-aliyun.sh
```
**其中**`run-parts`的意思是执行后面目录中的脚本。
