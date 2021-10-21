---
title: "06 Kubernetes资源管理和服务质量"
date: 2019-08-04T10:36:47+08:00
lastmod: 2019-08-04T10:36:47+08:00
draft: false
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

  上一篇文章中[kubernetes系列教程（五）深入掌握核心概念pod](#)初步介绍了yaml学习kubernetes中重要的一个概念pod，接下来介绍[kubernetes系列教程](#)pod的resource资源管理和pod的Quality of service服务质量。

# 1. Pod资源管理

## 1.1 resource定义

  容器运行过程中需要分配所需的资源，如何与cggroup联动配合呢？答案是通过定义resource来实现资源的分配，资源的分配单位主要是cpu和memory，资源的定义分两种：requests和limits，requests表示请求资源，主要用于初始kubernetes调度pod时的依据，表示必须满足的分配资源;limits表示资源的限制，即pod不能超过limits定义的限制大小，超过则通过cggroup限制，pod中定义资源可以通过下面四个字段定义：

- spec.container[].resources.requests.cpu 请求cpu资源的大小，如0.1个cpu和100m表示分配1/10个cpu；
- spec.container[].resources.requests.memory 请求内存大小，单位可用M，Mi，G，Gi表示；
- spec.container[].resources.limits.cpu  限制cpu的大小，不能超过阀值，cggroup中限制的值；
- spec.container[].resources.limits.memory 限制内存的大小，不能超过阀值，超过会发生OOM；

1、开始学习如何定义pod的resource资源,如下以定义nginx-demo为例，容器请求cpu资源为250m，限制为500m，请求内存资源为128Mi，限制内存资源为256Mi，当然也可以定义多个容器的资源，多个容器相加就是pod的资源总资源，如下：

```js
[root@node-1 demo]#cat nginx-resource.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
  labels:
    name: nginx-demo
spec:
  containers:
  - name: nginx-demo
    image: nginx:1.7.9
    imagePullPolicy: IfNotPresent
    ports:
    - name: nginx-port-80
      protocol: TCP
      containerPort: 80
    resources:
      requests:
        cpu: 0.25
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
```

2、应用pod的配置定义(如之前的pod还存在，先将其删除kubectl delete pod <pod-name>),或pod命名为另外一个名

```js
[root@node-1 demo]# kubectl apply -f nginx-resource.yaml 
pod/nginx-demo created
```

3、查看pod资源的分配详情

```js
[root@node-1 demo]# kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
demo-7b86696648-8bq7h   1/1     Running   0          12d
demo-7b86696648-8qp46   1/1     Running   0          12d
demo-7b86696648-d6hfw   1/1     Running   0          12d
nginx-demo              1/1     Running   0          94s

[root@node-1 demo]# kubectl describe pods nginx-demo  
Name:         nginx-demo
Namespace:    default
Priority:     0
Node:         node-3/10.254.100.103
Start Time:   Sat, 28 Sep 2019 12:10:49 +0800
Labels:       name=nginx-demo
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"name":"nginx-demo"},"name":"nginx-demo","namespace":"default"},"sp...
Status:       Running
IP:           10.244.2.13
Containers:
  nginx-demo:
    Container ID:   docker://55d28fdc992331c5c58a51154cd072cd6ae37e03e05ae829a97129f85eb5ed79
    Image:          nginx:1.7.9
    Image ID:       docker-pullable://nginx@sha256:e3456c851a152494c3e4ff5fcc26f240206abac0c9d794affb40e0714846c451
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Sat, 28 Sep 2019 12:10:51 +0800
    Ready:          True
    Restart Count:  0
    Limits:        #限制资源
      cpu:     500m
      memory:  256Mi
    Requests:      #请求资源
      cpu:        250m
      memory:     128Mi
    Environment:  <none>
    ...省略...
```

4、Pod的资源如何分配呢？毫无疑问是从node上分配的，当我们创建一个pod的时候如果设置了requests，kubernetes的调度器kube-scheduler会执行两个调度过程：filter过滤和weight称重，kube-scheduler会根据请求的资源过滤，把符合条件的node筛选出来，然后再进行排序，把最满足运行pod的node筛选出来，然后再特定的node上运行pod。调度算法和细节可以参考下[kubernetes调度算法介绍](https://my.oschina.net/u/1378920/blog/1550452?spm=a2c4e.10696291.0.0.57b419a4kAHXRs)。如下是node-3节点资源的分配详情：

```js
[root@node-1 ~]# kubectl describe node node-3
...省略...
Capacity:    #节点上资源的总资源情况，1个cpu，2g内存，110个pod
 cpu:                1
 ephemeral-storage:  51473888Ki
 hugepages-2Mi:      0
 memory:             1882352Ki
 pods:               110
Allocatable: #节点容许分配的资源情况，部分预留的资源会排出在Allocatable范畴
 cpu:                1
 ephemeral-storage:  47438335103
 hugepages-2Mi:      0
 memory:             1779952Ki
 pods:               110
System Info:
 Machine ID:                 0ea734564f9a4e2881b866b82d679dfc
 System UUID:                FFCD2939-1BF2-4200-B4FD-8822EBFFF904
 Boot ID:                    293f49fd-8a7c-49e2-8945-7a4addbd88ca
 Kernel Version:             3.10.0-957.21.3.el7.x86_64
 OS Image:                   CentOS Linux 7 (Core)
 Operating System:           linux
 Architecture:               amd64
 Container Runtime Version:  docker://18.6.3
 Kubelet Version:            v1.15.3
 Kube-Proxy Version:         v1.15.3
PodCIDR:                     10.244.2.0/24
Non-terminated Pods:         (3 in total) #节点上运行pod的资源的情况，除了nginx-demo之外还有多个pod
  Namespace                  Name                           CPU Requests  CPU Limits  Memory Requests  Memory Limits  AGE
  ---------                  ----                           ------------  ----------  ---------------  -------------  ---
  default                    nginx-demo                     250m (25%)    500m (50%)  128Mi (7%)       256Mi (14%)    63m
  kube-system                kube-flannel-ds-amd64-jp594    100m (10%)    100m (10%)  50Mi (2%)        50Mi (2%)      14d
  kube-system                kube-proxy-mh2gq               0 (0%)        0 (0%)      0 (0%)           0 (0%)         12d
Allocated resources:  #已经分配的cpu和memory的资源情况
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests     Limits
  --------           --------     ------
  cpu                350m (35%)   600m (60%)
  memory             178Mi (10%)  306Mi (17%)
  ephemeral-storage  0 (0%)       0 (0%)
Events:              <none>
```

## 1.2 资源分配原理

  Pod的定义的资源requests和limits作用于kubernetes的调度器kube-sheduler上，实际上cpu和内存定义的资源会应用在container上，通过容器上的cggroup实现资源的隔离作用，接下来我们介绍下资源分配的原理。

- spec.containers[].resources.requests.cpu       作用在CpuShares，表示分配cpu 的权重，争抢时的分配比例
- spec.containers[].resources.requests.memory 主要用于kube-scheduler调度器，对容器没有设置意义
- spec.containers[].resources.limits.cpu            作用CpuQuota和CpuPeriod，单位为微秒，计算方法为：CpuQuota/CpuPeriod，表示最大cpu最大可使用的百分比，如500m表示允许使用1个cpu中的50%资源
- spec.containers[].resources.limits.memory     作用在Memory，表示容器最大可用内存大小，超过则会OOM

以上面定义的nginx-demo为例，研究下pod中定义的requests和limits应用在docker生效的参数：

1、查看pod所在的node节点，nginx-demo调度到node-3节点上

```js
[root@node-1 ~]# kubectl get pods -o wide nginx-demo
NAME         READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
nginx-demo   1/1     Running   0          96m   10.244.2.13   node-3   <none>           <none>
```

2、获取容器的id号，可以通过kubectl describe pods nginx-demo的containerID获取到容器的id，或者登陆到node-3节点通过名称过滤获取到容器的id号，默认会有两个pod：一个通过pause镜像创建，另外一个通过应用镜像创建

```js
[root@node-3 ~]# docker container  list |grep nginx
55d28fdc9923        84581e99d807           "nginx -g 'daemon of…"   2 hours ago         Up 2 hours                                   k8s_nginx-demonginx-demo_default_66958ef7-507a-41cd-a688-7a4976c6a71e_0
2fe0498ea9b5        k8s.gcr.io/pause:3.1   "/pause"                 2 hours ago         Up 2 hours                                   k8s_POD_nginx-demo_default_66958ef7-507a-41cd-a688-7a4976c6a71e_0
```

3、查看docker容器详情信息

```js
[root@node-3 ~]# docker container inspect 55d28fdc9923
[
...部分输出省略...
    {
        "Image": "sha256:84581e99d807a703c9c03bd1a31cd9621815155ac72a7365fd02311264512656",
        "ResolvConfPath": "/var/lib/docker/containers/2fe0498ea9b5dfe1eb63eba09b1598a8dfd60ef046562525da4dcf7903a25250/resolv.conf",
        "HostConfig": {
            "Binds": [
                "/var/lib/kubelet/pods/66958ef7-507a-41cd-a688-7a4976c6a71e/volumes/kubernetes.io~secret/default-token-5qwmc:/var/run/secrets/kubernetes.io/serviceaccount:ro",
                "/var/lib/kubelet/pods/66958ef7-507a-41cd-a688-7a4976c6a71e/etc-hosts:/etc/hosts",
                "/var/lib/kubelet/pods/66958ef7-507a-41cd-a688-7a4976c6a71e/containers/nginx-demo/1cc072ca:/dev/termination-log"
            ],
            "ContainerIDFile": "",
            "LogConfig": {
                "Type": "json-file",
                "Config": {
                    "max-size": "100m"
                }
            },
            "UTSMode": "",
            "UsernsMode": "",
            "ShmSize": 67108864,
            "Runtime": "runc",
            "ConsoleSize": [
                0,
                0
            ],
            "Isolation": "",
            "CpuShares": 256,        CPU分配的权重，作用在requests.cpu上
            "Memory": 268435456,     内存分配的大小，作用在limits.memory上
            "NanoCpus": 0,
            "CgroupParent": "kubepods-burstable-pod66958ef7_507a_41cd_a688_7a4976c6a71e.slice",
            "BlkioWeight": 0,
            "BlkioWeightDevice": null,
            "BlkioDeviceReadBps": null,
            "BlkioDeviceWriteBps": null,
            "BlkioDeviceReadIOps": null,
            "BlkioDeviceWriteIOps": null,
            "CpuPeriod": 100000,    CPU分配的使用比例，和CpuQuota一起作用在limits.cpu上
            "CpuQuota": 50000,
            "CpuRealtimePeriod": 0,
            "CpuRealtimeRuntime": 0,
            "CpusetCpus": "",
            "CpusetMems": "",
            "Devices": [],
            "DeviceCgroupRules": null,
            "DiskQuota": 0,
            "KernelMemory": 0,
            "MemoryReservation": 0,
            "MemorySwap": 268435456,
            "MemorySwappiness": null,
            "OomKillDisable": false,
            "PidsLimit": 0,
            "Ulimits": null,
            "CpuCount": 0,
            "CpuPercent": 0,
            "IOMaximumIOps": 0,
            "IOMaximumBandwidth": 0,
        },   
    }
]
```

## 1.3. cpu资源测试

  pod中cpu的限制主要通过requests.cpu和limits.cpu来定义，limits是不能超过的cpu大小，我们通过stress镜像来验证，stress是一个cpu和内存的压侧工具，通过指定args参数的定义压侧cpu的大小。监控pod的cpu和内存可通过kubectl top的方式来查看，依赖于监控组件如metric-server或promethus，当前没有安装，我们通过docker stats的方式来查看。

1、通过stress镜像定义一个pod，分配0.25个cores和最大限制0.5个core使用比例

```js
[root@node-1 demo]# cat cpu-demo.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: cpu-demo
  namespace: default
  annotations: 
    kubernetes.io/description: "demo for cpu requests and"
spec:
  containers:
  - name: stress-cpu
    image: vish/stress
    resources:
      requests:
        cpu: 250m
      limits:
        cpu: 500m
    args:
    - -cpus
    - "1"
```

2、应用yaml文件生成pod

```js
[root@node-1 demo]# kubectl apply -f cpu-demo.yaml 
pod/cpu-demo created
```

3、查看pod资源分配详情

```js
[root@node-1 demo]# kubectl describe pods cpu-demo 
Name:         cpu-demo
Namespace:    default
Priority:     0
Node:         node-2/10.254.100.102
Start Time:   Sat, 28 Sep 2019 14:33:12 +0800
Labels:       <none>
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{"kubernetes.io/description":"demo for cpu requests and"},"name":"cpu-demo","nam...
              kubernetes.io/description: demo for cpu requests and
Status:       Running
IP:           10.244.1.14
Containers:
  stress-cpu:
    Container ID:  docker://14f93767ad37b92beb91e3792678f60c9987bbad3290ae8c29c35a2a80101836
    Image:         progrium/stress
    Image ID:      docker-pullable://progrium/stress@sha256:e34d56d60f5caae79333cee395aae93b74791d50e3841986420d23c2ee4697bf
    Port:          <none>
    Host Port:     <none>
    Args:
      -cpus
      1
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
      Started:      Sat, 28 Sep 2019 14:34:28 +0800
      Finished:     Sat, 28 Sep 2019 14:34:28 +0800
    Ready:          False
    Restart Count:  3
    Limits:         #cpu限制使用的比例
      cpu:  500m
    Requests:       #cpu请求的大小
      cpu:  250m
```

4、登陆到特定的node节点，通过docker container stats查看容器的资源使用详情
![limits.cpu资源使用率](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%85%AD)kubernetes%E8%B5%84%E6%BA%90%E7%AE%A1%E7%90%86%E5%92%8C%E6%9C%8D%E5%8A%A1%E8%B4%A8%E9%87%8F/1%20-%201620.jpg)


在pod所属的node上通过top查看，cpu的使用率限制百分比为50%。
![limits.cpu验证，宿主机上top查看cpu资源的使用率](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%85%AD)kubernetes%E8%B5%84%E6%BA%90%E7%AE%A1%E7%90%86%E5%92%8C%E6%9C%8D%E5%8A%A1%E8%B4%A8%E9%87%8F/2kj7ydd8yr.png)


