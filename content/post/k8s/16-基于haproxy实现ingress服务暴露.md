---
title: "16 基于haproxy实现ingress服务暴露"
date: 2019-08-04T10:36:48+08:00
lastmod: 2019-08-04T10:36:48+08:00
draft: false
description: ""
tags: ['kubernetes', 'tutorial']
categories: ['转载', 'kubernetes', '基础教程']
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





# 写在前面

前面文章介绍了基于nginx实现ingress controller的功能，本章节接续介绍kubernetes系列教程中另外一个姐妹开源负载均衡的控制器：haproxy ingress controller。

# 1. HAproxy Ingress控制器

## 1.1 HAproxy Ingress简介

> HAProxy Ingress watches in the k8s cluster and how it builds HAProxy configuration

和Nginx相类似，HAproxy通过监视kubernetes api获取到service后端pod的状态，动态更新haproxy配置文件，以实现七层的[负载均衡。](https://cloud.tencent.com/document/product/214?from=10680)

![HAproxy Ingress简介](http://agou-ops-file.oss-cn-shanghai.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B8%83)%E5%9F%BA%E4%BA%8Ehaproxy%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/1%20-%201620.jpg)

HAproxy Ingress控制器具备的特性如下：

- Fast，Carefully built on top of the battle-tested HAProxy load balancer. 基于haproxy性能有保障
- Reliable，Trusted by sysadmins on clusters as big as 1,000 namespaces, 2,000 domains and 3,000 ingress objects. 可靠，支持1000最多1000个命名空间和2000多个域名
- Highly customizable，100+ configuration options and growing. 可定制化强，支持100多个配置选项

HAproxy ingress控制器版本

- 社区版，基于haproxy社区高度定制符合ingress的控制器，功能相对有限
- 企业版，haproxy企业版本，支持很多高级特性和功能，大部分高级功能在企业版本中实现

## 1.2 HAproxy控制器安装

haproxy ingress安装相对简单，官方提供了安装的yaml文件，先将文件下载查看一下kubernetes资源配置，包含的资源类型有：

- ServiceAccount    和RBAC认证授权关联
- RBAC认证            Role、ClusterRole、 ClusterRoleBinding
- Deployment          默认包含的一个后端backend应用服务器，与之关联一个Service
- Service                 后端的一个service
- DaemonSet          HAproxy最核心的一个控制器，关联认证ServiceAccount和配置ConfigMap，定义了一个nodeSelector，label为role: ingress-controller，将运行在特定的节点上
- ConfigMap            实现haproxy ingress自定义配置

安装文件路径https://haproxy-ingress.github.io/resources/haproxy-ingress.yaml

1、创建命名空间，haproxy ingress部署在ingress-controller这个命名空间，先创建ns

```js
[root@node-1 ~]# kubectl create namespace ingress-controller
namespace/ingress-controller created

[root@node-1 ~]# kubectl get namespaces ingress-controller -o yaml
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: "2019-12-27T09:56:04Z"
  name: ingress-controller
  resourceVersion: "13946553"
  selfLink: /api/v1/namespaces/ingress-controller
  uid: ea70b2f7-efe4-43fd-8ce9-3b917b09b533
spec:
  finalizers:
  - kubernetes
status:
  phase: Active
```

2、安装haproxy ingress控制器

```js
[root@node-1 ~]# wget  https://haproxy-ingress.github.io/resources/haproxy-ingress.yaml
[root@node-1 ~]# kubectl apply -f haproxy-ingress.yaml 
serviceaccount/ingress-controller created
clusterrole.rbac.authorization.k8s.io/ingress-controller created
role.rbac.authorization.k8s.io/ingress-controller created
clusterrolebinding.rbac.authorization.k8s.io/ingress-controller created
rolebinding.rbac.authorization.k8s.io/ingress-controller created
deployment.apps/ingress-default-backend created
service/ingress-default-backend created
configmap/haproxy-ingress created
daemonset.apps/haproxy-ingress created
```

3、 检查haproxy ingress安装情况，检查haproxy ingress核心的DaemonSets，发现DS并未部署Pod，原因是配置文件中定义了nodeSelector节点标签选择器，因此需要给node设置合理的标签

```js
[root@node-1 ~]# kubectl get daemonsets -n ingress-controller 
NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR             AGE
haproxy-ingress   0         0         0       0            0           role=ingress-controller   5m51s
```

4、 给node设置标签，让DaemonSets管理的Pod能调度到node节点上，生产环境中根据情况定义，将实现haproxy ingress功能的节点定义到特定的节点，对个node节点的访问，需要借助于负载均衡实现统一接入，本文主要以探究haproxy ingress功能，因此未部署负载均衡调度器，读者可根据实际的情况部署。以node-1和node-2为例：

```js
[root@node-1 ~]# kubectl label node node-1 role=ingress-controller
node/node-1 labeled
[root@node-1 ~]# kubectl label node node-2 role=ingress-controller
node/node-2 labeled

#查看labels的情况
[root@node-1 ~]# kubectl get nodes --show-labels 
NAME     STATUS   ROLES    AGE    VERSION   LABELS
node-1   Ready    master   104d   v1.15.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-1,kubernetes.io/os=linux,node-role.kubernetes.io/master=,role=ingress-controller
node-2   Ready    <none>   104d   v1.15.3   app=web,beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-2,kubernetes.io/os=linux,label=test,role=ingress-controller
node-3   Ready    <none>   104d   v1.15.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-3,kubernetes.io/os=linux
```

5、再次查看ingress部署情况，已完成部署，并调度至node-1和node-2节点上

```js
[root@node-1 ~]# kubectl get daemonsets -n ingress-controller 
NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR             AGE
haproxy-ingress   2         2         2       2            2           role=ingress-controller   15m

[root@node-1 ~]# kubectl get pods -n ingress-controller -o wide 
NAME                                       READY   STATUS    RESTARTS   AGE     IP               NODE     NOMINATED NODE   READINESS GATES
haproxy-ingress-bdns8                      1/1     Running   0          2m27s   10.254.100.102   node-2   <none>           <none>
haproxy-ingress-d5rnl                      1/1     Running   0          2m31s   10.254.100.101   node-1   <none>           <none>
```

haproxy ingress部署时候也通过deployments部署了一个后端backend服务，这是部署haproxy ingress必须部署服务，否则ingress controller无法启动，可以通过查看Deployments列表确认

```js
[root@node-1 ~]# kubectl get deployments -n ingress-controller 
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
ingress-default-backend   1/1     1            1           18m
```

6、 查看haproxy ingress的日志，通过查询日志可知，多个haproxy ingress是通过选举实现高可用HA机制。

![haprox ingress日志](http://agou-ops-file.oss-cn-shanghai.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B8%83)%E5%9F%BA%E4%BA%8Ehaproxy%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/2%20-%201620.jpg)

其他资源包括ServiceAccount，ClusterRole，ConfigMaps请单独确认，至此HAproxy ingress controller部署完毕。另外两种部署方式：

- [Deployment部署方式](https://github.com/jcmoraisjr/haproxy-ingress/tree/master/examples/deployment)
- [Helm部署方式](https://github.com/helm/charts/tree/master/incubator/haproxy-ingress)

# 2. haproxy ingress使用

## 2.1 haproxy ingress基础

Ingress控制器部署完毕后需要定义Ingress规则，以方便Ingress控制器能够识别到service后端Pod的资源，这个章节我们将来介绍在HAproxy Ingress Controller环境下Ingress的使用。 

1、环境准备，创建一个deployments并暴露其端口

```js
#创建应用并暴露端口
[root@node-1 haproxy-ingress]# kubectl run haproxy-ingress-demo --image=nginx:1.7.9 --port=80 --replicas=1 --expose
kubectl run --generator=deployment/apps.v1 is DEPRECATED and will be removed in a future version. Use kubectl run --generator=run-pod/v1 or kubectl create instead.
service/haproxy-ingress-demo created
deployment.apps/haproxy-ingress-demo created

#查看应用
[root@node-1 haproxy-ingress]# kubectl get deployments haproxy-ingress-demo 
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
haproxy-ingress-demo   1/1     1            1           10s

#查看service情况
[root@node-1 haproxy-ingress]# kubectl get services haproxy-ingress-demo 
NAME                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
haproxy-ingress-demo   ClusterIP   10.106.199.102   <none>        80/TCP    17s
```

2、创建ingress规则,如果有多个ingress控制器，可以通过ingress.class指定类型为haproxy

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: haproxy-ingress-demo 
  labels:
    ingresscontroller: haproxy 
  annotations:
    kubernetes.io/ingress.class: haproxy 
spec:
  rules:
  - host: www.happylau.cn 
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-ingress-demo 
          servicePort: 80
```

3、应用ingress规则，并查看ingress详情，查看Events日志发现控制器已正常更新

```js
[root@node-1 haproxy-ingress]# kubectl apply -f ingress-demo.yaml 
ingress.extensions/haproxy-ingress-demo created

#查看详情
[root@node-1 haproxy-ingress]# kubectl describe ingresses haproxy-ingress-demo 
Name:             haproxy-ingress-demo
Namespace:        default
Address:          
Default backend:  default-http-backend:80 (<none>)
Rules:
  Host             Path  Backends
  ----             ----  --------
  www.happylau.cn  
                   /   haproxy-ingress-demo:80 (10.244.2.166:80)
Annotations:
  kubectl.kubernetes.io/last-applied-configuration:  {"apiVersion":"extensions/v1beta1","kind":"Ingress","metadata":{"annotations":{"kubernetes.io/ingress.class":"haproxy"},"labels":{"ingresscontroller":"haproxy"},"name":"haproxy-ingress-demo","namespace":"default"},"spec":{"rules":[{"host":"www.happylau.cn","http":{"paths":[{"backend":{"serviceName":"haproxy-ingress-demo","servicePort":80},"path":"/"}]}}]}}

  kubernetes.io/ingress.class:  haproxy
Events:
  Type    Reason  Age   From                Message
  ----    ------  ----  ----                -------
  Normal  CREATE  27s   ingress-controller  Ingress default/haproxy-ingress-demo
  Normal  CREATE  27s   ingress-controller  Ingress default/haproxy-ingress-demo
  Normal  UPDATE  20s   ingress-controller  Ingress default/haproxy-ingress-demo
  Normal  UPDATE  20s   ingress-controller  Ingress default/haproxy-ingress-demo
```

4、测试验证ingress规则，可以将域名写入到hosts文件中，我们直接使用gcurl测试，地址指向node-1或node-2均可

```js
[root@node-1 haproxy-ingress]# curl  http://www.happylau.cn --resolve www.happylau.cn:80:10.254.100.101
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

5、测试正常，接下来到haproxy ingress controller中刚查看对应生成规则配置文件

```js
[root@node-1 ~]# kubectl exec -it haproxy-ingress-bdns8 -n ingress-controller /bin/sh

#查看配置文件
/etc/haproxy # cat /etc/haproxy/haproxy.cfg 
  # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# #
# #   HAProxy Ingress Controller
# #   --------------------------
# #   This file is automatically updated, do not edit
# #
# 全局配置文件内容
global
    daemon
    nbthread 2
    cpu-map auto:1/1-2 0-1
    stats socket /var/run/haproxy-stats.sock level admin expose-fd listeners
    maxconn 2000
    hard-stop-after 10m
    lua-load /usr/local/etc/haproxy/lua/send-response.lua
    lua-load /usr/local/etc/haproxy/lua/auth-request.lua
    tune.ssl.default-dh-param 2048
    ssl-default-bind-ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK
    ssl-default-bind-options no-sslv3 no-tls-tickets

#默认配置内容
defaults
    log global
    maxconn 2000
    option redispatch
    option dontlognull
    option http-server-close
    option http-keep-alive
    timeout client          50s
    timeout client-fin      50s
    timeout connect         5s
    timeout http-keep-alive 1m
    timeout http-request    5s
    timeout queue           5s
    timeout server          50s
    timeout server-fin      50s
    timeout tunnel          1h

#后端服务器，即通过service服务发现机制，和后端的Pod关联
backend default_haproxy-ingress-demo_80
    mode http
    balance roundrobin
    acl https-request ssl_fc
    http-request set-header X-Original-Forwarded-For %[hdr(x-forwarded-for)] if { hdr(x-forwarded-for) -m found }
    http-request del-header x-forwarded-for
    option forwardfor
    http-response set-header Strict-Transport-Security "max-age=15768000"
    server srv001 10.244.2.166:80 weight 1 check inter 2s   #后端Pod的地址
    server srv002 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv003 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv004 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv005 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv006 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv007 127.0.0.1:1023 disabled weight 1 check inter 2s

#默认安装时创建的backend服务 ，初始安装时需要使用到
backend _default_backend
    mode http
    balance roundrobin
    http-request set-header X-Original-Forwarded-For %[hdr(x-forwarded-for)] if { hdr(x-forwarded-for) -m found }
    http-request del-header x-forwarded-for
    option forwardfor
    server srv001 10.244.2.165:8080 weight 1 check inter 2s
    server srv002 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv003 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv004 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv005 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv006 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv007 127.0.0.1:1023 disabled weight 1 check inter 2s

backend _error413
    mode http
    errorfile 400 /usr/local/etc/haproxy/errors/413.http
    http-request deny deny_status 400
backend _error495
    mode http
    errorfile 400 /usr/local/etc/haproxy/errors/495.http
    http-request deny deny_status 400
backend _error496
    mode http
    errorfile 400 /usr/local/etc/haproxy/errors/496.http
    http-request deny deny_status 400

#前端监听的80端口转发规则，并配置有https跳转，对应的主机配置在/etc/haproxy/maps/_global_http_front.map文件中定义
frontend _front_http
    mode http
    bind *:80
    http-request set-var(req.base) base,lower,regsub(:[0-9]+/,/)
    http-request redirect scheme https if { var(req.base),map_beg(/etc/haproxy/maps/_global_https_redir.map,_nomatch) yes }
    http-request set-header X-Forwarded-Proto http
    http-request del-header X-SSL-Client-CN
    http-request del-header X-SSL-Client-DN
    http-request del-header X-SSL-Client-SHA1
    http-request del-header X-SSL-Client-Cert
    http-request set-var(req.backend) var(req.base),map_beg(/etc/haproxy/maps/_global_http_front.map,_nomatch)
    use_backend %[var(req.backend)] unless { var(req.backend) _nomatch }
    default_backend _default_backend

#前端监听的443转发规则，对应域名在/etc/haproxy/maps/ _front001_host.map文件中
frontend _front001
    mode http
    bind *:443 ssl alpn h2,http/1.1 crt /ingress-controller/ssl/default-fake-certificate.pem
    http-request set-var(req.hostbackend) base,lower,regsub(:[0-9]+/,/),map_beg(/etc/haproxy/maps/_front001_host.map,_nomatch)
    http-request set-header X-Forwarded-Proto https
    http-request del-header X-SSL-Client-CN
    http-request del-header X-SSL-Client-DN
    http-request del-header X-SSL-Client-SHA1
    http-request del-header X-SSL-Client-Cert
    use_backend %[var(req.hostbackend)] unless { var(req.hostbackend) _nomatch }
    default_backend _default_backend

#状态监听器
listen stats
    mode http
    bind *:1936
    stats enable
    stats uri /
    no log
    option forceclose
    stats show-legends

#监控健康检查
frontend healthz
    mode http
    bind *:10253
    monitor-uri /healthz
```

查看主机名隐射文件，包含有前端主机名和转发到后端backend的名称

```js
/etc/haproxy/maps # cat /etc/haproxy/maps/_global_http_front.map 
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# #
# #   HAProxy Ingress Controller
# #   --------------------------
# #   This file is automatically updated, do not edit
# #
#
www.happylau.cn/ default_haproxy-ingress-demo_80
```

通过上面的基础配置可以实现基于haproxy的七层负载均衡实现，haproxy ingress controller通过kubernetes api动态识别到service后端规则配置并更新至haproxy.cfg配置文件中，从而实现负载均衡功能实现。

## 2.2 动态更新和负载均衡

后端Pod是实时动态变化的，haproxy ingress通过service的服务发现机制，动态识别到后端Pod的变化情况，并动态更新haproxy.cfg配置文件，并重载配置（实际不需要重启haproxy服务），本章节将演示haproxy ingress动态更新和[负载均衡](https://cloud.tencent.com/document/product/214?from=10680)功能。

1、动态更新，我们以扩容pod的副本为例，将副本数从replicas=1扩容至3个

```js
[root@node-1 ~]# kubectl scale --replicas=3 deployment haproxy-ingress-demo 
deployment.extensions/haproxy-ingress-demo scaled
[root@node-1 ~]# kubectl get deployments haproxy-ingress-demo 
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
haproxy-ingress-demo   3/3     3            3           43m

#查看扩容后Pod的IP地址
[root@node-1 ~]# kubectl get pods -o wide
NAME                                   READY   STATUS    RESTARTS   AGE     IP             NODE     NOMINATED NODE   READINESS GATES
haproxy-ingress-demo-5d487d4fc-5pgjt   1/1     Running   0          43m     10.244.2.166   node-3   <none>           <none>
haproxy-ingress-demo-5d487d4fc-pst2q   1/1     Running   0          18s     10.244.0.52    node-1   <none>           <none>
haproxy-ingress-demo-5d487d4fc-sr8tm   1/1     Running   0          18s     10.244.1.149   node-2   <none>           <none>
```

2、查看haproxy配置文件内容,可以看到backend后端主机列表已动态发现新增的pod地址

```js
backend default_haproxy-ingress-demo_80
    mode http
    balance roundrobin
    acl https-request ssl_fc
    http-request set-header X-Original-Forwarded-For %[hdr(x-forwarded-for)] if { hdr(x-forwarded-for) -m found }
    http-request del-header x-forwarded-for
    option forwardfor
    http-response set-header Strict-Transport-Security "max-age=15768000"
    server srv001 10.244.2.166:80 weight 1 check inter 2s   #新增的pod地址
    server srv002 10.244.0.52:80 weight 1 check inter 2s
    server srv003 10.244.1.149:80 weight 1 check inter 2s
    server srv004 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv005 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv006 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv007 127.0.0.1:1023 disabled weight 1 check inter 2s
```

4、查看haproxy ingress日志，日志中提示HAProxy updated without needing to reload，即配置动态识别，不需要重启haproxy服务就能够识别，自从1.8后haproxy能支持动态配置更新的能力，以适应微服务的场景，详情查看[文章说明](https://www.haproxy.com/blog/truly-seamless-reloads-with-haproxy-no-more-hacks/)

```js
[root@node-1 ~]# kubectl logs haproxy-ingress-bdns8 -n ingress-controller -f
I1227 12:21:11.523066       6 controller.go:274] Starting HAProxy update id=20
I1227 12:21:11.561001       6 instance.go:162] HAProxy updated without needing to reload. Commands sent: 3
I1227 12:21:11.561057       6 controller.go:325] Finish HAProxy update id=20: ingress=0.149764ms writeTmpl=37.738947ms total=37.888711ms
```

5、接下来测试负载均衡的功能，为了验证测试效果，往pod中写入不同的内容，以测试负载均衡的效果

```js
[root@node-1 ~]# kubectl exec -it haproxy-ingress-demo-5d487d4fc-5pgjt /bin/bash
root@haproxy-ingress-demo-5d487d4fc-5pgjt:/# echo "web-1" > /usr/share/nginx/html/index.html

[root@node-1 ~]# kubectl exec -it haproxy-ingress-demo-5d487d4fc-pst2q /bin/bash
root@haproxy-ingress-demo-5d487d4fc-pst2q:/# echo "web-2" > /usr/share/nginx/html/index.html

[root@node-1 ~]# kubectl exec -it haproxy-ingress-demo-5d487d4fc-sr8tm /bin/bash
root@haproxy-ingress-demo-5d487d4fc-sr8tm:/# echo "web-3" > /usr/share/nginx/html/index.html
```

6、测试验证负载均衡效果,haproxy采用轮询的调度算法，因此可以明显看到轮询效果

```js
[root@node-1 ~]# curl  http://www.happylau.cn --resolve www.happylau.cn:80:10.254.100.102
web-1
[root@node-1 ~]# curl  http://www.happylau.cn --resolve www.happylau.cn:80:10.254.100.102
web-2
[root@node-1 ~]# curl  http://www.happylau.cn --resolve www.happylau.cn:80:10.254.100.102
web-3
```

这个章节验证了haproxy ingress控制器动态配置更新的能力，相比于nginx ingress控制器而言，haproxy ingress控制器不需要重载服务进程就能够动态识别到配置，在微服务场景下将具有非常大的优势；并通过一个实例验证了ingress负载均衡调度能力。

## 2.3 基于名称虚拟主机

这个小节将演示haproxy ingress基于虚拟云主机功能的实现，定义两个虚拟主机news.happylau.cn和sports.happylau.cn，将请求各自转发至haproxy-1和haproxy-2

1、 准备环境测试环境，创建两个应用haproxy-1和haproxy并暴露服务端口

```js
[root@node-1 ~]# kubectl run haproxy-1 --image=nginx:1.7.9 --port=80 --replicas=1 --expose=true
[root@node-1 ~]# kubectl run haproxy-2 --image=nginx:1.7.9 --port=80 --replicas=1 --expose=true

查看应用
[root@node-1 ~]# kubectl get deployments 
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
haproxy-1              1/1     1            1           39s
haproxy-2              1/1     1            1           36s

查看service
[root@node-1 ~]# kubectl get services 
NAME                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
haproxy-1              ClusterIP   10.100.239.114   <none>        80/TCP    55s
haproxy-2              ClusterIP   10.100.245.28    <none>        80/TCP    52s
```

3、定义ingress规则，定义不同的主机并将请求转发至不同的service中

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: haproxy-ingress-virtualhost
  annotations:
    kubernetes.io/ingress.class: haproxy 
spec:
  rules:
  - host: news.happylau.cn    
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-1
          servicePort: 80
  - host: sports.happylau.cn 
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-2
          servicePort: 80

#应用ingress规则并查看列表
[root@node-1 haproxy-ingress]# kubectl apply -f ingress-virtualhost.yaml 
ingress.extensions/haproxy-ingress-virtualhost created
[root@node-1 haproxy-ingress]# kubectl get ingresses haproxy-ingress-virtualhost 
NAME                          HOSTS                                 ADDRESS   PORTS   AGE
haproxy-ingress-virtualhost   news.happylau.cn,sports.happylau.cn             80      8s

查看ingress规则详情
[root@node-1 haproxy-ingress]# kubectl describe ingresses haproxy-ingress-virtualhost 
Name:             haproxy-ingress-virtualhost
Namespace:        default
Address:          
Default backend:  default-http-backend:80 (<none>)
Rules:
  Host                Path  Backends
  ----                ----  --------
  news.happylau.cn    
                      /   haproxy-1:80 (10.244.2.168:80)
  sports.happylau.cn  
                      /   haproxy-2:80 (10.244.2.169:80)
Annotations:
  kubectl.kubernetes.io/last-applied-configuration:  {"apiVersion":"extensions/v1beta1","kind":"Ingress","metadata":{"annotations":{"kubernetes.io/ingress.class":"haproxy"},"name":"haproxy-ingress-virtualhost","namespace":"default"},"spec":{"rules":[{"host":"news.happylau.cn","http":{"paths":[{"backend":{"serviceName":"haproxy-1","servicePort":80},"path":"/"}]}},{"host":"sports.happylau.cn","http":{"paths":[{"backend":{"serviceName":"haproxy-2","servicePort":80},"path":"/"}]}}]}}

  kubernetes.io/ingress.class:  haproxy
Events:
  Type    Reason  Age   From                Message
  ----    ------  ----  ----                -------
  Normal  CREATE  37s   ingress-controller  Ingress default/haproxy-ingress-virtualhost
  Normal  CREATE  37s   ingress-controller  Ingress default/haproxy-ingress-virtualhost
  Normal  UPDATE  20s   ingress-controller  Ingress default/haproxy-ingress-virtualhost
  Normal  UPDATE  20s   ingress-controller  Ingress default/haproxy-ingress-virtualhost
```

4、测试验证虚拟机主机配置，通过curl直接解析的方式，或者通过写hosts文件

![haproxy ingress虚拟主机验证](http://agou-ops-file.oss-cn-shanghai.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B8%83)%E5%9F%BA%E4%BA%8Ehaproxy%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/3%20-%201620.jpg)

5、查看配置配置文件内容，配置中更新了haproxy.cfg的front段和backend段的内容

```js
/etc/haproxy/haproxy.cfg 配置文件内容
backend default_haproxy-1_80    #haproxy-1后端
    mode http
    balance roundrobin
    acl https-request ssl_fc
    http-request set-header X-Original-Forwarded-For %[hdr(x-forwarded-for)] if { hdr(x-forwarded-for) -m found }
    http-request del-header x-forwarded-for
    option forwardfor
    http-response set-header Strict-Transport-Security "max-age=15768000"
    server srv001 10.244.2.168:80 weight 1 check inter 2s
    server srv002 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv003 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv004 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv005 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv006 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv007 127.0.0.1:1023 disabled weight 1 check inter 2s

#haproxy-2后端
backend default_haproxy-2_80
    mode http
    balance roundrobin
    acl https-request ssl_fc
    http-request set-header X-Original-Forwarded-For %[hdr(x-forwarded-for)] if { hdr(x-forwarded-for) -m found }
    http-request del-header x-forwarded-for
    option forwardfor
    http-response set-header Strict-Transport-Security "max-age=15768000"
    server srv001 10.244.2.169:80 weight 1 check inter 2s
    server srv002 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv003 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv004 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv005 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv006 127.0.0.1:1023 disabled weight 1 check inter 2s
    server srv007 127.0.0.1:1023 disabled weight 1 check inter 2s

配置关联内容
/ # cat /etc/haproxy/maps/_global_http_front.map 
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# #
# #   HAProxy Ingress Controller
# #   --------------------------
# #   This file is automatically updated, do not edit
# #
#
news.happylau.cn/ default_haproxy-1_80
sports.happylau.cn/ default_haproxy-2_80
```

## 2.4 URL自动跳转

haproxy ingress支持自动跳转的能力，需要通过annotations定义，通过ingress.kubernetes.io/ssl-redirect设置即可，默认为false，设置为true即可实现http往https跳转的能力，当然可以将配置写入到ConfigMap中实现默认跳转的能力，本文以编写annotations为例，实现访问http跳转https的能力。

1、定义ingress规则，设置ingress.kubernetes.io/ssl-redirect实现跳转功能

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: haproxy-ingress-virtualhost
  annotations:
    kubernetes.io/ingress.class: haproxy 
    ingress.kubernetes.io/ssl-redirect: true    #实现跳转功能
spec:
  rules:
  - host: news.happylau.cn
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-1
          servicePort: 80
  - host: sports.happylau.cn 
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-2
          servicePort: 80
```

按照上图测试了一下功能，未能实现跳转实现跳转的功能，开源版本中未能找到更多文档说明，企业版由于镜像需要认证授权下载，未能进一步做测试验证。

## 2.4 基于TLS加密

haproxy ingress默认集成了一个

1、生成自签名证书和私钥

```js
[root@node-1 haproxy-ingress]#  openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout tls.key -out tls.crt
Generating a 2048 bit RSA private key
...........+++
.......+++
writing new private key to 'tls.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:CN
State or Province Name (full name) []:GD
Locality Name (eg, city) [Default City]:ShenZhen
Organization Name (eg, company) [Default Company Ltd]:Tencent
Organizational Unit Name (eg, section) []:HappyLau
Common Name (eg, your name or your server's hostname) []:www.happylau.cn
Email Address []:573302346@qq.com
```

2、创建Secrets，关联证书和私钥

```js
[root@node-1 haproxy-ingress]# kubectl create secret tls haproxy-tls --cert=tls.crt --key=tls.key 
secret/haproxy-tls created

[root@node-1 haproxy-ingress]# kubectl describe secrets haproxy-tls 
Name:         haproxy-tls
Namespace:    default
Labels:       <none>
Annotations:  <none>

Type:  kubernetes.io/tls

Data
====
tls.crt:  1424 bytes
tls.key:  1704 bytes
```

3、编写ingress规则，通过tls关联Secrets

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: haproxy-ingress-virtualhost
  annotations:
    kubernetes.io/ingress.class: haproxy 
spec:
  tls:
  - hosts:
    - news.happylau.cn
    - sports.happylau.cn
    secretName: haproxy-tls
  rules:
  - host: news.happylau.cn
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-1
          servicePort: 80
  - host: sports.happylau.cn 
    http:
      paths:
      - path: /
        backend:
          serviceName: haproxy-2
          servicePort: 80
```

4、应用配置并查看详情,在TLS中可以看到TLS关联的证书

```js
[root@node-1 haproxy-ingress]# kubectl apply -f ingress-virtualhost.yaml 
ingress.extensions/haproxy-ingress-virtualhost configured

[root@node-1 haproxy-ingress]# kubectl describe ingresses haproxy-ingress-virtualhost 
Name:             haproxy-ingress-virtualhost
Namespace:        default
Address:          
Default backend:  default-http-backend:80 (<none>)
TLS:
  haproxy-tls terminates news.happylau.cn,sports.happylau.cn
Rules:
  Host                Path  Backends
  ----                ----  --------
  news.happylau.cn    
                      /   haproxy-1:80 (10.244.2.168:80)
  sports.happylau.cn  
                      /   haproxy-2:80 (10.244.2.169:80)
Annotations:
  kubectl.kubernetes.io/last-applied-configuration:  {"apiVersion":"extensions/v1beta1","kind":"Ingress","metadata":{"annotations":{"kubernetes.io/ingress.class":"haproxy"},"name":"haproxy-ingress-virtualhost","namespace":"default"},"spec":{"rules":[{"host":"news.happylau.cn","http":{"paths":[{"backend":{"serviceName":"haproxy-1","servicePort":80},"path":"/"}]}},{"host":"sports.happylau.cn","http":{"paths":[{"backend":{"serviceName":"haproxy-2","servicePort":80},"path":"/"}]}}],"tls":[{"hosts":["news.happylau.cn","sports.happylau.cn"],"secretName":"haproxy-tls"}]}}

  kubernetes.io/ingress.class:  haproxy
Events:
  Type    Reason  Age               From                Message
  ----    ------  ----              ----                -------
  Normal  CREATE  37m               ingress-controller  Ingress default/haproxy-ingress-virtualhost
  Normal  CREATE  37m               ingress-controller  Ingress default/haproxy-ingress-virtualhost
  Normal  UPDATE  7s (x2 over 37m)  ingress-controller  Ingress default/haproxy-ingress-virtualhost
  Normal  UPDATE  7s (x2 over 37m)  ingress-controller  Ingress default/haproxy-ingress-virtualhost
```

5、测试https站点访问，可以看到安全的https访问

![haproxy ingress https测试](http://agou-ops-file.oss-cn-shanghai.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B8%83)%E5%9F%BA%E4%BA%8Ehaproxy%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/4%20-%201620.jpg)

# 写在最后

haproxy实现ingress实际是通过配置更新haproxy.cfg配置，结合service的服务发现机制动态完成ingress接入，相比于nginx来说，haproxy不需要重载实现配置变更。在测试haproxy ingress过程中，有部分功能配置验证没有达到预期，更丰富的功能支持在haproxy ingress企业版中支持，社区版能支持蓝绿发布和WAF安全扫描功能，详情可以参考社区文档[haproxy蓝绿发布](https://haproxy-ingress.github.io/docs/examples/blue-green/)和[WAF安全支持](https://haproxy-ingress.github.io/docs/examples/modsecurity/)。

haproxy ingress控制器目前在社区活跃度一般，相比于nginx，traefik，istio还有一定的差距，实际环境中不建议使用社区版的haproxy ingress。

# **参考文档**

官方安装文档：https://haproxy-ingress.github.io/docs/getting-started/

haproxy ingress官方配置：https://www.haproxy.com/documentation/hapee/1-7r2/traffic-management/k8s-image-controller/

------

**当你的才华撑不起你的野心时，你就应该静下心来学习**

**返回**[**kubernetes系列教程目录**]()



**如果觉得文章对您有帮助，请订阅专栏，分享给有需要的朋友吧😊**

> 关于作者 刘海平（HappyLau ）云计算高级顾问 目前在腾讯云从事公有云相关工作，曾就职于酷狗，EasyStack，拥有多年公有云+私有云计算架构设计，运维，交付相关经验，参与了酷狗，南方电网，国泰君安等大型私有云平台建设，精通Linux，Kubernetes，OpenStack，Ceph等开源技术，在云计算领域具有丰富实战经验，拥有RHCA/OpenStack/Linux授课经验。

# 附录

```js
#RBAC认证账号，和角色关联
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ingress-controller
  namespace: ingress-controller
---
# 集群角色，访问资源对象和具体访问权限
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  name: ingress-controller
rules:
  - apiGroups:
      - ""
    resources:
      - configmaps
      - endpoints
      - nodes
      - pods
      - secrets
    verbs:
      - list
      - watch
  - apiGroups:
      - ""
    resources:
      - nodes
    verbs:
      - get
  - apiGroups:
      - ""
    resources:
      - services
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - "extensions"
    resources:
      - ingresses
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - ""
    resources:
      - events
    verbs:
      - create
      - patch
  - apiGroups:
      - "extensions"
    resources:
      - ingresses/status
    verbs:
      - update

---
#角色定义
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  name: ingress-controller
  namespace: ingress-controller
rules:
  - apiGroups:
      - ""
    resources:
      - configmaps
      - pods
      - secrets
      - namespaces
    verbs:
      - get
  - apiGroups:
      - ""
    resources:
      - configmaps
    verbs:
      - get
      - update
  - apiGroups:
      - ""
    resources:
      - configmaps
    verbs:
      - create
  - apiGroups:
      - ""
    resources:
      - endpoints
    verbs:
      - get
      - create
      - update

---
#集群角色绑定ServiceAccount和ClusterRole关联
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: ingress-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ingress-controller
subjects:
  - kind: ServiceAccount
    name: ingress-controller
    namespace: ingress-controller
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: ingress-controller

---
#角色绑定
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: RoleBinding
metadata:
  name: ingress-controller
  namespace: ingress-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ingress-controller
subjects:
  - kind: ServiceAccount
    name: ingress-controller
    namespace: ingress-controller
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: ingress-controller

---
#后端服务应用，haproxy ingress默认需要一个关联的应用
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: ingress-default-backend
  name: ingress-default-backend
  namespace: ingress-controller
spec:
  selector:
    matchLabels:
      run: ingress-default-backend
  template:
    metadata:
      labels:
        run: ingress-default-backend
    spec:
      containers:
      - name: ingress-default-backend
        image: gcr.io/google_containers/defaultbackend:1.0
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 10m
            memory: 20Mi

---
#后端应用的service定义
apiVersion: v1
kind: Service
metadata:
  name: ingress-default-backend
  namespace: ingress-controller
spec:
  ports:
  - port: 8080
  selector:
    run: ingress-default-backend

---
#haproxy ingress配置，实现自定义配置功能
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress
  namespace: ingress-controller

---
#haproxy ingress核心的DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    run: haproxy-ingress
  name: haproxy-ingress
  namespace: ingress-controller
spec:
  updateStrategy:
    type: RollingUpdate
  selector:
    matchLabels:
      run: haproxy-ingress
  template:
    metadata:
      labels:
        run: haproxy-ingress
    spec:
      hostNetwork: true         #网络模式为hostNetwork,即使用宿主机的网络
      nodeSelector:               #节点选择器，将调度至包含特定标签的节点
        role: ingress-controller
      serviceAccountName: ingress-controller    #实现RBAC认证授权
      containers:
      - name: haproxy-ingress
        image: quay.io/jcmoraisjr/haproxy-ingress
        args:
        - --default-backend-service=$(POD_NAMESPACE)/ingress-default-backend
        - --configmap=$(POD_NAMESPACE)/haproxy-ingress
        - --sort-backends
        ports:
        - name: http
          containerPort: 80
        - name: https
          containerPort: 443
        - name: stat
          containerPort: 1936
        livenessProbe:
          httpGet:
            path: /healthz
            port: 10253
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
```



> 『 转载 』该文章来源于网络，侵删。 

