---
title: "03 Kubernetes快速入门"
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

kubernetes中涉及很多概念，包含云生态社区中各类技术，学习成本比较高，k8s中通常以编写yaml文件完成资源的部署，对于较多入门的人来说是个较高的门坎，本文以命令行的形式带领大家快速入门，俯瞰kubernetes核心概念，快速入门。

# 1. 基础概念

## 1.1 集群与节点

kubernetes是一个开源的容器引擎管理平台，实现容器化应用的自动化部署，任务调度，[弹性伸缩](#)，[负载均衡](#)等功能，cluster是由master和node两种角色组成

- master负责管理集群，master包含kube-apiserver，kube-controller-manager，kube-scheduler，etcd组件
- node节点运行容器应用，由Container Runtime，kubelet和kube-proxy组成，其中Container Runtime可能是Docker，rke，containerd，node节点可由物理机或者虚拟机组成。

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/1%20-%201620.jpg)kubernetes集群概念

1、查看master组件角色

```js
[root@node-1 ~]# kubectl get componentstatuses 
NAME                 STATUS    MESSAGE             ERROR
scheduler            Healthy   ok                  
controller-manager   Healthy   ok                  
etcd-0               Healthy   {"health":"true"}   
```

2、 查看node节点列表

```js
[root@node-1 ~]# kubectl get nodes
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    master   26h   v1.14.1
node-2   Ready    <none>   26h   v1.14.1
node-3   Ready    <none>   26h   v1.14.1
```

3、查看node节点详情

```js
[root@node-1 ~]# kubectl describe node node-3
Name:               node-3
Roles:              <none>
Labels:             beta.kubernetes.io/arch=amd64。#标签和Annotations
                    beta.kubernetes.io/os=linux
                    kubernetes.io/arch=amd64
                    kubernetes.io/hostname=node-3
                    kubernetes.io/os=linux
Annotations:        flannel.alpha.coreos.com/backend-data: {"VtepMAC":"22:f8:75:bb:da:4e"}
                    flannel.alpha.coreos.com/backend-type: vxlan
                    flannel.alpha.coreos.com/kube-subnet-manager: true
                    flannel.alpha.coreos.com/public-ip: 10.254.100.103
                    kubeadm.alpha.kubernetes.io/cri-socket: /var/run/dockershim.sock
                    node.alpha.kubernetes.io/ttl: 0
                    volumes.kubernetes.io/controller-managed-attach-detach: true
CreationTimestamp:  Sat, 10 Aug 2019 17:50:00 +0800
Taints:             <none>
Unschedulable:      false。#是否禁用调度，cordon命令控制的标识位。
Conditions:     #资源调度能力，MemoryPressure内存是否有压力（即内存不足）
                #DiskPressure磁盘压力
                #PIDPressure磁盘压力
                #Ready，是否就绪，表明节点是否处于正常工作状态，表示资源充足+相关进程状态正常
  Type             Status  LastHeartbeatTime                 LastTransitionTime                Reason                       Message
  ----             ------  -----------------                 ------------------                ------                       -------
  MemoryPressure   False   Sun, 11 Aug 2019 20:32:07 +0800   Sat, 10 Aug 2019 17:50:00 +0800   KubeletHasSufficientMemory   kubelet has sufficient memory available
  DiskPressure     False   Sun, 11 Aug 2019 20:32:07 +0800   Sat, 10 Aug 2019 17:50:00 +0800   KubeletHasNoDiskPressure     kubelet has no disk pressure
  PIDPressure      False   Sun, 11 Aug 2019 20:32:07 +0800   Sat, 10 Aug 2019 17:50:00 +0800   KubeletHasSufficientPID      kubelet has sufficient PID available
  Ready            True    Sun, 11 Aug 2019 20:32:07 +0800   Sat, 10 Aug 2019 18:04:20 +0800   KubeletReady                 kubelet is posting ready status
Addresses:     #地址和主机名
  InternalIP:  10.254.100.103
  Hostname:    node-3
Capacity:      #容器的资源容量
 cpu:                2
 ephemeral-storage:  51473868Ki
 hugepages-2Mi:      0
 memory:             3880524Ki
 pods:               110
Allocatable:    #已分配资源情况
 cpu:                2
 ephemeral-storage:  47438316671
 hugepages-2Mi:      0
 memory:             3778124Ki
 pods:               110
System Info:     #系统信息，如内核版本，操作系统版本，cpu架构，node节点软件版本
 Machine ID:                 0ea734564f9a4e2881b866b82d679dfc
 System UUID:                D98ECAB1-2D9E-41CC-9A5E-51A44DC5BB97
 Boot ID:                    6ec81f5b-cb05-4322-b47a-a8e046d9bf79
 Kernel Version:             3.10.0-957.el7.x86_64
 OS Image:                   CentOS Linux 7 (Core)
 Operating System:           linux
 Architecture:               amd64
 Container Runtime Version:  docker://18.3.1 .     #Container Runtime为docker，版本为18.3.1
 Kubelet Version:            v1.14.1               #kubelet版本
 Kube-Proxy Version:         v1.14.1               #kube-proxy版本
PodCIDR:                     10.244.2.0/24         #pod使用的网络
Non-terminated Pods:         (4 in total)。        #下面是每个pod资源占用情况
  Namespace                  Name                           CPU Requests  CPU Limits  Memory Requests  Memory Limits  AGE
  ---------                  ----                           ------------  ----------  ---------------  -------------  ---
  kube-system                coredns-fb8b8dccf-hrqm8        100m (5%)     0 (0%)      70Mi (1%)        170Mi (4%)     26h
  kube-system                coredns-fb8b8dccf-qwwks        100m (5%)     0 (0%)      70Mi (1%)        170Mi (4%)     26h
  kube-system                kube-flannel-ds-amd64-zzm2g    100m (5%)     100m (5%)   50Mi (1%)        50Mi (1%)      26h
  kube-system                kube-proxy-x8zqh               0 (0%)        0 (0%)      0 (0%)           0 (0%)         26h
Allocated resources:   #已分配资源情况
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                300m (15%)  100m (5%)
  memory             190Mi (5%)  390Mi (10%)
  ephemeral-storage  0 (0%)      0 (0%)
Events:              <none>
```