通过上面的验证可以得出结论，我们在stress容器中定义使用1个core，通过limits.cpu限定可使用的cpu大小是500m，测试验证pod的资源已在容器内部或宿主机上都严格限制在50%（node机器上只有一个cpu，如果有2个cpu则会分摊为25%）。

## 1.4 memory资源测试

1、通过stress镜像测试验证requests.memory和limits.memory的生效范围，limits.memory定义容器可使用的内存资源大小，当超过内存设定的大小后容器会发生OOM，如下定义一个测试的容器，最大内存不能超过512M,使用stress镜像--vm-bytes定义压侧内存大小为256Mi

```js
[root@node-1 demo]# cat memory-demo.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: memory-stress-demo
  annotations:
    kubernetes.io/description: "stress demo for memory limits"
spec:
  containers:
  - name: memory-stress-limits
    image: polinux/stress
    resources:
      requests:
        memory: 128Mi
      limits:
        memory: 512Mi
    command: ["stress"]
    args: ["--vm", "1", "--vm-bytes", "256M", "--vm-hang", "1"]
```

2、应用yaml文件生成pod

```js
[root@node-1 demo]# kubectl apply -f memory-demo.yaml 
pod/memory-stress-demo created

[root@node-1 demo]# kubectl get pods memory-stress-demo -o wide 
NAME                 READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
memory-stress-demo   1/1     Running   0          41s   10.244.1.19   node-2   <none>           <none>
```

