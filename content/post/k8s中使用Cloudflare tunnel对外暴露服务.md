---
title: "K8s中使用Cloudflare Tunnel对外暴露服务"
date: 2025-01-07T15:36:55+08:00
lastmod: 2025-01-07T15:36:55+08:00
draft: false
description: ""
tags: ["k8s", "kubernetes", "Cloudflare"]
categories: ["k8s", "kubernetes", "Cloudflare"]
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

![How an HTTP request reaches a private application connected with Cloudflare Tunnel](https://cdn.agou-ops.cn/blog-images/handshake.eh3a-Ml1_ZvgY0m.webp)

> Cloudflared 在您的资源和 Cloudflare 的全球网络之间建立出站连接（隧道）。隧道是将流量路由到 DNS 记录的持久对象。在同一个隧道中，您可以根据需要运行任意数量的“cloudflared”进程（连接器）。这些进程将建立与 Cloudflare 的连接并将流量发送到最近的 Cloudflare 数据中心。    -- 官方介绍（翻译）

<!--more-->

## 预先准备

- Cloudflare账号，通过邮箱直接注册即可，[点击注册链接](https://dash.cloudflare.com/sign-up)
- k8s集群，可以使用`kind`，`minikube`，`k3s`等工具进行快速创建；
- 一个可用的域名，需要托管到`Cloudflare`平台，免费域名可以去`cloudns`或者`us.kg`注册，相关注册视频教程可以参考YouTube；

## 快速开始

### Cloudflare中创建token

![CleanShot 2025-01-07 at 16.41.28@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202025-01-07%20at%2016.41.28%402x.png)

依次点击`管理账户`--> `账户API权限` --> `建立token`，点开之后选择最下面的`自定义token`

![CleanShot 2025-01-07 at 16.44.25@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202025-01-07%20at%2016.44.25%402x.png)

添加以上权限：`Zone:Zone:Read`, `Zone:DNS:Edit`, 和 `Account:Cloudflare Tunnel:Edit`，保存后会给出一个`token`，复制该token，后面安装时会用到.

> 给出的API测试示例如下：
>
> ```bash
> curl -X GET "https://api.cloudflare.com/client/v4/accounts/4005a043825c260305904a1c11eexxxx/tokens/verify" \
>      -H "Authorization: Bearer oM9Dp-NCZFzFr5wrw4yUXgzBTCrqYWi99jWxxxxx" \
>      -H "Content-Type:application/json"
> ```
>
> 注意上面account后面的一串字母数字为账户ID，后面也会用到.

### 部署cloudflare-tunnel ingress

添加helm仓库：

```bash
helm repo add strrl.dev https://helm.strrl.dev
helm repo update
```

使用helm安装ingress：

```bash
helm upgrade --install --wait \
  -n cloudflare-tunnel-ingress-controller --create-namespace \
  cloudflare-tunnel-ingress-controller \
  strrl.dev/cloudflare-tunnel-ingress-controller \
  --set=cloudflare.apiToken="<cloudflare-api-token>",cloudflare.accountId="<cloudflare-account-id>",cloudflare.tunnelName="<your-favorite-tunnel-name>" 
```

将之前cloudflare中生成的`token`和`acouunt id`分别替换上面的`<cloudflare-api-token>`和`<cloudflare-account-id>`，`<your-favorite-tunnel-name>`为自定义tunnel名称，该tunnel会自动创建，示例名称`ingress-tunnel`。

等待helm安装完之后，使用以下命令可以检查是否已经安装成功：

```bash
> kubectl get po -n cloudflare-tunnel-ingress-controller
NAME                                                    READY   STATUS    RESTARTS   AGE
cloudflare-tunnel-ingress-controller-5d4bc84957-jzl8h   1/1     Running   0          148m

> kubectl get ingressclass
NAME                CONTROLLER                                       PARAMETERS   AGE
cloudflare-tunnel   strrl.dev/cloudflare-tunnel-ingress-controller   <none>       147m
nginx               k8s.io/ingress-nginx                             <none>       15d
```

### 创建ingress对外暴露服务

```bash
> kubectl -n prometheus-stack \
  create ingress grafana-via-cf-tunnel \
  --rule="grafana.xxxx.us.kg/*=prometheus-stack-grafana:80"\
  --class cloudflare-tunnel
```

其中，`grafana.xxxx.us.kg`为你的二级域名，`prometheus-stack-grafana:80`分别是服务名称和端口。

创建完成之后，通过查看ingress，可以获取其状态：

```bash
❯ kubectl get ingress -n prometheus-stack
NAME                       CLASS               HOSTS                   ADDRESS                                                 PORTS   AGE
grafana-via-cf-tunnel      cloudflare-tunnel   grafana.xxxx.us.kg   b0d72de6-a176-41fc-bdaa-03e8d60e57f7.cfargotunnel.com   80      90m
```

此时通过浏览器打开[https://grafana.xxxx.us.kg ](https://grafana.xxxx.us.kg )即可直接访问你的服务。

> 观察`cloudflare-tunnel-ingress-controller`命名空间中的资源发现，自动创建了一个对应的deploy：
>
> ```bash
> > kubectl get deploy -n cloudflare-tunnel-ingress-controller
> NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
> cloudflare-tunnel-ingress-controller   1/1     1            1           153m
> controlled-cloudflared-connector       1/1     1            1           152m
> ```
>
> cloudflare中的tunnel自动创建出来了，而且新增了一条CNAME的DNS记录.

## 参考链接

- [Cloudflare Tunnel  Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [cloudflare-tunnel-ingress-controller](https://github.com/STRRL/cloudflare-tunnel-ingress-controller)