## 1.2 容器与应用

kubernetes是容器编排引擎，其负责容器的调度，管理和容器的运行，但kubernetes调度最小单位并非是container，而是pod，pod中可包含多个container，通常集群中不会直接运行pod，而是通过各种工作负载的控制器如Deployments，ReplicaSets，DaemonSets的方式运行，为啥？因为控制器能够保证pod状态的一致性，正如官方所描述的一样“make sure the current state match to the desire state”，确保当前状态和预期的一致，简单来说就是pod异常了，控制器会在其他节点重建，确保集群当前运行的pod和预期设定的一致。

- pod是kubernetes中运行的最小单元
- pod中包含一个容器或者多个容器
- pod不会单独使用，需要有工作负载来控制，如Deployments，StatefulSets，DaemonSets，CronJobs等

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/2%20-%201620.jpg)container与pod

- Container，容器是一种轻量化的虚拟化技术，通过将应用封装在镜像中，实现便捷部署，应用分发。
- Pod，kubernetes中最小的调度单位，封装容器，包含一个pause容器和应用容器，容器之间共享相同的命名空间，网络，存储，共享进程。
- Deployments，部署组也称应用，严格上来说是无状态化工作负载，另外一种由状态化工组负载是StatefulSets，Deployments是一种控制器，可以控制工作负载的副本数replicas，通过kube-controller-manager中的Deployments Controller实现副本数状态的控制。

## 1.3 服务访问

kubernetes中pod是实际运行的载体，pod依附于node中，node可能会出现故障，kubernetes的控制器如replicasets会在其他node上重新拉起一个pod，新的pod会分配一个新的IP；再者，应用部署时会包含多个副本replicas，如同个应用deployments部署了3个pod副本，pod相当于后端的Real Server，如何实现这三个应用访问呢？对于这种情况，我们一般会在Real Server前面加一个负载均衡Load Balancer，service就是pod的负载均衡调度器，service将动态的pod抽象为一个服务，应用程序直接访问service即可，service会自动将请求转发到后端的pod。负责service转发规则有两种机制：iptables和ipvs，iptables通过设置DNAT等规则实现负载均衡，ipvs通过ipvsadm设置转发规。

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/3%20-%201620.jpg)service概念

根据服务不同的访问方式，service分为如下几种类型：ClusterIP，NodePort，LoadBalancer和_ExternalName，可通过type设置。

- ClusterIP，集群内部互访，与DNS结合实现集群内部的服务发现；
- NodePort，通过NAT将每个node节点暴露一个端口实现外部访问；
- LoadBalancer，实现云厂商外部接入方式的接口，需要依赖云服务提供商实现具体技术细节，如腾讯云实现与CLB集成；
- ExternalName，通过服务名字暴露服务名，当前可由ingress实现，将外部的请求以域名转发的形式转发到集群，需要依附具体的外部实现，如nginx，traefik,各大云计算厂商实现接入细节。

pod是动态变化的，ip地址可能会变化（如node故障），副本数可能会变化，如应用扩展scale up，应用锁容scale down等，service如何识别到pod的动态变化呢？答案是labels，通过labels自动会过滤出某个应用的Endpoints，当pod变化时会自动更新Endpoints，不同的应用会有由不同的label组成。labels相关可以参考下https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/4%20-%201620.jpg)service与labels

# 2. 创建应用

我们开始部署一个应用即deployments，kubernetes中包含各种workload如无状态话的Deployments，有状态化的StatefulSets，守护进程的DaemonSets，每种workload对应不同的应用场景，我们先以Deployments为例入门，其他workload均以此类似，一般而言，在kubernetes中部署应用均以yaml文件方式部署，对于初学者而言，编写yaml文件太冗长，不适合初学，我们先kubectl命令行方式实现API的接入。

1、部署nginx应用，部署三个副本

```js
[root@node-1 ~]# kubectl run nginx-app-demo --image=nginx:1.7.9 --port=80 --replicas=3 
kubectl run --generator=deployment/apps.v1 is DEPRECATED and will be removed in a future version. Use kubectl run --generator=run-pod/v1 or kubectl create instead.
deployment.apps/nginx-app-demo created
```

2、查看应用列表,可以看到当前pod的状态均已正常，Ready是当前状态，AVAILABLE是目标状态

```js
[root@node-1 ~]# kubectl get deployments
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-app-demo   3/3     3            3           72s
```

3、查看应用的详细信息,如下我们可以知道Deployments是通过ReplicaSets控制副本数的，由Replicaset控制pod数