3、查看资源的分配情况

```js
[root@node-1 demo]# kubectl describe  pods memory-stress-demo
Name:         memory-stress-demo
Namespace:    default
Priority:     0
Node:         node-2/10.254.100.102
Start Time:   Sat, 28 Sep 2019 15:13:06 +0800
Labels:       <none>
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{"kubernetes.io/description":"stress demo for memory limits"},"name":"memory-str...
              kubernetes.io/description: stress demo for memory limits
Status:       Running
IP:           10.244.1.16
Containers:
  memory-stress-limits:
    Container ID:  docker://c7408329cffab2f10dd860e50df87bd8671e65a0f8abb4dae96d059c0cb6bb2d
    Image:         polinux/stress
    Image ID:      docker-pullable://polinux/stress@sha256:6d1825288ddb6b3cec8d3ac8a488c8ec2449334512ecb938483fc2b25cbbdb9a
    Port:          <none>
    Host Port:     <none>
    Command:
      stress
    Args:
      --vm
      1
      --vm-bytes
      256Mi
      --vm-hang
      1
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
      Started:      Sat, 28 Sep 2019 15:14:08 +0800
      Finished:     Sat, 28 Sep 2019 15:14:08 +0800
    Ready:          False
    Restart Count:  3
    Limits:          #内存限制大小
      memory:  512Mi
    Requests:         #内存请求大小
      memory:     128Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-5qwmc (ro)
```

