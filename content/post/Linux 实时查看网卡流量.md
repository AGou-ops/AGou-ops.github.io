---
title: "Linux 实时查看网卡流量"
date: 2020-07-11T22:12:17+08:00
lastmod: 2020-07-11T22:12:17+08:00
draft: false
description: ""
tags: ["Linux", "工具", "网卡"]
categories: ["Linux", "Tools", "转载"]
keywords: []

author: "AGou-ops"

# weight:hu
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

##  nload工具

nload用于实时查看网卡流量，默认系统都没有安装，首先安装方式如下：


```bash
$ yum install -y epel-release
$ yum install -y nload
```

<!--more-->

使用也非常简单，如下：

```bash

$ nload
Device eth0 [192.168.0.110] (4/5):    
===================================================================================
Incoming:
            Curr: 5.21 kBit/s      # Incoming：进来的流量
            Avg: 4.09 kBit/s       # Outgoing：出去的流量
            Min: 1.59 kBit/s       # Curr：当前的流量值
            Max: 12.51 kBit/s      # Avg：平均值的流量值
            Ttl: 4.16 GByte        # Min：最小的流量值
Outgoing:                          # Max：最大的流量值
            Curr: 16.48 kBit/s     # Ttl：总的流量值
            Avg: 14.38 kBit/s
            Min: 6.73 kBit/s       
            Max: 28.39 kBit/s
```

## iftop工具

默认系统没有安装，需要安装，如下：


```bash
# 需要epel环境
$ yum install -y epel-release
$ yum install -y iftop
```

安装完成之后，输入iftop便可看到如下界面