```js
[root@node-1 ~]# kubectl describe deployments nginx-app-demo 
Name:                   nginx-app-demo     #应用名称
Namespace:              default            #命名空间
CreationTimestamp:      Sun, 11 Aug 2019 21:52:32 +0800
Labels:                 run=nginx-app-demo #labels，很重要，后续service通过labels实现访问
Annotations:            deployment.kubernetes.io/revision: 1 #滚动升级版本号
Selector:               run=nginx-app-demo #labels的选择器selector
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable #副本控制器
StrategyType:           RollingUpdate     #升级策略为RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge #RollingUpdate升级策略，即最大不超过25%的pod
Pod Template:   #容器应用模版，包含镜像，port，存储等
  Labels:  run=nginx-app-demo
  Containers:
   nginx-app-demo:
    Image:        nginx:1.7.9
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:  #当前状态
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-app-demo-7bdfd97dcd (3/3 replicas created) #ReplicaSets控制器名称
Events:  #运行事件
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  3m24s  deployment-controller  Scaled up replica set nginx-app-demo-7bdfd97dcd to 3
```

4、查看replicasets情况，通过查看可知replicasets副本控制器生成了三个pod

```js
1. 查看replicasets列表
  [root@node-1 ~]# kubectl get replicasets
NAME                        DESIRED   CURRENT   READY   AGE
nginx-app-demo-7bdfd97dcd   3         3         3       9m9s

2. 查看replicasets详情
[root@node-1 ~]# kubectl describe replicasets nginx-app-demo-7bdfd97dcd 
Name:           nginx-app-demo-7bdfd97dcd
Namespace:      default
Selector:       pod-template-hash=7bdfd97dcd,run=nginx-app-demo
Labels:         pod-template-hash=7bdfd97dcd #labels，增加了一个hash的label识别replicasets
                run=nginx-app-demo
Annotations:    deployment.kubernetes.io/desired-replicas: 3 #滚动升级的信息，副本树，最大数，应用版本
                deployment.kubernetes.io/max-replicas: 4
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-app-demo #副本的父控制，为nginx-app-demo这个Deployments
Replicas:       3 current / 3 desired
Pods Status:    3 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:  #容器模板，继承于deployments
  Labels:  pod-template-hash=7bdfd97dcd
           run=nginx-app-demo
  Containers:
   nginx-app-demo:
    Image:        nginx:1.7.9
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events: #事件日志，生成了三个不同的pod
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  9m25s  replicaset-controller  Created pod: nginx-app-demo-7bdfd97dcd-hsrft
  Normal  SuccessfulCreate  9m25s  replicaset-controller  Created pod: nginx-app-demo-7bdfd97dcd-qtbzd
  Normal  SuccessfulCreate  9m25s  replicaset-controller  Created pod: nginx-app-demo-7bdfd97dcd-7t72x
```

5、查看pod的情况,实际应用部署的载体，pod中部署了一个nginx的容器并分配了一个ip，可通过该ip直接访问应用

```js
1. 查看pod的列表，和replicasets生成的名称一致
[root@node-1 ~]# kubectl get pods
NAME                              READY   STATUS    RESTARTS   AGE
nginx-app-demo-7bdfd97dcd-7t72x   1/1     Running   0          13m
nginx-app-demo-7bdfd97dcd-hsrft   1/1     Running   0          13m
nginx-app-demo-7bdfd97dcd-qtbzd   1/1     Running   0          13m

查看pod的详情
[root@node-1 ~]# kubectl describe pods nginx-app-demo-7bdfd97dcd-7t72x 
Name:               nginx-app-demo-7bdfd97dcd-7t72x
Namespace:          default
Priority:           0
PriorityClassName:  <none>
Node:               node-3/10.254.100.103
Start Time:         Sun, 11 Aug 2019 21:52:32 +0800
Labels:             pod-template-hash=7bdfd97dcd  #labels名称
                    run=nginx-app-demo
Annotations:        <none>
Status:             Running
IP:                 10.244.2.4 #pod的ip地址
Controlled By:      ReplicaSet/nginx-app-demo-7bdfd97dcd #副本控制器为replicasets
Containers:   #容器的信息，包括容器id，镜像，丢按扣，状态，环境变量等信息
  nginx-app-demo:
    Container ID:   docker://5a0e5560583c5929e9768487cef43b045af4c6d3b7b927d9daf181cb28867766
    Image:          nginx:1.7.9
    Image ID:       docker-pullable://nginx@sha256:e3456c851a152494c3e4ff5fcc26f240206abac0c9d794affb40e0714846c451
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Sun, 11 Aug 2019 21:52:40 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-txhkc (ro)
Conditions: #容器的状态条件
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:    #容器卷
  default-token-txhkc:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-txhkc
    Optional:    false
QoS Class:       BestEffort #QOS类型
Node-Selectors:  <none> #污点类型
Tolerations:     node.kubernetes.io/not-ready:NoExecute for 300s
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:  #事件状态，拉镜像，启动容器
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  14m   default-scheduler  Successfully assigned default/nginx-app-demo-7bdfd97dcd-7t72x to node-3
  Normal  Pulling    14m   kubelet, node-3    Pulling image "nginx:1.7.9"
  Normal  Pulled     14m   kubelet, node-3    Successfully pulled image "nginx:1.7.9"
  Normal  Created    14m   kubelet, node-3    Created container nginx-app-demo
  Normal  Started    14m   kubelet, node-3    Started container nginx-app-demo
```