4、查看容器内存资源的使用情况，分配256M内存，最大可使用为512Mi，利用率为50%，此时没有超过limits限制的大小，容器运行正常

![limits.memory限制](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%85%AD)kubernetes%E8%B5%84%E6%BA%90%E7%AE%A1%E7%90%86%E5%92%8C%E6%9C%8D%E5%8A%A1%E8%B4%A8%E9%87%8F/2%20-%201620.jpg)

5、当容器内部超过内存的大小会怎么样呢，我们将--vm-byte设置为513M，容器会尝试运行，超过内存后会OOM，kube-controller-manager会不停的尝试重启容器,RESTARTS的次数会不停的增加。

```js
[root@node-1 demo]# cat memory-demo.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: memory-stress-demo
  annotations:
    kubernetes.io/description: "stress demo for memory limits"
spec:
  containers:
  - name: memory-stress-limits
    image: polinux/stress
    resources:
      requests:
        memory: 128Mi
      limits:
        memory: 512Mi
    command: ["stress"]
    args: ["--vm", "1", "--vm-bytes", "520M", "--vm-hang", "1"] . #容器中使用内存为520M
  
查看容器的状态为OOMKilled，RESTARTS的次数不断的增加，不停的尝试重启
[root@node-1 demo]# kubectl get pods memory-stress-demo 
NAME                 READY   STATUS      RESTARTS   AGE
memory-stress-demo   0/1     OOMKilled   3          60s
```

