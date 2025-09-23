---
title: "Linux使用全局tun2socks代理"
date: 2025-09-23T13:39:52+08:00
lastmod: 2025-09-23T13:39:52+08:00
draft: false
description: ""
tags: []
categories: ["linux"]
keywords: ["linux","tun2socks"]

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

>  功能特性:
>
> - **通用代理 (Universal Proxying)**：透明地将任何应用程序的所有网络流量通过代理进行路由。
> - **多协议支持 (Multi-Protocol)**：支持 HTTP、SOCKS4、SOCKS5、Shadowsocks 代理，并可选身份验证。
> - **跨平台 (Cross-Platform)**：支持 Linux、macOS、Windows、FreeBSD、OpenBSD，并提供针对各平台的优化。
> - **网关模式 (Gateway Mode)**：可作为第 3 层网关，将同一网络上的其他设备流量进行路由。
> - **完整 IPv6 兼容 (Full IPv6 Compatibility)**：原生支持 IPv6，并可无缝隧道化 IPv4 over IPv6 或 IPv6 over IPv4。
> - **用户态网络 (User-Space Networking)**：利用 gVisor 网络栈提升性能与灵活性。
>
> 来源：https://github.com/xjasonlyu/tun2socks?tab=readme-ov-file#features

## 直接开始

从[tun2socks官方release仓库](https://github.com/xjasonlyu/tun2socks/releases)下载对应的二进制包，并放置于系统`PATH`目录下.

首先创建一条策略路由让SSH的流量默认走该路由，避免后面因为删除默认路由以及降低原默认路由的优先级导致远程SSH连接无法连接：

```bash
# 新建路由表,ens192为物理网卡的名称
echo "200 ens192-table" >> /etc/iproute2/rt_tables

# 给 ens192 表添加路由
ip route add 10.20.183.0/24 dev ens192 src 10.20.183.57 table ens192-table
ip route add default via 10.20.183.1 table ens192-table

# 添加规则，让本机 SSH 返回流量走 ens192
ip rule add from 10.20.183.57/32 table ens192-table
```

然后根据`tun2socks wiki`的[Examples](https://github.com/xjasonlyu/tun2socks/wiki/Examples)，创建一个`tun0`接口，让所有的流量都走这个默认接口：

```bash
# 创建tun0接口
ip tuntap add mode tun dev tun0
# 为tun0添加静态IP地址
ip addr add 198.18.0.1/15 dev tun0
# 启动tun0接口
ip link set dev tun0 up

# 删除默认路由
ip route del default
# 添加高优先级的默认路由，通过tun0接口
ip route add default via 198.18.0.1 dev tun0 metric 1
# 添加原先的默认路由
ip route add default via 10.20.183.1 dev ens192 metric 10
```


此时查看我们的路由，应该和下面类似：

```bash
# ip r s
default via 198.18.0.1 dev tun0 metric 1
default via 10.20.183.1 dev ens192 metric 10
10.20.183.0/24 dev ens192 proto kernel scope link src 10.20.183.57 metric 100
198.18.0.0/15 dev tun0 proto kernel scope link src 198.18.0.1
```

最后启动`tunsocks`：

```bash
# tun0为上面创建的接口，10.11.39.185:6153为socks5地址，ens192为物理网卡
tun2socks -device tun0 -proxy socks5://10.11.39.185:6153 -interface ens192
```

新开一个终端测试代理是否正常：

```bash
curl -I www.google.com
# 示例输出，返回200，说明正常.
HTTP/1.1 200 OK
Content-Type: text/html; charset=ISO-8859-1
Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-rgwzsliP0OcgVjMN_5GAKw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
P3P: CP="This is not a P3P policy! See g.co/p3phelp for more info."
Date: Tue, 23 Sep 2025 05:55:08 GMT
Server: gws
X-XSS-Protection: 0
X-Frame-Options: SAMEORIGIN
Expires: Tue, 23 Sep 2025 05:55:08 GMT
Cache-Control: private
Set-Cookie: AEC=AaJma5tvLap4pAQNF-WggAPrhDB5GdEv17uhhmXZmYyujhy6UVGBhGfyjfQ; expires=Sun, 22-Mar-2026 05:55:08 GMT; path=/; domain=.google.com; Secure; HttpOnly; SameSite=lax
Set-Cookie: NID=525=RE9KCXCVDuWOX-GdQRSmSIdXfC8GFo1U2p0fiYvHZL539-k15ipAO-hHRIIiLjmiKmHceWwX7FxXgJb9eRHCwOMn0cmkJSOfhyAlvVhtgOWQAD1I8xbt7EZ5dn93dnIAm5ncOPZVanNmhKf49fo4GSoj5gm7E4xtPQGwooiiJ1QsuLXHE6tJawOxbCTR6L6djj5uapBoYGpWblw; expires=Wed, 25-Mar-2026 05:55:08 GMT; path=/; domain=.google.com; HttpOnly
Transfer-Encoding: chunked
```

与此同时，另外一边，查看`tun2socks`的日志：

```bash
{"level":"info","ts":1758605660.5283048,"caller":"engine/engine.go:122","msg":"[DIALER] bind to interface: ens192"}
{"level":"info","ts":1758605660.5296154,"caller":"engine/engine.go:237","msg":"[STACK] tun://tun0 <-> socks5://10.11.39.185:6153"}
{"level":"info","ts":1758605889.22116,"caller":"tunnel/udp.go:47","msg":"[UDP] 198.18.0.1:44751 <-> 10.20.120.150:53"}
{"level":"info","ts":1758605889.244624,"caller":"tunnel/tcp.go:42","msg":"[TCP] 198.18.0.1:34968 <-> 142.250.199.196:80"}
{"level":"info","ts":1758606908.3542242,"caller":"tunnel/udp.go:47","msg":"[UDP] 198.18.0.1:45445 <-> 10.20.120.150:53"}
{"level":"info","ts":1758606908.4092991,"caller":"tunnel/tcp.go:42","msg":"[TCP] 198.18.0.1:60884 <-> 142.250.198.132:80"}
```