# 3. 访问应用

kubernetes为每个pod都分配了一个ip地址，可通过该地址直接访问应用，相当于访问RS，但一个应用是一个整体，由多个副本数组成，需要依赖于service来实现应用的负载均衡，service我们探讨ClusterIP和NodePort的访问方式。

1、设置pod的内容，为了方便区分，我们将三个pod的nginx站点内容设置为不同，以观察负载均衡的效果

```js
查看pod列表
[root@node-1 ~]# kubectl get pods
NAME                              READY   STATUS    RESTARTS   AGE
nginx-app-demo-7bdfd97dcd-7t72x   1/1     Running   0          28m
nginx-app-demo-7bdfd97dcd-hsrft   1/1     Running   0          28m
nginx-app-demo-7bdfd97dcd-qtbzd   1/1     Running   0          28m

进入pod容器中
[root@node-1 ~]# kubectl exec -it nginx-app-demo-7bdfd97dcd-7t72x /bin/bash

设置站点内容
[root@nginx-app-demo-7bdfd97dcd-7t72x:/# echo "web1" >/usr/share/nginx/html/index.html
 
以此类推设置另外两个pod的内容为web2和web3
[root@nginx-app-demo-7bdfd97dcd-hsrft:/# echo web2 >/usr/share/nginx/html/index.html
[root@nginx-app-demo-7bdfd97dcd-qtbzd:/# echo web3 >/usr/share/nginx/html/index.html
```

2、获取pod的ip地址，如何快速获取pod的ip地址呢，可以通过-o wide参数显示更多的内容,会包含pod所属node和ip

```js
[root@node-1 ~]# kubectl get pods -o wide 
NAME                              READY   STATUS    RESTARTS   AGE   IP           NODE     NOMINATED NODE   READINESS GATES
nginx-app-demo-7bdfd97dcd-7t72x   1/1     Running   0          34m   10.244.2.4   node-3   <none>           <none>
nginx-app-demo-7bdfd97dcd-hsrft   1/1     Running   0          34m   10.244.1.2   node-2   <none>           <none>
nginx-app-demo-7bdfd97dcd-qtbzd   1/1     Running   0          34m   10.244.1.3   node-2   <none>           <none>
```

3、访问pod的ip，查看站点内容,不同的pod站点内容和上述步骤设置一致。

```js
[root@node-1 ~]# curl http://10.244.2.4
web1
[root@node-1 ~]# curl http://10.244.1.2
web2
[root@node-1 ~]# curl http://10.244.1.3
web3
```

## 3.1 ClusterIP访问

通过pod的ip直接访问应用，对于单个pod的应用可以实现，对于多个副本replicas的应用则不符合要求，需要通过service来实现负载均衡，service需要设置不同的type，默认为ClusterIP即集群内部访问，如下通过expose子命令将服务暴露到service。

1、暴露service,其中port表示代理监听端口，target-port代表是容器的端口，type设置的是service的类型

```js
[root@node-1 ~]# kubectl expose deployment nginx-app-demo --name nginx-service-demo \
--port=80 \
--protocol=TCP \
--target-port=80 \
--type ClusterIP 
service/nginx-service-demo exposed
```

2、查看service的详情，可以看到service通过labels选择器selector自动将pod的ip生成endpoints

```js
查看service列表，显示有两个，kubernetes为默认集群创建的service
[root@node-1 ~]# kubectl get services
NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
kubernetes           ClusterIP   10.96.0.1    <none>        443/TCP   29h
nginx-service-demo   ClusterIP   10.102.1.1   <none>        80/TCP    2m54s

查看service详情，可以看到Labels的Seletor和前面Deployments设置一致，Endpoints将pod组成一个列表
[root@node-1 ~]# kubectl describe services nginx-service-demo 
Name:              nginx-service-demo   #名称
Namespace:         default              #命名空间
Labels:            run=nginx-app-demo   #标签名称
Annotations:       <none>
Selector:          run=nginx-app-demo   #标签选择器
Type:              ClusterIP            #service类型为ClusterIP
IP:                10.102.1.1           #服务的ip，即vip，集群内部会自动分配一个
Port:              <unset>  80/TCP      #服务端口，即ClusterIP对外访问的端口
TargetPort:        80/TCP               #容器端口
Endpoints:         10.244.1.2:80,10.244.1.3:80,10.244.2.4:80 #访问地址列表
Session Affinity:  None                 #负载均衡调度算法
Events:            <none>
```

3、访问service的地址，可以访问的内容可知，service自动实现了pods的负载均衡，调度策略为轮询，为何？因为service默认的调度策略Session Affinity为None，即是轮训，可以设置为ClientIP，实现会话保持，相同客户端IP的请求会调度到相同的pod上。

```js
[root@node-1 ~]# curl http://10.102.1.1
web3
[root@node-1 ~]# curl http://10.102.1.1
web1
[root@node-1 ~]# curl http://10.102.1.1
web2
[root@node-1 ~]# curl http://10.102.1.1
```

4、ClusterIP原理深入剖析，service后端实现有两种机制：iptables和ipvs，环境安装采用iptables，iptables通过nat的链生成访问规则，KUBE-SVC-R5Y5DZHD7Q6DDTFZ为入站DNAT转发规则，KUBE-MARK-MASQ为出站转发