# 2. Pod服务质量

  服务质量QOS（Quality of Service）主要用于pod调度和驱逐时参考的重要因素，不同的QOS其服务质量不同，对应不同的优先级，主要分为三种类型的Qos：

- BestEffort    尽最大努力分配资源，默认没有指定resource分配的Qos，优先级最低；
- Burstable     可波动的资源，至少需要分配到requests中的资源，常见的QOS；
- Guaranteed  完全可保障资源，requests和limits定义的资源相同，优先级最高。

## 2.1 BestEffort最大努力

1、Pod中没有定义resource，默认的Qos策略为BestEffort,优先级别最低，当资源比较进展是需要驱逐evice时，优先驱逐BestEffort定义的Pod，如下定义一个BestEffort的Pod

```js
[root@node-1 demo]# cat nginx-qos-besteffort.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-qos-besteffort
  labels:
    name: nginx-qos-besteffort
spec:
  containers:
  - name: nginx-qos-besteffort
    image: nginx:1.7.9
    imagePullPolicy: IfNotPresent
    ports:
    - name: nginx-port-80
      protocol: TCP
      containerPort: 80
    resources: {}
```

2、创建pod并查看Qos策略，qosClass为BestEffort

```js
[root@node-1 demo]# kubectl apply -f nginx-qos-besteffort.yaml 
pod/nginx-qos-besteffort created

查看Qos策略
[root@node-1 demo]# kubectl get pods nginx-qos-besteffort -o yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"name":"nginx-qos-besteffort"},"name":"nginx-qos-besteffort","namespace":"default"},"spec":{"containers":[{"image":"nginx:1.7.9","imagePullPolicy":"IfNotPresent","name":"nginx-qos-besteffort","ports":[{"containerPort":80,"name":"nginx-port-80","protocol":"TCP"}],"resources":{}}]}}
  creationTimestamp: "2019-09-28T11:12:03Z"
  labels:
    name: nginx-qos-besteffort
  name: nginx-qos-besteffort
  namespace: default
  resourceVersion: "1802411"
  selfLink: /api/v1/namespaces/default/pods/nginx-qos-besteffort
  uid: 56e4a2d5-8645-485d-9362-fe76aad76e74
spec:
  containers:
  - image: nginx:1.7.9
    imagePullPolicy: IfNotPresent
    name: nginx-qos-besteffort
    ports:
    - containerPort: 80
      name: nginx-port-80
      protocol: TCP
    resources: {}
    terminationMessagePath: /dev/termination-log
...省略...
status:
  hostIP: 10.254.100.102
  phase: Running
  podIP: 10.244.1.21
  qosClass: BestEffort  #Qos策略
  startTime: "2019-09-28T11:12:03Z"
```

