---
title: "08 Pod健康检查机制"
date: 2019-08-04T10:36:48+08:00
lastmod: 2019-08-04T10:36:48+08:00
draft: true
description: ""
tags: ['kubernetes']
categories: ['转载', 'kubernetes', '基础教程']
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




# 写在前面

上一篇文章中[kubernetes系列教程（七）深入玩转pod调度](#)介绍了kubernetes中Pod的调度机制，通过实战演练介绍Pod调度到node的几种方法：1. 通过nodeName固定选择调度，2. 通过nodeSelector定向选择调度，3. 通过node Affinity亲和力调度，接下来介绍[kubernetes系列教程](#)pod的健康检查机制。

# 1. 健康检查

## 1.1 健康检查概述

  应用在运行过程中难免会出现错误，如程序异常，软件异常，硬件故障，网络故障等，kubernetes提供Health Check健康检查机制，当发现应用异常时会自动重启容器，将应用从service服务中剔除，保障应用的高可用性。k8s定义了三种探针Probe：

- readiness probes   准备就绪检查，通过readiness是否准备接受流量，准备完毕加入到endpoint，否则剔除
- liveness probes      在线检查机制，检查应用是否可用，如死锁，无法响应，异常时会自动重启容器
- startup probes        启动检查机制，应用一些启动缓慢的业务，避免业务长时间启动而被前面的探针kill掉

每种探测机制支持三种健康检查方法，分别是命令行exec，httpGet和tcpSocket，其中exec通用性最强，适用与大部分场景，tcpSocket适用于TCP业务，httpGet适用于web业务。

- exec          提供命令或shell的检测，在容器中执行命令检查，返回码为0健康，非0异常
- httpGet      http协议探测，在容器中发送http请求，根据http返回码判断业务健康情况
- tcpSocket  tcp协议探测，向容器发送tcp建立连接，能建立则说明正常

每种探测方法能支持几个相同的检查参数，用于设置控制检查时间：

- initialDelaySeconds    初始第一次探测间隔，用于应用启动的时间，防止应用还没启动而健康检查失败
- periodSeconds            检查间隔，多久执行probe检查，默认为10s
- timeoutSeconds          检查超时时长，探测应用timeout后为失败
- successThreshold       成功探测阈值，表示探测多少次为健康正常，默认探测1次

## 1.2 exec命令行健康检查

  许多应用程序运行过程中无法检测到内部故障，如死锁，出现故障时通过重启业务可以恢复，kubernetes提供liveness在线健康检查机制，我们以exec为例，创建一个容器启动过程中创建一个文件/tmp/liveness-probe.log，10s后将其删除，定义liveness健康检查机制在容器中执行命令ls -l /tmp/liveness-probe.log，通过文件的返回码判断健康状态，如果返回码非0，暂停20s后kubelet会自动将该容器重启。

1. 定义一个容器，启动时创建一个文件，健康检查时ls -l /tmp/liveness-probe.log返回码为0，健康检查正常，10s后将其删除，返回码为非0，健康检查异常

```js
[root@node-1 demo]# cat centos-exec-liveness-probe.yaml
apiVersion: v1
kind: Pod
metadata:
  name: exec-liveness-probe
  annotations:
    kubernetes.io/description: "exec-liveness-probe"
spec:
  containers:
  - name: exec-liveness-probe
    image: centos:latest
    imagePullPolicy: IfNotPresent
    args:    #容器启动命令，生命周期为30s
    - /bin/sh
    - -c
    - touch /tmp/liveness-probe.log && sleep 10 && rm -f /tmp/liveness-probe.log && sleep 20
    livenessProbe:
      exec:  #健康检查机制，通过ls -l /tmp/liveness-probe.log返回码判断容器的健康状态
        command:
        - ls 
        - l 
        - /tmp/liveness-probe.log
      initialDelaySeconds: 1
      periodSeconds: 5
      timeoutSeconds: 1
```

1. 应用配置生成容器

```js
[root@node-1 demo]# kubectl apply -f centos-exec-liveness-probe.yaml 
pod/exec-liveness-probe created
```

1. 查看容器的event日志，容器启动后，10s以内容器状态正常，11s开始执行liveness健康检查，检查异常，触发容器重启

```js
[root@node-1 demo]# kubectl describe pods exec-liveness-probe | tail
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  28s                default-scheduler  Successfully assigned default/exec-liveness-probe to node-3
  Normal   Pulled     27s                kubelet, node-3    Container image "centos:latest" already present on machine
  Normal   Created    27s                kubelet, node-3    Created container exec-liveness-probe
  Normal   Started    27s                kubelet, node-3    Started container exec-liveness-probe
  #容器已启动
  Warning  Unhealthy  20s (x2 over 25s)  kubelet, node-3    Liveness probe failed: /tmp/liveness-probe.log
ls: cannot access l: No such file or directory #执行健康检查，检查异常
  Warning  Unhealthy  15s  kubelet, node-3  Liveness probe failed: ls: cannot access l: No such file or directory
ls: cannot access /tmp/liveness-probe.log: No such file or directory
  Normal  Killing  15s  kubelet, node-3  Container exec-liveness-probe failed liveness probe, will be restarted
  #重启容器
```

1. 查看容器重启次数，容器不停的执行，重启次数会响应增加，可以看到RESTARTS的次数在持续增加

```js
[root@node-1 demo]# kubectl get pods exec-liveness-probe 
NAME                  READY   STATUS    RESTARTS   AGE
exec-liveness-probe   1/1     Running   6          5m19s
```

## 1.3 httpGet健康检查

1. httpGet probe主要主要用于web场景，通过向容器发送http请求，根据返回码判断容器的健康状态，返回码小于4xx即表示健康，如下定义一个nginx应用，通过探测http://<container>:port/index.html的方式判断健康状态

```js
[root@node-1 demo]# cat nginx-httpGet-liveness-readiness.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-httpget-livess-readiness-probe 
  annotations:
    kubernetes.io/description: "nginx-httpGet-livess-readiness-probe"
spec:
  containers:
  - name: nginx-httpget-livess-readiness-probe
    image: nginx:latest
    ports:
    - name: http-80-port
      protocol: TCP
      containerPort: 80
    livenessProbe:   #健康检查机制，通过httpGet实现实现检查
      httpGet:
        port: 80
        scheme: HTTP
        path: /index.html
      initialDelaySeconds: 3
      periodSeconds: 10
      timeoutSeconds: 3
```

1. 生成pod并查看健康状态

```js
[root@node-1 demo]# kubectl apply -f nginx-httpGet-liveness-readiness.yaml 
pod/nginx-httpget-livess-readiness-probe created
[root@node-1 demo]# kubectl get pods nginx-httpget-livess-readiness-probe 
NAME                                   READY   STATUS    RESTARTS   AGE
nginx-httpget-livess-readiness-probe   1/1     Running   0          6s
```

1. 模拟故障，将pod中的path文件所属文件删除，此时发送http请求时会健康检查异常，会触发容器自动重启

```js
查询pod所属的节点
[root@node-1 demo]# kubectl get pods nginx-httpget-livess-readiness-probe -o wide 
NAME                                   READY   STATUS    RESTARTS   AGE    IP            NODE     NOMINATED NODE   READINESS GATES
nginx-httpget-livess-readiness-probe   1/1     Running   1          3m9s   10.244.2.19   node-3   <none>           <none>

登录到pod中将文件删除
[root@node-1 demo]# kubectl exec -it nginx-httpget-livess-readiness-probe /bin/bash
root@nginx-httpget-livess-readiness-probe:/# ls -l /usr/share/nginx/html/index.html 
-rw-r--r-- 1 root root 612 Sep 24 14:49 /usr/share/nginx/html/index.html
root@nginx-httpget-livess-readiness-probe:/# rm -f /usr/share/nginx/html/index.html 
```

1. 再次查看pod的列表，此时会RESTART的次数会增加1，表示重启重启过一次，AGE则多久前重启的时间

```js
[root@node-1 demo]# kubectl get pods nginx-httpget-livess-readiness-probe 
NAME                                   READY   STATUS    RESTARTS   AGE
nginx-httpget-livess-readiness-probe   1/1     Running   1          4m22s
```

1. 查看pod的详情，观察容器重启的情况，通过Liveness 检查容器出现404错误，触发重启。

```js
[root@node-1 demo]# kubectl describe pods nginx-httpget-livess-readiness-probe | tail
Events:
  Type     Reason     Age                    From               Message
  ----     ------     ----                   ----               -------
  Normal   Scheduled  5m45s                  default-scheduler  Successfully assigned default/nginx-httpget-livess-readiness-probe to node-3
  Normal   Pulling    3m29s (x2 over 5m45s)  kubelet, node-3    Pulling image "nginx:latest"
  Warning  Unhealthy  3m29s (x3 over 3m49s)  kubelet, node-3    Liveness probe failed: HTTP probe failed with statuscode: 404
  Normal   Killing    3m29s                  kubelet, node-3    Container nginx-httpget-livess-readiness-probe failed liveness probe, will be restarted
  Normal   Pulled     3m25s (x2 over 5m41s)  kubelet, node-3    Successfully pulled image "nginx:latest"
  Normal   Created    3m25s (x2 over 5m40s)  kubelet, node-3    Created container nginx-httpget-livess-readiness-probe
  Normal   Started    3m25s (x2 over 5m40s)  kubelet, node-3    Started container nginx-httpget-livess-readiness-probe
```

## 1.4 tcpSocket健康检查

1. tcpsocket健康检查适用于TCP业务，通过向指定容器建立一个tcp连接，可以建立连接则健康检查正常，否则健康检查异常，依旧以nignx为例使用tcp健康检查机制，探测80端口的连通性

```js
[root@node-1 demo]# cat nginx-tcp-liveness.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-tcp-liveness-probe
  annotations:
    kubernetes.io/description: "nginx-tcp-liveness-probe"
spec:
  containers:
  - name: nginx-tcp-liveness-probe 
    image: nginx:latest
    ports:
    - name: http-80-port
      protocol: TCP
      containerPort: 80
    livenessProbe:  #健康检查为tcpSocket，探测TCP 80端口
      tcpSocket:
       port: 80
      initialDelaySeconds: 3
      periodSeconds: 10
      timeoutSeconds: 3
```

1. 应用配置创建容器

```js
[root@node-1 demo]# kubectl apply -f nginx-tcp-liveness.yaml 
pod/nginx-tcp-liveness-probe created

[root@node-1 demo]# kubectl get pods nginx-tcp-liveness-probe 
NAME                       READY   STATUS    RESTARTS   AGE
nginx-tcp-liveness-probe   1/1     Running   0          6s
```

1. 模拟故障，获取pod所属节点，登录到pod中，安装查看进程工具htop

```js
获取pod所在node
[root@node-1 demo]# kubectl get pods nginx-tcp-liveness-probe -o wide 
NAME                       READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
nginx-tcp-liveness-probe   1/1     Running   0          99s   10.244.2.20   node-3   <none>           <none>

登录到pod中
[root@node-1 demo]# kubectl exec -it nginx-httpget-livess-readiness-probe /bin/bash

#执行apt-get update更新和apt-get install htop安装工具
root@nginx-httpget-livess-readiness-probe:/# apt-get update      
Get:1 http://cdn-fastly.deb.debian.org/debian buster InRelease [122 kB]             
Get:2 http://security-cdn.debian.org/debian-security buster/updates InRelease [39.1 kB]     
Get:3 http://cdn-fastly.deb.debian.org/debian buster-updates InRelease [49.3 kB]            
Get:4 http://security-cdn.debian.org/debian-security buster/updates/main amd64 Packages [95.7 kB]
Get:5 http://cdn-fastly.deb.debian.org/debian buster/main amd64 Packages [7899 kB]
Get:6 http://cdn-fastly.deb.debian.org/debian buster-updates/main amd64 Packages [5792 B]
Fetched 8210 kB in 3s (3094 kB/s)
Reading package lists... Done
root@nginx-httpget-livess-readiness-probe:/# apt-get install htop
Reading package lists... Done
Building dependency tree       
Reading state information... Done
Suggested packages:
  lsof strace
The following NEW packages will be installed:
  htop
0 upgraded, 1 newly installed, 0 to remove and 5 not upgraded.
Need to get 92.8 kB of archives.
After this operation, 230 kB of additional disk space will be used.
Get:1 http://cdn-fastly.deb.debian.org/debian buster/main amd64 htop amd64 2.2.0-1+b1 [92.8 kB]
Fetched 92.8 kB in 0s (221 kB/s)
debconf: delaying package configuration, since apt-utils is not installed
Selecting previously unselected package htop.
(Reading database ... 7203 files and directories currently installed.)
Preparing to unpack .../htop_2.2.0-1+b1_amd64.deb ...
Unpacking htop (2.2.0-1+b1) ...
Setting up htop (2.2.0-1+b1) ...
```

1. 运行htop查看进程，容器进程通常为1

![htop运行结果](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%85%AB%EF%BC%89Pod%E5%81%A5%E5%BA%B7%E6%A3%80%E6%9F%A5%E6%9C%BA%E5%88%B6/1%20-%201620.jpg)

1. kill掉进程观察容器状态，观察RESTART次数重启次数增加

```js
root@nginx-httpget-livess-readiness-probe:/# kill 1
root@nginx-httpget-livess-readiness-probe:/# command terminated with exit code 137

查看pod情况
[root@node-1 demo]# kubectl get pods nginx-tcp-liveness-probe 
NAME                       READY   STATUS    RESTARTS   AGE
nginx-tcp-liveness-probe   1/1     Running   1          13m
```

1. 查看容器详情，发现容器有重启的记录

```js
[root@node-1 demo]# kubectl describe pods nginx-tcp-liveness-probe | tail
Tolerations:     node.kubernetes.io/not-ready:NoExecute for 300s
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:
  Type    Reason     Age                From               Message
  ----    ------     ----               ----               -------
  Normal  Scheduled  14m                default-scheduler  Successfully assigned default/nginx-tcp-liveness-probe to node-3
  Normal  Pulling    44s (x2 over 14m)  kubelet, node-3    Pulling image "nginx:latest"
  Normal  Pulled     40s (x2 over 14m)  kubelet, node-3    Successfully pulled image "nginx:latest"
  Normal  Created    40s (x2 over 14m)  kubelet, node-3    Created container nginx-tcp-liveness-probe
  Normal  Started    40s (x2 over 14m)  kubelet, node-3    Started container nginx-tcp-liveness-probe
```

## 1.5 readiness健康就绪

  就绪检查用于应用接入到service的场景，用于判断应用是否已经就绪完毕，即是否可以接受外部转发的流量，健康检查正常则将pod加入到service的endpoints中，健康检查异常则从service的endpoints中删除，避免影响业务的访问。

1. 创建一个pod，使用httpGet的健康检查机制，定义readiness就绪检查探针检查路径/test.html

```js
[root@node-1 demo]# cat httpget-liveness-readiness-probe.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-tcp-liveness-probe
  annotations:
    kubernetes.io/description: "nginx-tcp-liveness-probe"
  labels:  #需要定义labels，后面定义的service需要调用
    app: nginx
spec:
  containers:
  - name: nginx-tcp-liveness-probe 
    image: nginx:latest
    ports:
    - name: http-80-port
      protocol: TCP
      containerPort: 80
    livenessProbe:  #存活检查探针
      httpGet:
        port: 80
        path: /index.html
        scheme: HTTP
      initialDelaySeconds: 3
      periodSeconds: 10
      timeoutSeconds: 3
    readinessProbe:  #就绪检查探针
      httpGet:
        port: 80
        path: /test.html
        scheme: HTTP
      initialDelaySeconds: 3
      periodSeconds: 10
      timeoutSeconds: 3
```

1. 定义一个service，将上述的pod加入到service中，注意使用上述定义的labels，app=nginx

```js
[root@node-1 demo]# cat nginx-service.yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: nginx
  name: nginx-service 
spec:
  ports:
  - name: http
    port: 80 
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx 
  type: ClusterIP
```

1. 生成配置

```js
[root@node-1 demo]# kubectl apply -f httpget-liveness-readiness-probe.yaml 
pod/nginx-tcp-liveness-probe created
[root@node-1 demo]# kubectl apply -f nginx-service.yaml 
service/nginx-service created
```

1. 此时pod状态正常，此时readiness健康检查异常

```js
[root@node-1 ~]# kubectl get pods nginx-httpget-livess-readiness-probe 
NAME                                   READY   STATUS    RESTARTS   AGE
nginx-httpget-livess-readiness-probe   1/1     Running   2          153m

#readiness健康检查异常，404报错（最后一行）
[root@node-1 demo]# kubectl describe pods nginx-tcp-liveness-probe | tail
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:
  Type     Reason     Age                 From               Message
  ----     ------     ----                ----               -------
  Normal   Scheduled  2m6s                default-scheduler  Successfully assigned default/nginx-tcp-liveness-probe to node-3
  Normal   Pulling    2m5s                kubelet, node-3    Pulling image "nginx:latest"
  Normal   Pulled     2m1s                kubelet, node-3    Successfully pulled image "nginx:latest"
  Normal   Created    2m1s                kubelet, node-3    Created container nginx-tcp-liveness-probe
  Normal   Started    2m1s                kubelet, node-3    Started container nginx-tcp-liveness-probe
  Warning  Unhealthy  2s (x12 over 112s)  kubelet, node-3    Readiness probe failed: HTTP probe failed with statuscode: 404
```

1. 查看services的endpoints，发现此时endpoints为空,因为readiness就绪检查异常，kubelet认为此时pod并未就绪，因此并未将其加入到endpoints中。

```js
[root@node-1 ~]# kubectl describe services nginx-service 
Name:              nginx-service
Namespace:         default
Labels:            app=nginx
Annotations:       kubectl.kubernetes.io/last-applied-configuration:
                     {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"labels":{"app":"nginx"},"name":"nginx-service","namespace":"default"},"s...
Selector:          app=nginx
Type:              ClusterIP
IP:                10.110.54.40
Port:              http  80/TCP
TargetPort:        80/TCP
Endpoints:         <none> #Endpoints对象为空
Session Affinity:  None
Events:            <none>

#endpoints状态
[root@node-1 demo]# kubectl describe endpoints nginx-service 
Name:         nginx-service
Namespace:    default
Labels:       app=nginx
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2019-09-30T14:27:37Z
Subsets:
  Addresses:          <none>
  NotReadyAddresses:  10.244.2.22  #pod处于NotReady状态
  Ports:
    Name  Port  Protocol
    ----  ----  --------
    http  80    TCP

Events:  <none>
```

1. 进入到pod中手动创建网站文件，使readiness健康检查正常

```js
[root@node-1 ~]# kubectl exec -it nginx-httpget-livess-readiness-probe /bin/bash
root@nginx-httpget-livess-readiness-probe:/# echo "readiness probe demo" >/usr/share/nginx/html/test.html
```

1. 此时readiness健康检查正常，kubelet检测到pod就绪会将其加入到endpoints中

```js
健康检查正常
[root@node-1 demo]# curl http://10.244.2.22/test.html

查看endpoints情况
readines[root@node-1 demo]# kubectl describe endpoints nginx-service 
Name:         nginx-service
Namespace:    default
Labels:       app=nginx
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2019-09-30T14:33:01Z
Subsets:
  Addresses:          10.244.2.22 #就绪地址，已从NotReady中提出，加入到正常的Address列表中
  NotReadyAddresses:  <none>
  Ports:
    Name  Port  Protocol
    ----  ----  --------
    http  80    TCP

查看service状态
[root@node-1 demo]# kubectl describe services nginx-service 
Name:              nginx-service
Namespace:         default
Labels:            app=nginx
Annotations:       kubectl.kubernetes.io/last-applied-configuration:
                     {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"labels":{"app":"nginx"},"name":"nginx-service","namespace":"default"},"s...
Selector:          app=nginx
Type:              ClusterIP
IP:                10.110.54.40
Port:              http  80/TCP
TargetPort:        80/TCP
Endpoints:         10.244.2.22:80 #已和endpoints关联
Session Affinity:  None
Events:            <none>
```

1. 同理，如果此时容器的健康检查异常，kubelet会自动将其动endpoint中

```js
删除站点信息，使健康检查异常
[root@node-1 demo]# kubectl exec -it nginx-tcp-liveness-probe  /bin/bash
root@nginx-tcp-liveness-probe:/# rm -f /usr/share/nginx/html/test.html 

查看pod健康检查event日志
[root@node-1 demo]# kubectl get pods nginx-tcp-liveness-probe 
NAME                       READY   STATUS    RESTARTS   AGE
nginx-tcp-liveness-probe   0/1     Running   0          11m
[root@node-1 demo]# kubectl describe pods nginx-tcp-liveness-probe | tail
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:
  Type     Reason     Age                  From               Message
  ----     ------     ----                 ----               -------
  Normal   Scheduled  12m                  default-scheduler  Successfully assigned default/nginx-tcp-liveness-probe to node-3
  Normal   Pulling    12m                  kubelet, node-3    Pulling image "nginx:latest"
  Normal   Pulled     11m                  kubelet, node-3    Successfully pulled image "nginx:latest"
  Normal   Created    11m                  kubelet, node-3    Created container nginx-tcp-liveness-probe
  Normal   Started    11m                  kubelet, node-3    Started container nginx-tcp-liveness-probe
  Warning  Unhealthy  119s (x32 over 11m)  kubelet, node-3    Readiness probe failed: HTTP probe failed with statuscode: 404

查看endpoints
[root@node-1 demo]# kubectl describe endpoints nginx-service 
Name:         nginx-service
Namespace:    default
Labels:       app=nginx
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2019-09-30T14:38:01Z
Subsets:
  Addresses:          <none>
  NotReadyAddresses:  10.244.2.22 #健康检查异常，此时加入到NotReady状态
  Ports:
    Name  Port  Protocol
    ----  ----  --------
    http  80    TCP

Events:  <none>

查看service状态，此时endpoints为空
[root@node-1 demo]# kubectl describe services nginx-service 
Name:              nginx-service
Namespace:         default
Labels:            app=nginx
Annotations:       kubectl.kubernetes.io/last-applied-configuration:
                     {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"labels":{"app":"nginx"},"name":"nginx-service","namespace":"default"},"s...
Selector:          app=nginx
Type:              ClusterIP
IP:                10.110.54.40
Port:              http  80/TCP
TargetPort:        80/TCP
Endpoints:         #为空
Session Affinity:  None
Events:            <none>
```

## 1.6 TKE设置健康检查

  TKE中可以设定应用的健康检查机制，健康检查机制包含在不同的Workload中，可以通过模板生成健康监测机制，定义过程中可以选择高级选项，默认健康检查机制是关闭状态，包含前面介绍的两种探针：存活探针livenessProbe和就绪探针readinessProbe，根据需要分别开启

TKE健康检查

开启探针之后进入设置健康检查，支持上述介绍的三种方法：执行命令检查、TCP端口检查，HTTP请求检查

TKE健康检查方法

选择不同的检查方法填写不同的参数即可，如启动间隔，检查间隔，响应超时，等参数，以HTTP请求检查方法为例：

TKE http健康检查方法

设置完成后创建workload时候会自动生成yaml文件，以刚创建的deployment为例，生成健康检查yaml文件内容如下：

```js
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
    description: tke-health-check-demo
  creationTimestamp: "2019-09-30T12:28:42Z"
  generation: 1
  labels:
    k8s-app: tke-health-check-demo
    qcloud-app: tke-health-check-demo
  name: tke-health-check-demo
  namespace: default
  resourceVersion: "2060365354"
  selfLink: /apis/apps/v1beta2/namespaces/default/deployments/tke-health-check-demo
  uid: d6cf1f25-e37d-11e9-87fd-567eb17a3218
spec:
  minReadySeconds: 10
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      k8s-app: tke-health-check-demo
      qcloud-app: tke-health-check-demo
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        k8s-app: tke-health-check-demo
        qcloud-app: tke-health-check-demo
    spec:
      containers:
      - image: nginx:latest
        imagePullPolicy: Always
        livenessProbe:   #通过模板生成的健康检查机制
          failureThreshold: 1
          httpGet:
            path: /
            port: 80
            scheme: HTTP
          periodSeconds: 3
          successThreshold: 1
          timeoutSeconds: 2
        name: tke-health-check-demo
        resources:
          limits:
            cpu: 500m
            memory: 1Gi
          requests:
            cpu: 250m
            memory: 256Mi
        securityContext:
          privileged: false
          procMount: Default
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      imagePullSecrets:
      - name: qcloudregistrykey
      - name: tencenthubkey
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
```

# 写在最后

  本章介绍kubernetes中健康检查两种Probe：livenessProbe和readinessProbe，livenessProbe主要用于存活检查，检查容器内部运行状态，readiness主要用于就绪检查，是否可以接受流量，通常需要和service的endpoints结合，当就绪准备妥当时加入到endpoints中，当就绪异常时从endpoints中删除，从而实现了services的健康检查和服务探测机制。对于Probe机制提供了三种检测的方法，分别适用于不同的场景：1. exec命令行，通过命令或shell实现健康检查，2. tcpSocket通过TCP协议探测端口，建立tcp连接，3. httpGet通过建立http请求探测，读者可多实操掌握其用法。

# 附录

健康检查：https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

TKE健康检查设置方法：[https://cloud.tencent.com/document/product/457/32815](https://cloud.tencent.com/document/product/457/32815?from=10680)



> 『 转载 』该文章来源于网络，侵删。 