```js
[root@node-1 ~]# iptables -t nat -L -n
Chain KUBE-SERVICES (2 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  tcp  -- !10.244.0.0/16        10.102.1.1           /* default/nginx-service-demo: cluster IP */ tcp dpt:80
KUBE-SVC-R5Y5DZHD7Q6DDTFZ  tcp  --  0.0.0.0/0            10.102.1.1           /* default/nginx-service-demo: cluster IP */ tcp dpt:80

出站：KUBE-MARK-MASQ源地址段不是10.244.0.0/16访问10.102.1.1的目标端口80时，将请求转发给KUBE-MARK-MASQ链
入站：KUBE-SVC-R5Y5DZHD7Q6DDTFZ任意原地址访问目标10.102.1.1的目标端口80时将请求转发给KUBE-SVC-R5Y5DZHD7Q6DDTFZ链
```

5、查看入站请求规则，入站请求规则将会映射到不同的链，不同链将会转发到不同pod的ip上。

```js
1. 查看入站规则KUBE-SVC-R5Y5DZHD7Q6DDTFZ，请求将转发至三条链
[root@node-1 ~]# iptables -t nat -L KUBE-SVC-R5Y5DZHD7Q6DDTFZ -n
Chain KUBE-SVC-R5Y5DZHD7Q6DDTFZ (1 references)
target     prot opt source               destination         
KUBE-SEP-DSWLUQNR4UPH24AX  all  --  0.0.0.0/0            0.0.0.0/0            statistic mode random probability 0.33332999982
KUBE-SEP-56SLMGHHOILJT36K  all  --  0.0.0.0/0            0.0.0.0/0            statistic mode random probability 0.50000000000
KUBE-SEP-K6G4Z74HQYF6X7SI  all  --  0.0.0.0/0            0.0.0.0/0 

2. 查看实际转发的三条链的规则,实际映射到不同的pod的ip地址上
[root@node-1 ~]# iptables -t nat -L KUBE-SEP-DSWLUQNR4UPH24AX  -n
Chain KUBE-SEP-DSWLUQNR4UPH24AX (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  all  --  10.244.1.2           0.0.0.0/0           
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp to:10.244.1.2:80

[root@node-1 ~]# iptables -t nat -L KUBE-SEP-56SLMGHHOILJT36K  -n
Chain KUBE-SEP-56SLMGHHOILJT36K (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  all  --  10.244.1.3           0.0.0.0/0           
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp to:10.244.1.3:80

[root@node-1 ~]# iptables -t nat -L KUBE-SEP-K6G4Z74HQYF6X7SI   -n
Chain KUBE-SEP-K6G4Z74HQYF6X7SI (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  all  --  10.244.2.4           0.0.0.0/0           
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp to:10.244.2.4:80     
```

## 3.2 NodePort访问

  Service通过ClusterIP只能提供集群内部的应用访问，外部无法直接访问应用，如果需要外部访问有如下几种方式：NodePort，LoadBalancer和Ingress，其中LoadBalancer需要由云服务提供商实现，Ingress需要安装单独的Ingress Controller，日常测试可以通过NodePort的方式实现，NodePort可以将node的某个端口暴露给外部网络访问。

1、修改type的类型由ClusterIP修改为NodePort类型（或者重新创建，指定type的类型为NodePort）

```js
1. 通过patch修改type的类型
[root@node-1 ~]# kubectl patch services nginx-service-demo -p '{"spec":{"type": "NodePort"}}'
service/nginx-service-demo patched

2. 确认yaml文件配置，分配了一个NodePort端口，即每个node上都会监听该端口
[root@node-1 ~]# kubectl get services nginx-service-demo -o yaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: "2019-08-11T14:35:59Z"
  labels:
    run: nginx-app-demo
  name: nginx-service-demo
  namespace: default
  resourceVersion: "157676"
  selfLink: /api/v1/namespaces/default/services/nginx-service-demo
  uid: 55e29b78-bc45-11e9-b073-525400490421
spec:
  clusterIP: 10.102.1.1
  externalTrafficPolicy: Cluster
  ports:
  - nodePort: 32416 #自动分配了一个NodePort端口
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    run: nginx-app-demo
  sessionAffinity: None
  type: NodePort #类型修改为NodePort
status:
  loadBalancer: {}
  
3. 查看service列表，可以知道service的type已经修改为NodePort,同时还保留ClusterIP的访问IP
[root@node-1 ~]# kubectl get services
NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)        AGE
kubernetes           ClusterIP   10.96.0.1    <none>        443/TCP        30h
nginx-service-demo   NodePort    10.102.1.1   <none>        80:32416/TCP   68m
```

2、通过NodePort访问应用程序,每个node的地址相当于vip，可以实现相同的负载均衡效果，同时CluserIP功能依可用

```js
1. NodePort的负载均衡
[root@node-1 ~]# curl http://node-1:32416
web1
[root@node-1 ~]# curl http://node-2:32416
web1
[root@node-1 ~]# curl http://node-3:32416
web1
[root@node-1 ~]# curl http://node-3:32416
web3
[root@node-1 ~]# curl http://node-3:32416
web2

2. ClusterIP的负载均衡
[root@node-1 ~]# curl http://10.102.1.1
web2
[root@node-1 ~]# curl http://10.102.1.1
web1
[root@node-1 ~]# curl http://10.102.1.1
web1
[root@node-1 ~]# curl http://10.102.1.1
web3
```

3、NodePort转发原理，每个node上通过kube-proxy监听NodePort的端口，由后端的iptables实现端口的转发