3、删除测试Pod

```js
[root@node-1 demo]# kubectl delete pods nginx-qos-besteffort 
pod "nginx-qos-besteffort" deleted
```

## 2.2 Burstable可波动

1、Pod的服务质量为Burstable，仅次于Guaranteed的服务质量，至少需要一个container定义了requests，且requests定义的资源小于limits资源

```js
[root@node-1 demo]# cat nginx-qos-burstable.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-qos-burstable
  labels:
    name: nginx-qos-burstable
spec:
  containers:
  - name: nginx-qos-burstable
    image: nginx:1.7.9
    imagePullPolicy: IfNotPresent
    ports:
    - name: nginx-port-80
      protocol: TCP
      containerPort: 80
    resources: 
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

2、应用yaml文件生成pod并查看Qos类型

```js
[root@node-1 demo]# kubectl apply -f nginx-qos-burstable.yaml 
pod/nginx-qos-burstable created

查看Qos类型
[root@node-1 demo]# kubectl describe pods nginx-qos-burstable 
Name:         nginx-qos-burstable
Namespace:    default
Priority:     0
Node:         node-2/10.254.100.102
Start Time:   Sat, 28 Sep 2019 19:27:37 +0800
Labels:       name=nginx-qos-burstable
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"name":"nginx-qos-burstable"},"name":"nginx-qos-burstable","namespa...
Status:       Running
IP:           10.244.1.22
Containers:
  nginx-qos-burstable:
    Container ID:   docker://d1324b3953ba6e572bfc63244d4040fee047ed70138b5a4bad033899e818562f
    Image:          nginx:1.7.9
    Image ID:       docker-pullable://nginx@sha256:e3456c851a152494c3e4ff5fcc26f240206abac0c9d794affb40e0714846c451
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Sat, 28 Sep 2019 19:27:39 +0800
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     200m
      memory:  256Mi
    Requests:
      cpu:        100m
      memory:     128Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-5qwmc (ro)
Conditions:
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:
  default-token-5qwmc:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-5qwmc
    Optional:    false
