---
title: "07 深入玩转pod调度"
date: 2019-08-04T10:36:47+08:00
lastmod: 2019-08-04T10:36:47+08:00
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

上一篇文章中[kubernetes系列教程（六）kubernetes资源管理和服务质量](#)初步介绍了kubernetes中的resource资源调度和服务质量Qos，介绍了kubernetes中如何定义pod的资源和资源调度，以及设置resource之后的优先级别Qos，接下来介绍[kubernetes系列教程](#)pod的调度机制。

# 1. Pod调度

## 1.1 pod调度概述

  kubernets是容器编排引擎，其中最主要的一个功能是容器的调度，通过kube-scheduler实现容器的完全自动化调度，调度周期分为：调度周期Scheduling Cycle和绑定周期Binding Cycle，其中调度周期细分为过滤filter和weight称重，按照指定的调度策略将满足运行pod节点的node赛选出来，然后进行排序；绑定周期是经过kube-scheduler调度优选的pod后，由特定的node节点watch然后通过kubelet运行。

![Pod调度机制](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B8%83%EF%BC%89%E6%B7%B1%E5%85%A5%E7%8E%A9%E8%BD%ACpod%E8%B0%83%E5%BA%A6/1%20-%201620.jpg)

过滤阶段包含预选Predicate和scoring排序，预选是筛选满足条件的node，排序是最满足条件的node打分并排序，预选的算法包含有：

- CheckNodeConditionPred  节点是否ready
- MemoryPressure             节点内存是否压力大（内存是否足够）
- DiskPressure                  节点磁盘压力是否大（空间是否足够）
- PIDPressure                   节点Pid是否有压力（Pid进程是否足够）
- GeneralPred                   匹配pod.spec.hostname字段
- MatchNodeSelector         匹配pod.spec.nodeSelector标签
- PodFitsResources           判断resource定义的资源是否满足
- PodToleratesNodeTaints  能容忍的污点pod.spec.tolerations
- CheckNodeLabelPresence  
- CheckServiceAffinity
- CheckVolumeBinding
- NoVolumeZoneConflict

过滤条件需要检查node上满足的条件，可以通过kubectl describe node node-id方式查看，如下图：

![node调度条件condition](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B8%83%EF%BC%89%E6%B7%B1%E5%85%A5%E7%8E%A9%E8%BD%ACpod%E8%B0%83%E5%BA%A6/2%20-%201620.jpg)

优选调度算法有：

- least_requested  资源消耗最小的节点
- balanced_resource_allocation 各项资源消耗最均匀的节点
- node_prefer_avoid_pods  节点倾向
- taint_toleration  污点检测，检测有污点条件的node，得分越低
- selector_spreading  节点selector
- interpod_affinity      pod亲和力遍历
- most_requested      资源消耗最大的节点
- node_label             node标签

## 1. 2 指定nodeName调度

   nodeName是PodSpec中的一个字段，可以通过pod.spec.nodeName指定将pod调度到某个具体的node节点上，该字段比较特殊一般都为空，如果有设置nodeName字段，kube-scheduler会直接跳过调度，在特定节点上通过kubelet启动pod。通过nodeName调度并非是集群的智能调度，通过指定调度的方式可能会存在资源不均匀的情况，建议设置Guaranteed的Qos，防止资源不均时候Pod被驱逐evince。如下以创建一个pod运行在node-3上为例：

1. 编写yaml将pod指定在node-3节点上运行

```js
[root@node-1 demo]# cat nginx-nodeName.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-run-on-nodename
  annotations:
    kubernetes.io/description: "Running the Pod on specific nodeName"
spec:
  containers:
  - name: nginx-run-on-nodename
    image: nginx:latest
    ports:
    - name: http-80-port
      protocol: TCP
      containerPort: 80 
  nodeName: node-3       #通过nodeName指定将nginx-run-on-nodename运行在特定节点node-3上
```

1. 运行yaml配置使之生效

```js
[root@node-1 demo]# kubectl apply -f nginx-nodeName.yaml 
pod/nginx-run-on-nodename created
```

1. 查看确认pod的运行情况，已运行在node-3节点

```js
[root@node-1 demo]# kubectl get pods nginx-run-on-nodename -o wide 
NAME                    READY   STATUS    RESTARTS   AGE     IP            NODE     NOMINATED NODE   READINESS GATES
nginx-run-on-nodename   1/1     Running   0          6m52s   10.244.2.15   node-3   <none>           <none>
```

## 1.2. 通过nodeSelector调度

```js
nodeSelector是PodSpec中的一个字段，nodeSelector是最简单实现将pod运行在特定node节点的实现方式，其通过指定key和value键值对的方式实现，需要node设置上匹配的Labels，节点调度的时候指定上特定的labels即可。如下以node-2添加一个app:web的labels，调度pod的时候通过nodeSelector选择该labels：
```

1. 给node-2添加labels

```js
[root@node-1 demo]# kubectl label node node-2 app=web
node/node-2 labeled
```

1. 查看校验labels设置情况，node-2增加多了一个app=web的labels

```js
[root@node-1 demo]# kubectl get nodes --show-labels 
NAME     STATUS   ROLES    AGE   VERSION   LABELS
node-1   Ready    master   15d   v1.15.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-1,kubernetes.io/os=linux,node-role.kubernetes.io/master=
node-2   Ready    <none>   15d   v1.15.3   app=web,beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-2,kubernetes.io/os=linux
node-3   Ready    <none>   15d   v1.15.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-3,kubernetes.io/os=linux
```

1. 通过nodeSelector将pod调度到app=web所属的labels

```js
[root@node-1 demo]# cat nginx-nodeselector.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-run-on-nodeselector
  annotations:
    kubernetes.io/description: "Running the Pod on specific node by nodeSelector"
spec:
  containers:
  - name: nginx-run-on-nodeselector
    image: nginx:latest
    ports:
    - name: http-80-port
      protocol: TCP
      containerPort: 80 
  nodeSelector:     #通过nodeSelector将pod调度到特定的labels
    app: web
```

1. 应用yaml文件生成pod

```js
[root@node-1 demo]# kubectl apply -f nginx-nodeselector.yaml 
pod/nginx-run-on-nodeselector created
```

1. 检查验证pod的运行情况，已经运行在node-2节点

```js
[root@node-1 demo]# kubectl get pods nginx-run-on-nodeselector -o wide 
NAME                        READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
nginx-run-on-nodeselector   1/1     Running   0          51s   10.244.1.24   node-2   <none>           <none>
```

系统默认预先定义有多种内置的labels，这些labels可以标识node的属性，如arch架构，操作系统类型，主机名等

- beta.kubernetes.io/arch=amd64
- beta.kubernetes.io/os=linux
- kubernetes.io/arch=amd64
- kubernetes.io/hostname=node-3
- kubernetes.io/os=linux

## 1.3 node Affinity and anti-affinity

  affinity/anti-affinity和nodeSelector功能相类似，相比于nodeSelector，affinity的功能更加丰富，未来会取代nodeSelector，affinity增加了如下的一些功能增强：

- 表达式更加丰富，匹配方式支持多样，如In,NotIn, Exists, DoesNotExist. Gt, and Lt；
- 可指定soft和preference规则，soft表示需要满足的条件，通过requiredDuringSchedulingIgnoredDuringExecution来设置，preference则是优选选择条件，通过preferredDuringSchedulingIgnoredDuringExecution指定
- affinity提供两种级别的亲和和反亲和：基于node的node affinity和基于pod的inter-pod affinity/anti-affinity，node affinity是通过node上的labels来实现亲和力的调度，而pod affinity则是通过pod上的labels实现亲和力的调度，两者作用的范围有所不同。

下面通过一个例子来演示node affinity的使用，requiredDuringSchedulingIgnoredDuringExecution指定需要满足的条件，preferredDuringSchedulingIgnoredDuringExecution指定优选的条件，两者之间取与关系。

1. 查询node节点的labels，默认包含有多个labels，如kubernetes.io/hostname

```js
[root@node-1 ~]# kubectl get nodes --show-labels 
NAME  STATUS  ROLES AGE  VERSION  LABELS
node-1  Ready master  15d  v1.15.3  beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-1,kubernetes.io/os=linux,node-role.kubernetes.io/master=
node-2  Ready <none>  15d  v1.15.3  app=web,beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-2,kubernetes.io/os=linux
node-3  Ready <none>  15d  v1.15.3  beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-3,kubernetes.io/os=linux
```

1. 通过node affiinity实现调度，通过requiredDuringSchedulingIgnoredDuringExecution指定满足条件kubernetes.io/hostname为node-2和node-3，通过preferredDuringSchedulingIgnoredDuringExecution优选条件需满足app=web的labels

```js
[root@node-1 demo]# cat nginx-node-affinity.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-run-node-affinity
  annotations:
    kubernetes.io/description: "Running the Pod on specific node by node affinity"
spec:
  containers:
  - name: nginx-run-node-affinity
    image: nginx:latest
    ports:
    - name: http-80-port
      protocol: TCP
      containerPort: 80 
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/hostname
            operator: In
            values:
            - node-1
            - node-2
            - node-3
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: app
            operator: In
            values: ["web"] 
```

1. 应用yaml文件生成pod

```js
[root@node-1 demo]# kubectl apply -f nginx-node-affinity.yaml 
pod/nginx-run-node-affinity created
```

1. 确认pod所属的node节点，满足require和 preferre条件的节点是node-2

```js
[root@node-1 demo]# kubectl get pods --show-labels nginx-run-node-affinity -o wide 
NAME                      READY   STATUS    RESTARTS   AGE    IP            NODE     NOMINATED NODE   READINESS GATES   LABELS
nginx-run-node-affinity   1/1     Running   0          106s   10.244.1.25   node-2   <none>           <none>            <none>
```

# 写在最后

 本文介绍了kubernetes中的调度机制，默认创建pod是全自动调度机制，调度由kube-scheduler实现，调度过程分为两个阶段调度阶段（过滤和沉重排序）和绑定阶段（在node上运行pod）。通过干预有四种方式：

1. 指定nodeName
2. 通过nodeSelector
3. 通过node affinity和anti-affinity
4. 通过pod affinity和anti-affinity

# 附录

调度框架介绍：https://kubernetes.io/docs/concepts/configuration/scheduling-framework/

Pod调度方法：https://kubernetes.io/docs/concepts/configuration/assign-pod-node/

> 『 转载 』该文章来源于网络，侵删。 