```js
1. NodePort监听端口
[root@node-1 ~]# netstat -antupl |grep 32416
tcp6       0      0 :::32416                :::*                    LISTEN      32052/kube-proxy 

2. 查看nat表的转发规则，有两条规则KUBE-MARK-MASQ出口和KUBE-SVC-R5Y5DZHD7Q6DDTFZ入站方向。
Chain KUBE-NODEPORTS (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  tcp  --  0.0.0.0/0            0.0.0.0/0            /* default/nginx-service-demo: */ tcp dpt:32416
KUBE-SVC-R5Y5DZHD7Q6DDTFZ  tcp  --  0.0.0.0/0            0.0.0.0/0            /* default/nginx-service-demo: */ tcp dpt:32416

3. 查看入站的请求规则链KUBE-SVC-R5Y5DZHD7Q6DDTFZ 
[root@node-1 ~]# iptables -t nat -L KUBE-SVC-R5Y5DZHD7Q6DDTFZ  -n
Chain KUBE-SVC-R5Y5DZHD7Q6DDTFZ (2 references)
target     prot opt source               destination         
KUBE-SEP-DSWLUQNR4UPH24AX  all  --  0.0.0.0/0            0.0.0.0/0            statistic mode random probability 0.33332999982
KUBE-SEP-56SLMGHHOILJT36K  all  --  0.0.0.0/0            0.0.0.0/0            statistic mode random probability 0.50000000000
KUBE-SEP-K6G4Z74HQYF6X7SI  all  --  0.0.0.0/0            0.0.0.0/0          

4. 继续查看转发链，包含有DNAT转发和KUBE-MARK-MASQ和出站返回的规则
[root@node-1 ~]# iptables -t nat -L KUBE-SEP-DSWLUQNR4UPH24AX  -n
Chain KUBE-SEP-DSWLUQNR4UPH24AX (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  all  --  10.244.1.2           0.0.0.0/0           
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp to:10.244.1.2:80

[root@node-1 ~]# iptables -t nat -L KUBE-SEP-56SLMGHHOILJT36K  -n
Chain KUBE-SEP-56SLMGHHOILJT36K (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  all  --  10.244.1.3           0.0.0.0/0           
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp to:10.244.1.3:80


[root@node-1 ~]# iptables -t nat -L KUBE-SEP-K6G4Z74HQYF6X7SI   -n
Chain KUBE-SEP-K6G4Z74HQYF6X7SI (1 references)
target     prot opt source               destination         
KUBE-MARK-MASQ  all  --  10.244.2.4           0.0.0.0/0           
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp to:10.244.2.4:80
```

# 4. 扩展应用

当应用程序的负载比较高无法满足应用请求时，一般我们会通过扩展RS的数量来实现，在kubernetes中，扩展RS实际上通过扩展副本数replicas来实现，扩展RS非常便利，快速实现弹性伸缩。kubernets能提供两种方式的伸缩能力：1. 手动伸缩能力scale up和scale down，2. 动态的弹性伸缩horizontalpodautoscalers,基于CPU的利用率实现自动的弹性伸缩，需要依赖与监控组件如metrics server，当前未实现，后续再做深入探讨，本文以手动的scale的方式扩展应用的副本数。

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/5%20-%20xhtrt4wou1.gif)Deployments副本扩展

1、手动扩展副本数

```js
[root@node-1 ~]# kubectl scale  --replicas=4 deployment nginx-app-demo 
deployment.extensions/nginx-app-demo scaled
```

2、查看副本扩展情况,deployments自动部署一个应用

```js
[root@node-1 ~]# kubectl get deployments
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-app-demo   4/4     4            4           133m
```

3、此时service的情况会怎样呢？查看service详情,新扩展的pod会自动更新到service的endpoints中，自动服务发现

```js
查看service详情
[root@node-1 ~]# kubectl describe services nginx-service-demo 
Name:                     nginx-service-demo
Namespace:                default
Labels:                   run=nginx-app-demo
Annotations:              <none>
Selector:                 run=nginx-app-demo
Type:                     NodePort
IP:                       10.102.1.1
Port:                     <unset>  80/TCP
TargetPort:               80/TCP
NodePort:                 <unset>  32416/TCP
Endpoints:                10.244.1.2:80,10.244.1.3:80,10.244.2.4:80 + 1 more...#地址已自动加入
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>

查看endpioints详情
[root@node-1 ~]# kubectl describe endpoints nginx-service-demo  
Name:         nginx-service-demo
Namespace:    default
Labels:       run=nginx-app-demo
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2019-08-11T16:04:56Z
Subsets:
  Addresses:          10.244.1.2,10.244.1.3,10.244.2.4,10.244.2.5
  NotReadyAddresses:  <none>
  Ports:
    Name     Port  Protocol
    ----     ----  --------
    <unset>  80    TCP

Events:  <none>
```

4、测试，将新加入的pod站点内容设置为web4，参考前面的设置方法，测试service的ip，查看负载均衡效果

```js
[root@node-1 ~]# curl http://10.102.1.1
web4
[root@node-1 ~]# curl http://10.102.1.1
web4
[root@node-1 ~]# curl http://10.102.1.1
web2
[root@node-1 ~]# curl http://10.102.1.1
web3
[root@node-1 ~]# curl http://10.102.1.1
web1
[root@node-1 ~]# curl http://10.102.1.1
web2
[root@node-1 ~]# curl http://10.102.1.1
web1
```