QoS Class:       Burstable  #服务质量是可波动的Burstable
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/not-ready:NoExecute for 300s
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  95s   default-scheduler  Successfully assigned default/nginx-qos-burstable to node-2
  Normal  Pulled     94s   kubelet, node-2    Container image "nginx:1.7.9" already present on machine
  Normal  Created    94s   kubelet, node-2    Created container nginx-qos-burstable
  Normal  Started    93s   kubelet, node-2    Started container nginx-qos-burstable
```

## 2.3 Guaranteed完全保障

1、resource中定义的cpu和memory必须包含有requests和limits，切requests和limits的值必须相同，其优先级别最高，当出现调度和驱逐时优先保障该类型的Qos,如下定义一个nginx-qos-guaranteed的容器，requests.cpu和limits.cpu相同，同理requests.memory和limits.memory.

```js
[root@node-1 demo]# cat nginx-qos-guaranteed.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nginx-qos-guaranteed
  labels:
    name: nginx-qos-guaranteed
spec:
  containers:
  - name: nginx-qos-guaranteed
    image: nginx:1.7.9
    imagePullPolicy: IfNotPresent
    ports:
    - name: nginx-port-80
      protocol: TCP
      containerPort: 80
    resources: 
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

2、应用yaml文件生成pod并查看pod的Qos类型为可完全保障Guaranteed

```js
[root@node-1 demo]# kubectl apply -f nginx-qos-guaranteed.yaml 
pod/nginx-qos-guaranteed created

[root@node-1 demo]# kubectl describe pods nginx-qos-guaranteed 
Name:         nginx-qos-guaranteed
Namespace:    default
Priority:     0
Node:         node-2/10.254.100.102
Start Time:   Sat, 28 Sep 2019 19:37:15 +0800
Labels:       name=nginx-qos-guaranteed
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"name":"nginx-qos-guaranteed"},"name":"nginx-qos-guaranteed","names...
Status:       Running
IP:           10.244.1.23
Containers:
  nginx-qos-guaranteed:
    Container ID:   docker://cf533e0e331f49db4e9effb0fbb9249834721f8dba369d281c8047542b9f032c
    Image:          nginx:1.7.9
    Image ID:       docker-pullable://nginx@sha256:e3456c851a152494c3e4ff5fcc26f240206abac0c9d794affb40e0714846c451
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Sat, 28 Sep 2019 19:37:16 +0800
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     200m
      memory:  256Mi
    Requests:
      cpu:        200m
      memory:     256Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-5qwmc (ro)
Conditions:
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:
  default-token-5qwmc:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-5qwmc
    Optional:    false
QoS Class:       Guaranteed #服务质量为可完全保障Guaranteed
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/not-ready:NoExecute for 300s
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  25s   default-scheduler  Successfully assigned default/nginx-qos-guaranteed to node-2
  Normal  Pulled     24s   kubelet, node-2    Container image "nginx:1.7.9" already present on machine
  Normal  Created    24s   kubelet, node-2    Created container nginx-qos-guaranteed
  Normal  Started    24s   kubelet, node-2    Started container nginx-qos-guaranteed
```

# 写在最后

  本章是[**kubernetes系列教程**](#)第六篇文章，通过介绍resource资源的分配和服务质量Qos，关于resource有节点使用建议：

- requests和limits资源定义推荐不超过1:2，避免分配过多资源而出现资源争抢，发生OOM；
- pod中默认没有定义resource，推荐给namespace定义一个limitrange，确保pod能分到资源；
- 防止node上资源过度而出现机器hang住或者OOM，建议node上设置保留和驱逐资源，如保留资源--system-reserved=cpu=200m,memory=1G，驱逐条件--eviction hard=memory.available<500Mi。

# 附录

容器计算资源管理：https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/

pod内存资源管理：https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/

pod cpu资源管理：https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/

服务质量QOS：https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/

Docker关于CPU的限制：https://www.cnblogs.com/sparkdev/p/8052522.html

> 『 转载 』该文章来源于网络，侵删。 
