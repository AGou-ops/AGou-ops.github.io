---
title: "K8s网络学习"
date: 2021-11-02T14:30:23+08:00
lastmod: 2021-11-02T14:30:23+08:00
draft: false
description: ""
tags: ["network", "kubernetes"]
categories: ["kubernetes"]
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

从简单`p2p`网络到k8s复杂型网络。

## 简单p2p网络模型

![image-20211102145031780](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20211102145031780.png)

:information_source:简单说明：创建两个网络命名空间`client`和`server`，然后创建一对虚拟网卡将两端的命名空间相连起来，就好像直接相连的网线一样，中间没有阻拦，创建完的虚拟网卡对存在于默认的命名空间中，接着我们将其分别放入`client`和`server`命名空间中，最后为两个虚拟网卡对`veth-client`和`veth-server`分配IP地址并启用网卡。

<!--more-->

```bash
# 步骤全流程
$ ip netns add client
$ ip netns add server
$ ip netns list
server
client
$ ip link add veth-client type veth peer name veth-server
$ ip link list | grep veth
4: veth-server@veth-client: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
5: veth-client@veth-server: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
$ ip link set veth-client netns client
$ ip link set veth-server netns server		# 将虚拟网卡移动至相应的命名空间去，此时默认的网络命名空间中将不复存在
$ ip netns exec client ip address add 10.0.0.11/24 dev veth-client
$ ip netns exec client ip link set veth-client up
$ ip netns exec server ip address add 10.0.0.12/24 dev veth-server
$ ip netns exec server ip link set veth-server up
$ ip netns exec client ip addr
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1		# 默认的lo暂时用不到，所以在此就不启用了
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
5: veth-client@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue `state UP` group default qlen 1000		# 可以看到网卡已被成功启用
    link/ether ca:e8:30:2e:f9:d2 brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet 10.0.0.11/24 scope global veth-client
       valid_lft forever preferred_lft forever
    inet6 fe80::c8e8:30ff:fe2e:f9d2/64 scope link
       valid_lft forever preferred_lft forever
# 同样，server网络命名空间，输出相似，略
$ ip netns exec server ip addr
。。。
# 互ping测试
$ ip netns exec client ping 10.0.0.12
$ ip netns exec server ping 10.0.0.11
```

## Docker网桥模型

![image-20211102145100986](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20211102145100986.png)

如果要创建更网络命名空间并互相连接，用 `veth` 对将这些网络命名空间进行两两连接就很麻烦了。可以创建创建一个 Linux 网桥来连接这些网络命名空间。Docker 就是这样为同一主机内的容器进行连接的。

```bash
# 步骤全流程
$ BR=bridge1
$ HOST_IP=192.168.0.116
$ ip link add client1-veth type veth peer name client1-veth-br			# 添加虚拟网卡与虚拟网桥对
$ ip link add server1-veth type veth peer name server1-veth-br
$ ip link add $BR type bridge			# 添加网桥
$ ip netns add client1
$ ip netns add server1
$ ip link set client1-veth netns client1
$ ip link set server1-veth netns server1
$ ip link set client1-veth-br master $BR
$ ip link set server1-veth-br master $BR
$ ip link set $BR up
$ ip link set client1-veth-br up
$ ip link set server1-veth-br up
$ ip netns exec client1 ip link set client1-veth up
$ ip netns exec server1 ip link set server1-veth up
$ ip netns exec client1 ip addr add 192.168.1.11/24 dev client1-veth
$ ip netns exec server1 ip addr add 192.168.1.12/24 dev server1-veth
$ ip addr add 192.168.1.1/24 dev $BR			# 为网桥分配ip地址
$ ip netns exec client1 ping 192.168.1.12 -c 5
$ ip netns exec client1 ping 192.168.1.1 -c 5
```

发现最后一条命令报错`connect: Network is unreachable`，原因路由不通，加入一条缺省路由即可：

```bash
$ ip netns exec client1 ip route add default via 192.168.1.1
$ ip netns exec server1 ip route add default via 192.168.1.1
```

> **外部服务器访问内部(Docker为例)：**
>
> Docker 创建的 `netns` 没有保存在缺省位置，所以 `ip netns list` 是看不到这个网络命名空间的。我们可以在缺省位置创建一个符号链接：
>
> ```bash
> $ container_id=web
> $ container_netns=$(docker inspect ${container_id} --format '{{ .NetworkSettings.SandboxKey }}')
> $ mkdir -p /var/run/netns
> $ rm -f /var/run/netns/${container_id}
> $ ln -sv ${container_netns} /var/run/netns/${container_id}
> '/var/run/netns/web' -> '/var/run/docker/netns/c009f2a4be71'
> $ ip netns list
> web (id: 3)
> server1 (id: 1)
> client1 (id: 0)
> ```
>
>
> 看看 `web` 命名空间的 IP 地址：
>
> ```bash
> $ ip netns exec web ip addr
> 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1
>     link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
>     inet 127.0.0.1/8 scope host lo
>        valid_lft forever preferred_lft forever
> 11: eth0@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
>     link/ether 02:42:ac:12:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
>     inet 172.18.0.3/24 brd 172.18.0.255 scope global eth0
>        valid_lft forever preferred_lft forever
> ```
>
> 然后看看容器里的 IP 地址：
>
> ```bash
> $ WEB_IP=`docker inspect -f "{{ .NetworkSettings.IPAddress }}" web`
> $ echo $WEB_IP
> 172.18.0.3
> ```
>
> 加入端口转发规则，其它主机就能访问这个 nginx 了：
>
> ```bash
> $ iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination $WEB_IP:80
> $ curl localhost:80
> ```

### 节点间网络传输

如下图所示：

![image-20211104090616265](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/simple-network-k8s.gif)

## k8s服务网络

技术类文章网上一搜一大片，这里我分享一个之前YouTube上看到的一个视频，简洁明了。

{{< video link="/subtitles/Kubernetes%20Services%20networking.mp4" subtitle="/subtitles/Kubernetes%20Services networking-English.vtt" time="0" text="ClusterIP" time1="107" text1="NodePort" time2="108" text2="ServiceIP with Calio" >}}

<video src="https://agou-resources.oss-cn-chengdu.aliyuncs.com/video/Kubernetes%20Services%20networking.mp4"></video>

<!-- {{< vidnosub link="/subtitles/Kubernetes%20Services%20networking.mp4"  time="0" text="ClusterIP" time1="107" text1="NodePort" time2="108" text2="ServiceIP with Calio" >}} -->


## 参考链接

- Life of a Packet in Kubernetes — Part 1: https://dramasamy.medium.com/life-of-a-packet-in-kubernetes-part-1-f9bc0909e051

- kubernetes services network YouTube: https://www.youtube.com/watch?v=NFApeJRXos4