由此可知，弹性伸缩会自动自动加入到service中实现服务自动发现和负载均衡，应用的扩展相比于传统应用快速非常多。此外，kubernetes还支持自动弹性扩展的能力，即Horizontal Pod AutoScaler，自动横向伸缩能力，配合监控系统根据CPU的利用率弹性扩展Pod个数，详情可以参考文档[kubernetes系列教程(十九)使用metric-server让HPA弹性伸缩愉快运行](#)

# 5. 滚动升级

在kubernetes中更新应用程序时可以将应用程序打包到镜像中，然后更新应用程序的镜像以实现升级。默认Deployments的升级策略为RollingUpdate，其每次会更新应用中的25%的pod，新建新的pod逐个替换，防止应用程序在升级过程中不可用。同时，如果应用程序升级过程中失败，还可以通过回滚的方式将应用程序回滚到之前的状态，回滚时通过replicasets的方式实现。

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/6%20-%20p2mx04luj3.gif)滚动更新

1、更换nginx的镜像，将应用升级至最新版本,打开另外一个窗口使用kubectl get pods -w观察升级过程

```js
[root@node-1 ~]# kubectl set image deployments/nginx-app-demo nginx-app-demo=nginx:latest
deployment.extensions/nginx-app-demo image updated
```

2、观察升级过程，通过查看可知，升级过程中是通过新建+删除的方式逐个替换pod的方式

```js
[root@node-1 ~]# kubectl get pods -w
NAME                              READY   STATUS    RESTARTS   AGE
nginx-app-demo-7bdfd97dcd-7t72x   1/1     Running   0          145m
nginx-app-demo-7bdfd97dcd-hsrft   1/1     Running   0          145m
nginx-app-demo-7bdfd97dcd-j6lgd   1/1     Running   0          12m
nginx-app-demo-7bdfd97dcd-qtbzd   1/1     Running   0          145m
nginx-app-demo-5cc8746f96-xsxz4   0/1     Pending   0          0s #新建一个pod
nginx-app-demo-5cc8746f96-xsxz4   0/1     Pending   0          0s
nginx-app-demo-7bdfd97dcd-j6lgd   1/1     Terminating   0          14m #删除旧的pod，替换
nginx-app-demo-5cc8746f96-xsxz4   0/1     ContainerCreating   0          0s
nginx-app-demo-5cc8746f96-s49nv   0/1     Pending             0          0s #新建第二个pod
nginx-app-demo-5cc8746f96-s49nv   0/1     Pending             0          0s
nginx-app-demo-5cc8746f96-s49nv   0/1     ContainerCreating   0          0s
nginx-app-demo-7bdfd97dcd-j6lgd   0/1     Terminating         0          14m #更换第二个pod
nginx-app-demo-5cc8746f96-s49nv   1/1     Running             0          7s
nginx-app-demo-7bdfd97dcd-qtbzd   1/1     Terminating         0          146m
nginx-app-demo-5cc8746f96-txjqh   0/1     Pending             0          0s
nginx-app-demo-5cc8746f96-txjqh   0/1     Pending             0          0s
nginx-app-demo-5cc8746f96-txjqh   0/1     ContainerCreating   0          0s
nginx-app-demo-7bdfd97dcd-j6lgd   0/1     Terminating         0          14m
nginx-app-demo-7bdfd97dcd-j6lgd   0/1     Terminating         0          14m
nginx-app-demo-5cc8746f96-xsxz4   1/1     Running             0          9s
nginx-app-demo-5cc8746f96-txjqh   1/1     Running             0          1s
nginx-app-demo-7bdfd97dcd-hsrft   1/1     Terminating         0          146m
nginx-app-demo-7bdfd97dcd-qtbzd   0/1     Terminating         0          146m
nginx-app-demo-5cc8746f96-rcpmw   0/1     Pending             0          0s
nginx-app-demo-5cc8746f96-rcpmw   0/1     Pending             0          0s
nginx-app-demo-5cc8746f96-rcpmw   0/1     ContainerCreating   0          0s
nginx-app-demo-7bdfd97dcd-7t72x   1/1     Terminating         0          146m
nginx-app-demo-7bdfd97dcd-7t72x   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-hsrft   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-hsrft   0/1     Terminating         0          147m
nginx-app-demo-5cc8746f96-rcpmw   1/1     Running             0          2s
nginx-app-demo-7bdfd97dcd-7t72x   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-7t72x   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-hsrft   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-hsrft   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-qtbzd   0/1     Terminating         0          147m
nginx-app-demo-7bdfd97dcd-qtbzd   0/1     Terminating         0          147m
```

3、再次查看deployments的详情可知道，deployments已经更换了新的replicasets，原来的replicasets的版本为1，可用于回滚。