![null](http://cdn.agou-ops.cn/blog-images/Others/iftop.png)

其中，相关参数解释如下：

1. 界面上面显示的是类似刻度尺的刻度范围，为显示流量图形的长条作标尺用的。

2. 中间的<= =>这两个左右箭头，表示的是流量的方向。

3. TX：发送流量

4. RX：接收流量5.TOTAL：总流量6.Cumm：运行iftop到目前时间的总流量

7. peak：流量峰值

8. **rates：分别表示过去 2s 10s 40s 的平均流量**

## sar命令

sar命令包含在`sysstat`工具包中，提供系统的众多统计数据。其在不同的系统上命令有些差异，某些系统提供的sar支持基于网络接口的数据统计，也可以查看设备上每秒收发包的个数和流量。

```bash
# DEV显示网络接口信息
# 命令后面1 2 意思是：每一秒钟取1次值，取2次
$ sar -n DEV  1 2
```

另外，-n参数很有用，他有6个不同的开关：`DEV | EDEV | NFS | NFSD | SOCK | ALL` ，其代表的含义如下：

- DEV显示网络接口信息。
- EDEV显示关于网络错误的统计数据。
- NFS统计活动的NFS客户端的信息。
- NFSD统计NFS服务器的信息
- SOCK显示套接字信息
- ALL显示所有5个开关


```bash
$ sar -n DEV 1 2       
Linux 3.10.0-514.26.2.el7.x86_64 (localhost)    08/31/2019      _x86_64_        (1 CPU)

09:52:28 AM     IFACE   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s
09:52:29 AM      eth0      2.02      1.01      0.13      0.16      0.00      0.00      0.00
09:52:29 AM        lo      0.00      0.00      0.00      0.00      0.00      0.00      0.00

09:52:29 AM     IFACE   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s
09:52:30 AM      eth0      1.02      1.02      0.07      0.23      0.00      0.00      0.00
09:52:30 AM        lo      0.00      0.00      0.00      0.00      0.00      0.00      0.00

Average:        IFACE   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s
Average:         eth0      1.52      1.02      0.10      0.19      0.00      0.00      0.00
Average:           lo      0.00      0.00      0.00      0.00      0.00      0.00      0.00
```

参数说明：

- IFACE：LAN接口
- rxpck/s：每秒钟接收的数据包
- txpck/s：每秒钟发送的数据包
- rxbyt/s：每秒钟接收的字节数
- txbyt/s：每秒钟发送的字节数
- rxcmp/s：每秒钟接收的压缩数据包
- txcmp/s：每秒钟发送的压缩数据包
- rxmcst/s：每秒钟接收的多播数据包
- rxerr/s：每秒钟接收的坏数据包
- txerr/s：每秒钟发送的坏数据包
- coll/s：每秒冲突数
- rxdrop/s：因为缓冲充满，每秒钟丢弃的已接收数据包数
- txdrop/s：因为缓冲充满，每秒钟丢弃的已发送数据包数
- txcarr/s：发送数据包时，每秒载波错误数
- rxfram/s：每秒接收数据包的帧对齐错误数
- rxfifo/s：接收的数据包每秒FIFO过速的错误数
- txfifo/s：发送的数据包每秒FIFO过速的错误数

这种方式简单，直观，推荐使用。

## cat /proc/net/dev

Linux 内核提供了一种通过 /proc 文件系统，在运行时访问内核内部数据结构、改变内核设置的机制。proc文件系统是一个伪文件系统，它只存在内存当中，而不占用外存空间。它以文件系统的方式为访问系统内核数据的操作提供接口。用户和应用程序可以通过proc得到系统的信息，并可以改变内核的某些参数。由于系统的信息，如进程，是动态改变的，所以用户或应用程序读取proc文件时，proc文件系统是动态从系统内核读出所需信息并提交的。/proc文件系统中包含了很多目录，其中/proc/net/dev 保存了网络适配器及统计信息。

```bash
[root@agou ~]\# cat /proc/net/dev
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
 ens32: 11196722   21042    0    0    0     0          0         0  4605085   14465    0    0    0     0       0          0
    lo: 1934784    7162    0    0    0     0          0         0  1934784    7162    0    0    0     0       0          0
```

```
 说明：
 最左边的表示接口的名字，Receive表示收包，Transmit表示发送包；
  bytes表示收发的字节数；
  packets表示收发正确的包量；
  errs表示收发错误的包量；
  drop表示收发丢弃的包量；
```

其实，我们平时经常用的很多查看网卡实时流量的命令，都是通过读取该目录下的实时流量，并通过简单计算得到的。

## 实时监控脚本1

ifconfig可以查看的是从连上网开始的流量总和，cat /proc/net/dev记录的值也是总流量，那么可以计算一下，实时流量=当前流量-上一秒的流量。


```bash
[root@localhost ~]\# cat network.sh 
# 传入网卡参数
ethn=$1

while true
do
  RX_pre=$(cat /proc/net/dev | grep $ethn | sed 's/:/ /g' | awk '{print $2}')
  TX_pre=$(cat /proc/net/dev | grep $ethn | sed 's/:/ /g' | awk '{print $10}')
  sleep 1
  RX_next=$(cat /proc/net/dev | grep $ethn | sed 's/:/ /g' | awk '{print $2}')
  TX_next=$(cat /proc/net/dev | grep $ethn | sed 's/:/ /g' | awk '{print $10}')

  clear
  # echo -e激活转义符
  # 输出时间的标题
  echo -e "t RX `date +%k:%M:%S` TX"

  RX=$((${RX_next}-${RX_pre}))
  TX=$((${TX_next}-${TX_pre}))

  if [[ $RX -lt 1024 ]];then
    RX="${RX}B/s"
  elif [[ $RX -gt 1048576 ]];then
    RX=$(echo $RX | awk '{print $1/1048576 "MB/s"}')
  else
    RX=$(echo $RX | awk '{print $1/1024 "KB/s"}')
  fi

  if [[ $TX -lt 1024 ]];then
    TX="${TX}B/s"
  elif [[ $TX -gt 1048576 ]];then
    TX=$(echo $TX | awk '{print $1/1048576 "MB/s"}')
  else
    TX=$(echo $TX | awk '{print $1/1024 "KB/s"}')
  fi
  # 输出流量
  echo -e "$ethn t $RX   $TX "

done
```

执行结果如下：


```bash
[root@localhost ~]\# ./network.sh  eth0
         RX 20:23:38 TX
eth0     66B/s   0B/s 
         RX 20:23:39 TX
eth0     132B/s   0B/s 
         RX 20:23:40 TX
eth0     186B/s   194B/s 
         RX 20:23:41 TX
eth0     240B/s   194B/s 
         RX 20:23:42 TX
eth0     132B/s   0B/s 
         RX 20:23:43 TX
eth0     240B/s   194B/s 
         RX 20:23:44 TX
eth0     396B/s   4.19727KB/s 
         RX 20:23:45 TX
eth0     276B/s   178B/s
```

## 实时监控脚本2

```bash
$ cat network_flow.sh 

# 监控实时网卡流量
# $1 接收所传第一个参数 即要监控的网卡
NIC=$1
# echo -e "traffic in --- traffic out"
while true;do
        # $0 命令输出结果 ~ 匹配模式
        OLD_IN=`awk '$0~"'$NIC'"{print $2}' /proc/net/dev`
        OLD_OUT=`awk '$0~"'$NIC'"{print $10}' /proc/net/dev`
        sleep 1
        NEW_IN=`awk '$0~"'$NIC'"{print $2}' /proc/net/dev`
        NEW_OUT=`awk '$0~"'$NIC'"{print $10}' /proc/net/dev`
        clear
        # printf不换行 %s占位符
        IN=$(printf "%.1f%s" "$(($NEW_IN-$OLD_IN))" "B/s")
        OUT=$(printf "%.1f%s" "$(($NEW_OUT-$OLD_OUT))" "B/s")
        echo "       traffic in  `date +%k:%M:%S`  traffic out "
        echo "$NIC   $IN              $OUT"

done
```

执行结果如下：

```bash
$ ./network_flow.sh eth0
       traffic in  11:15:02  traffic out 
eth0   732.0B/s              948.0B/s
       traffic in  11:15:03  traffic out 
eth0   132.0B/s              0.0B/s
       traffic in  11:15:04  traffic out 
eth0   132.0B/s              0.0B/s
       traffic in  11:15:05  traffic out 
eth0   132.0B/s              0.0B/s
       traffic in  11:15:06  traffic out 
eth0   186.0B/s              242.0B/s
       traffic in  11:15:07  traffic out 
eth0   132.0B/s              0.0B/s
       traffic in  11:15:08  traffic out 
eth0   132.0B/s              0.0B/s
       traffic in  11:15:09  traffic out 
eth0   132.0B/s              0.0B/s
       traffic in  11:15:10  traffic out 
eth0   240.0B/s              242.0B/s
       traffic in  11:15:11  traffic out 
eth0   132.0B/s              0.0B/s
```



> 该文章内容收集于网络。

