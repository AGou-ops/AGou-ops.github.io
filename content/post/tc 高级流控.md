---
title: "TC 高级流控"
date: 2020-12-16T15:30:58+08:00
lastmod: 2020-12-16T15:30:58+08:00
draft: false
description: "tc 高级流量控制"
tags: ["tc", "流控"]
categories: ["流控"]
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


## TC 简介及原理

tc 是 Linux 系统中的一个工具，全名为`traffic control`（流量控制）, 主要是通过在输出端口处建立一个队列来实现流量控制。tc 可以用来控制 netem 的工作模式，也就是说，想要使用 netem ，则需要内核开启了 netem，而且安装了 tc工具。

tc 控制的是发包动作，不能控制收包动作。它直接对物理接口生效，如果控制了物理的`eth0`，那么逻辑网卡（比如`eth0:1`）也会受到影响，反之则不行，**控制逻辑网卡是无效的**。

<!--more-->

![img](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/tc.png)

> 接收包从输入接口（`Input Interface`）进来后，经过流量限制（`Ingress Policing`）丢弃不符合规定的数据包，由输入多路分配器（`Input De-Multiplexing`）进行判断选择：如果接收包的目的是本主机，那么将该包送给上层处理；否则需要进行转发，将接收包交到转发块（`Forwarding Block`）处理。转发块同时也接收本主机上层（TCP、UDP等）产生的包。转发块通过查看路由表，决定所处理包的下一跳。然后，对包进行排列以便将它们传送到输出接口（`Output Interface`）。一般我们只能限制网卡发送的数据包，不能限制网卡接收的数据包，所以我们可以通过改变发送次序来控制传输速率。Linux流量控制主要是在输出接口排列时进行处理和实现的。

## TC 基础使用

- 模拟延迟传输：`tc qdisc add dev eth0 root netem delay 100ms`, 可以通过ping的方式验证是否增加效果成功

- 模拟延迟波动：`tc qdisc add dev eth0 root netem delay 100ms 10ms`
- 延迟波动随机性：`tc qdisc add dev eth0 root netem delay 100ms 10ms 30%`
- 模拟网络丢包：`tc qdisc add dev eth0 root netem loss 1%`
- 网络丢包成功率：`tc qdisc add dev eth0 root netem loss 1% 30%`
- 删除相关配置：`tc qdisc del dev eth0 root netem delay 100ms`
- 模拟包重复：`tc qdisc add dev eth0 root netem duplicate 1%`
- 模拟包损坏：`tc qdisc add dev eth0 root netem corrupt 0.2%`
- 查看网卡配置：`tc qdisc show dev eth0`
- 查看丢包率：`tc -s qdisc show dev eth0`

## 针对ip段下载速率控制

```bash
tc qdisc del dev eth0 root handle 1:       # 删除控制1:
tc qdisc add dev eth0 root handle 1: htb r2q 1         # 添加控制1:
tc class add dev eth0 parent 1: classid 1:1 htb rate 12mbit ceil 15mbit          # 设置速率
tc filter add dev eth0 parent 1: protocol ip prio 16 u32 match ip dst 10.10.10.1/24 flowid 1:1    # 指定ip段控制规则

# 检查命令
tc -s -d qdisc show dev eth0
tc class show dev eth0
tc filter show dev eth0为
```

## 限制上传下载


```bash
tc qdisc del dev tun0 root
tc qdisc add dev tun0 root handle 2:0 htb
tc class add dev tun0 parent 2:1 classid 2:10 htb rate 30kbps
tc class add dev tun0 parent 2:2 classid 2:11 htb rate 30kbps
tc qdisc add dev tun0 parent 2:10 handle 1: sfq perturb 1
tc filter add dev tun0 protocol ip parent 2:0 u32 match ip dst 10.18.0.0/24 flowid 2:10
tc filter add dev tun0 parent ffff: protocol ip u32 match ip src 10.18.0.0/24 police rate 30kbps burst 10k drop flowid 2:11

tc qdisc del dev tun0 root               # 删除原有策略
tc qdisc add dev tun0 root handle 2:0 htb               # 定义最顶层(根)队列规则，并指定 default 类别编号，为网络接口 eth1 绑定一个队列，类型为 htb，并指定了一个 handle 句柄 2:0 用于标识它下面的子类
tc class add dev tun0 parent 2:1 classid 2:10 htb rate 30kbps  # 设置一个规则速度是30kbps
tc class add dev tun0 parent 2:2 classid 2:11 htb rate 30kbps
tc qdisc add dev tun0 parent 2:10 handle 1: sfq perturb 1      # 调用随机公平算法
tc filter add dev tun0 protocol ip parent 2:0 u32 match ip dst 10.18.0.0/24 flowid 2:10  # 规则2:10应用在目标地址上，即下载
tc filter add dev tun0 parent ffff: protocol ip u32 match ip src 10.18.0.0/24 police rate 30kbps burst 10k drop flowid 2:11 # 上传限速
```

> 该文章内容收集于网络。