```js
[root@node-1 ~]# kubectl describe deployments nginx-app-demo 
Name:                   nginx-app-demo
Namespace:              default
CreationTimestamp:      Sun, 11 Aug 2019 21:52:32 +0800
Labels:                 run=nginx-app-demo
Annotations:            deployment.kubernetes.io/revision: 2 #新的版本号，用于回滚
Selector:               run=nginx-app-demo
Replicas:               4 desired | 4 updated | 4 total | 4 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  run=nginx-app-demo
  Containers:
   nginx-app-demo:
    Image:        nginx:latest
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-app-demo-5cc8746f96 (4/4 replicas created) #新的replicaset，实际是替换新的replicasets
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  19m    deployment-controller  Scaled up replica set nginx-app-demo-7bdfd97dcd to 4
  Normal  ScalingReplicaSet  4m51s  deployment-controller  Scaled up replica set nginx-app-demo-5cc8746f96 to 1
  Normal  ScalingReplicaSet  4m51s  deployment-controller  Scaled down replica set nginx-app-demo-7bdfd97dcd to 3
  Normal  ScalingReplicaSet  4m51s  deployment-controller  Scaled up replica set nginx-app-demo-5cc8746f96 to 2
  Normal  ScalingReplicaSet  4m43s  deployment-controller  Scaled down replica set nginx-app-demo-7bdfd97dcd to 2
  Normal  ScalingReplicaSet  4m43s  deployment-controller  Scaled up replica set nginx-app-demo-5cc8746f96 to 3
  Normal  ScalingReplicaSet  4m42s  deployment-controller  Scaled down replica set nginx-app-demo-7bdfd97dcd to 1
  Normal  ScalingReplicaSet  4m42s  deployment-controller  Scaled up replica set nginx-app-demo-5cc8746f96 to 4
  Normal  ScalingReplicaSet  4m42s  deployment-controller  Scaled down replica set nginx-app-demo-7bdfd97dcd to 0
```

4、查看滚动升级的版本，可以看到有两个版本，分别对应的两个不同的replicasets

```js
[root@node-1 ~]# kubectl rollout history deployment nginx-app-demo 
deployment.extensions/nginx-app-demo 
REVISION  CHANGE-CAUSE
1         <none>
2         <none>

查看replicasets列表,旧的包含pod为0
[root@node-1 ~]# kubectl get replicasets
NAME                        DESIRED   CURRENT   READY   AGE
nginx-app-demo-5cc8746f96   4         4         4       9m2s
nginx-app-demo-7bdfd97dcd   0         0         0       155m
```

5、测试应用的升级情况,发现nginx已经升级到最新nginx/1.17.2版本

```js
[root@node-1 ~]# curl -I http://10.102.1.1
HTTP/1.1 200 OK
Server: nginx/1.17.2 #nginx版本信息
Date: Sun, 11 Aug 2019 16:30:03 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 23 Jul 2019 11:45:37 GMT
Connection: keep-alive
ETag: "5d36f361-264"
Accept-Ranges: bytes
```

6、回滚到旧的版本

```js
[root@node-1 ~]# kubectl rollout undo deployment nginx-app-demo --to-revision=1
deployment.extensions/nginx-app-demo rolled back

再次测应用,已经回滚到旧版本。
[root@node-1 ~]# curl -I http://10.102.1.1
HTTP/1.1 200 OK
Server: nginx/1.7.9
Date: Sun, 11 Aug 2019 16:34:33 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 23 Dec 2014 16:25:09 GMT
Connection: keep-alive
ETag: "54999765-264"
Accept-Ranges: bytes
```

# 6. 故障迁移

![img](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%B8%89)kubernetes%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8/7%20-%201620.jpg)故障迁移

集群中的node节点物理服务器可能会因为各种原因导致机器不可用，如硬件故障，软件故障，网络故障等原因，当发生故障时容器可能会出现不可用，进而影响业务的使用。kubernetes内置已提供了应用的容错能力，通过工作负载Workload如Deployments，StatefulSets来控制，当node节点异常时会自动将其上的pod迁移至其他node节点上，保障应用的高可用。

Kubeadm默认部署的集群，默认当节点异常时，需要5min后才能迁移，因为默认pod中设置了污点容忍tolerations，当检测到节点状态是not-ready或者unreachable时，容忍tolerationSeconds时长300s后才做驱逐，如下是看pod详情中设置的污点容忍信息

```js
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
```

如下是手动创建的yaml文件，通过调整污点容忍的时长为2s，当节点异常时，其上的pod能够实现快速迁移到其他node节点

```js
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: test
  name: test
spec:
  replicas: 3
  selector:
    matchLabels:
      run: test
  template:
    metadata:
      labels:
        run: test
    spec:
      containers:
      - image: nginx:1.7.9
        name: test
        ports:
        - containerPort: 3
        resources: {}
      tolerations:
      - effect: NoExecute
        key: node.kubernetes.io/not-ready
        operator: Exists
        tolerationSeconds: 2 
      - effect: NoExecute
        key: node.kubernetes.io/unreachable
        operator: Exists
        tolerationSeconds: 2 
```

# **写在最后**

本文以命令行的方式实践探索kubernetes中涉及的最重要的几个概念：应用部署，负载均衡，弹性伸缩和滚动升级，故障迁移，并以命令行的形式实际操作，读者可以参照文档实现快速入门，后续会大部分以yaml文件的形式部署和kubernets交互。

# **参考文档**

基础概念：https://kubernetes.io/docs/tutorials/kubernetes-basics/

部署应用：https://kubernetes.io/docs/tutorials/kubernetes-basics/deploy-app/deploy-intro/

访问应用：https://kubernetes.io/docs/tutorials/kubernetes-basics/explore/explore-intro/

外部访问：https://kubernetes.io/docs/tutorials/kubernetes-basics/expose/expose-intro/

访问应用：https://kubernetes.io/docs/tutorials/kubernetes-basics/scale/scale-intro/

滚动升级：https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/



> 『 转载 』该文章来源于网络，侵删。 
