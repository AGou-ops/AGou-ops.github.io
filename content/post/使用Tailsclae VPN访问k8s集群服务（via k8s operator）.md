---
title: 使用Tailsclae VPN访问k8s集群服务（via K8s Operator）
date: 2024-10-18T09:12:26+08:00
lastmod: 2024-10-18T09:12:26+08:00
draft: false
description: ""
tags: ["k8s","Tailscale"]
categories: ["k8s", "Tailscale", "VPN"]
keywords: 
author: AGou-ops
toc: true
autoCollapseToc: true
contentCopyright: <a href="http://www.wtfpl.net/about/" rel="noopener" target="_blank">WTFPL v2</a>
reward: true
mathjax: false
---
>[Tailscale Kubernetes operator](https://tailscale.com/kb/1236/kubernetes-operator)
>
> - 将 Kubernetes 集群中的[服务](https://kubernetes.io/docs/concepts/services-networking/service)公开到 Tailscale 网络（称为 tailnet）
> - 通过 API 服务器代理安全连接到[Kubernetes 控制平面 (kube-apiserver)](https://kubernetes.io/docs/concepts/overview/components/#kube-apiserver) ，无论是否进行身份验证
> - 从 Kubernetes 集群到Egress上的外部服务的出口

Kubernetes Operator 目前[处于测试阶段](https://tailscale.com/kb/1167/release-stages#beta)。

<!--more-->
## 预先准备
1. 添加tailnet策略，创建对应的标签：

```json
	"tagOwners": {
		"tag:k8s-operator": [],
		"tag:k8s":          ["tag:k8s-operator"],
	},
```

添加步骤如下所示，[点击直达](https://login.tailscale.com/admin/acls)：

![CleanShot 2024-10-18 at 11.02.11@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2011.02.11%402x.png)

2. 添加oauth客户端，[点击直达](https://login.tailscale.com/admin/settings/oauth)

![CleanShot 2024-10-18 at 11.17.47@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2011.17.47%402x.png)

勾选`devices`的读写权限，并添加上一个步骤添加的tag，点击生成oauth client secret，记住`Client ID`和`Client secret`，后面要用到.

## 使用helm安装operator

```bash
# 添加tailscale仓库
helm repo add tailscale https://pkgs.tailscale.com/helmcharts
# 更新本地helm缓存
helm repo update

# 安装operator
helm upgrade \
  --install \
  tailscale-operator \
  tailscale/tailscale-operator \
  --namespace=tailscale \
  --create-namespace \
  --set-string oauth.clientId=<OAauth client ID> \
  --set-string oauth.clientSecret=<OAuth client secret> \
  --set-string apiServerProxyConfig.mode="noauth" \
  --wait
```

⚠️注意替换上面的`<OAauth client ID>`和`<OAuth client secret> `

等个十几二十秒，查看operator的状态：

```bash
kubectl get po -n tailscale
# 示例输出，正常运行就是没问题
NAME                        READY   STATUS    RESTARTS   AGE
operator-5db569fdfc-xkqkh   1/1     Running   0          2m36s
```

这时候打开tailscale的页面，可以看到operator已经被成功加进来了，[点击直达](https://login.tailscale.com/admin/machines)：

![CleanShot 2024-10-18 at 11.20.52@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2011.20.52%402x.png)

## 使用示例

创建一个kuard测试pod：

```bash
kubectl run kuard -l app=kuard --image 163751/kuard:green
```

创建一个svc暴露端口到tailnet上：

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: kuard-tailscale-svc
  annotations:
    tailscale.com/expose: "true"
  labels:
    app: kuard
spec:
  ports:
    - port: 8080
      protocol: TCP
      name: kuard
  selector:
    app: kuard
  type: ClusterIP
EOF

# 或者通过ingress进行暴露
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kuard-ingress
spec:
  defaultBackend:
    service:
      name: kuard-tailscale-svc
      port:
        number: 8080
  ingressClassName: tailscale
EOF

# 获取ingress
kubectl get ingress
# 示例输出
NAME            CLASS       HOSTS   ADDRESS                                          PORTS   AGE
kuard-ingress   tailscale   *       default-kuard-ingress-ingress.tail2add5.ts.net   80      33s
# 此时直接通过后面的address即可访问服务。
```

关键点是上面的注解`tailscale.com/expose: "true"`，Tailscale operator会自动创建一个对应的`statefulset`和`service`，如下：

```bash
kubectl get all -n tailscale
# 示例输出

NAME                                 READY   STATUS    RESTARTS   AGE
pod/operator-5db569fdfc-xkqkh        1/1     Running   0          130m
pod/ts-kuard-tailscale-svc-b8f2m-0   1/1     Running   0          2m58s

NAME                                   TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/ts-kuard-tailscale-svc-b8f2m   ClusterIP   None         <none>        <none>    3m17s

NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/operator   1/1     1            1           135m

NAME                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/operator-5db569fdfc   1         1         1       135m

NAME                                            READY   AGE
statefulset.apps/ts-kuard-tailscale-svc-b8f2m   1/1     3m15s
```

接着打开tailscale的页面，可以看到新的服务已经被成功加进来了，[点击直达](https://login.tailscale.com/admin/machines)：

![CleanShot 2024-10-18 at 13.27.46@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2013.27.46%402x.png)

这时，通过其他任意一个客户端连接tailscale VPN即可访问该服务。

![CleanShot 2024-10-18 at 13.29.36@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2013.29.36%402x.png)

如果想要通过域名访问，可以通过设置MagicDNS来实现，具体设置在tailscale后台，`DNS --> 最下面的MagicDNS`启用即可，如果想要开启https，那么把下面的`HTTPS Certificates`也打开即可.

点开服务详情，可以看到完整的域名，如下：

![CleanShot 2024-10-18 at 13.40.12@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2013.40.12%402x.png)

此时打开这个分配的域名加8080端口就可以正常访问服务，域名命名规则为`命名空间-服务名-DNS Tailnet name`，如果你无法解析该域名，可能是DNS没有配置，需要配置DNS为`100.100.100.100`，具体以页面上的为准.

![CleanShot 2024-10-18 at 13.44.06@2x](https://cdn.agou-ops.cn/blog-images/CleanShot%202024-10-18%20at%2013.44.06%402x.png)

## 参考链接

- [Kubernetes operator · Tailscale Docs](https://tailscale.com/kb/1236/kubernetes-operator)