---
title: "09 初识Pod存储管理"
date: 2019-08-04T10:36:48+08:00
lastmod: 2019-08-04T10:36:48+08:00
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

上一篇文章中[kubernetes系列教程（八）Pod健康检查机制](#)介绍了kubernetes中Pod健康检查机制，通过实战介绍了kubernetes中两种健康检查探针：livenessProbe存活检查，readinessProbe就绪检查，存活检查用于检查应用的可用性，就绪检查用于检查容器是否准备接受流量，健康检查包含三种探测的方法：exec命令行探测，tcpSocket端口检测，httpGet请求检测，分别适用于不同场景下的健康检查。接下来介绍[kubernetes系列教程](#)pod的存储管理。

  kubernetes存储管理按照发展的历程，涉及到有Volume，PV(Persistent Volume)和PVC(PersistentVolumeClaims),和StorageClass，Volume是最早提出的存储卷，主要解决容器和数据存储的依赖关系，抽象底层驱动以支持不同的存储类型；使用Volume需要了解底层存储细节，因此提出了PV，Persistent Volume是由k8s管理员定义的存储单元，应用端使用PersistentVolumeClaims声明去调用PV存储，进一步抽象了底层存储；随着PV数量的增加，管理员需要不停的定义PV的数量，衍生了通过StorageClass动态生成PV，StorageClass通过PVC中声明存储的容量，会调用底层的提供商生成PV。本文介绍Volume的使用，下篇文章介绍PV，PVC和StorageClass。

- Volume    存储卷，独立于容器，后端和不同的存储驱动对接
- PV           Persistent Volume持久化存储卷，和node类似，是一种集群资源，由管理员定义，对接不同的存储
- PVC        PersistentVolumeClaims持久化存储声明，和pod类似，作为PV的使用者
- StorageClass  动态存储类型，分为静态和动态两种类型，通过在PVC中定义存储类型，自动创建所需PV

# 1. kubernetes存储管理

## 1.1 存储概述

  kubernetes容器中的数据是临时的，即当重启重启或crash后容器的数据将会丢失，此外容器之间有共享存储的需求，所以kubernetes中提供了volume存储的抽象，volume后端能够支持多种不同的plugin驱动，通过.spec.volumes中定义一个存储，然后在容器中.spec.containers.volumeMounts调用，最终在容器内部以目录的形式呈现。

  kubernetes内置能支持多种不同的驱动类型，大体上可以分为四种类型：1. 公/私有云驱动接口，如awsElasticBlockStore实现与aws EBS集成，2. 开源存储驱动接口，如ceph rbd，实现与ceph rb块存储对接，3. 本地临时存储，如hostPath，4. kubernetes对象API驱动接口，实现其他对象调用，如configmap，每种存储支持不同的驱动，如下介绍：

1. 公/私有云驱动接口

- awsElasticBlockStore  AWS的EBS云盘
- azureDisk                  微软azure云盘
- azureFile                   微软NAS存储
- gcePersistentDisk      google云盘
- cinder                      openstack cinder云盘
- vsphereVolume         VMware的VMFS存储
- scaleIO                    EMC分布式存储

1. 开源存储驱动接口

- ceph rbd                  ceph块存储
- cephfs                     ceph文件存储
- glusterfs                  glusterfs存储
- nfs                           nfs文件
- iscsi
- flexvolume              
- csi                           社区标准化驱动
- flocker

1. 本地临时存储

- hostpath                 宿主机文件
- emptyDir                 临时目录

1. kubernetes对象API驱动接口

- configMap               调用configmap对象，注入配置文件
- secrets                    调用secrets对象，注入秘文配置文件
- persistentVolumeClaim  通过pvc调用存储
- downloadAPI            下载URL
- projected

## 1.2 emptyDir临时存储

 emptyDir是一种临时存储，pod创建的时候会在node节点上为容器申请一个临时的目录，跟随容器的生命周期，如容器删除，emptyDir定义的临时存储空间也会随之删除，容器发生意外crash则不受影响，同时如果容器发生了迁移，其上的数据也会丢失，emptyDir一般用于测试，或者缓存场景。

1. 定义一个emptyDir存储大小为1G，将其挂载到redis的/data目录中

```js
[root@node-1 happylau]# cat emptydir-redis.yaml
apiVersion: v1
kind: Pod
metadata:
  name: emptydir-redis
  labels:
    volume: emptydir
  annotations:
    kubernetes.io/storage: emptyDir
spec:
  containers:
  - name: emptydir-redis
    image: redis:latest
    imagePullPolicy: IfNotPresent
    ports:
    - name: redis-6379-port
      protocol: TCP
      containerPort: 6379
    volumeMounts: #将定义的驱动emptydir-redis挂载到容器的/data目录，通过名字方式关联
    - name: emptydir-redis
      mountPath: /data
  volumes:        #定义一个存储，驱动类型为emptyDir，大小1G
  - name: emptydir-redis
    emptyDir: 
      sizeLimit: 1Gi
```

1. 生成redis pod,并查看describe pod的详情信息

```js
[root@node-1 happylau]# kubectl apply -f emptydir-redis.yaml 
pod/emptydir-redis created

执行kubectl describe pods emptydir-redis查看容器的存储挂载信息
Containers:
  emptydir-redis:
    Container ID:   docker://dddd9f3d0e395d784c08b712631d2b0c259bfdb30b0c655a0fc8021492f1ecf9
    Image:          redis:latest
    Image ID:       docker-pullable://redis@sha256:cb379e1a076fcd3d3f09e10d7b47ca631fb98fb33149ab559fa02c1b11436345
    Port:           6379/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Tue, 01 Oct 2019 11:04:30 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:   #挂载信息，将emptydir-redis挂载到/data目录，且是rw读写状态
      /data from emptydir-redis (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-5qwmc (ro)
Conditions:
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:       #定义了一个EmptyDir类型的存储，大小为1Gi
  emptydir-redis:
    Type:       EmptyDir (a temporary directory that shares a pod's lifetime)
    Medium:     
    SizeLimit:  1Gi
  default-token-5qwmc:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-5qwmc
    Optional:    false
```

1. 向redis中写入数据

```js
获取pod的ip地址
[root@node-1 happylau]# kubectl get pods emptydir-redis -o wide 
NAME             READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
emptydir-redis   1/1     Running   1          17m   10.244.1.27   node-2   <none>           <none>


安装客户端redis-cli
[root@node-1 ~]# yum install redis

向redis中写入两个key
10.244.1.27:6379> set volume emptydir
OK
10.244.1.27:6379> set username happylauliu
OK
10.244.1.27:6379> get volume
"emptydir"
10.244.1.27:6379> get username
"happylauliu"
```

1. 登陆到pod中安装一个查看进程的工具procps，进程一般为1，如下图redis-server进程，可以直接kill，进程被kill后kubelet会自动将进程重启

```js
登陆容器
[root@node-1 ~]# kubectl exec -it emptydir-redis /bin/bash

安装软件
root@emptydir-redis:/data# apt-get update ; apt-get install procps

可以通过top查看进程，进程号一般为1
root@emptydir-redis:/data# kill 1
```

![redis-server进程](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B9%9D%EF%BC%89%E5%88%9D%E8%AF%86Pod%E5%AD%98%E5%82%A8%E7%AE%A1%E7%90%86/1%20-%201620.jpg)

1. pod异常重启后，再次登录redis并查看redis中的数据内容，发现数据没有丢失。

```js
[root@node-1 ~]# redis-cli -h 10.244.1.27
10.244.1.27:6379> get volume
"emptydir"
10.244.1.27:6379> get username
"happylauliu"
```

1. emptyDir实际是宿主机上创建的一个目录，将目录以bind mount的形势挂载到容器中，跟随容器的生命周期

```js
[root@node-2 ~]# docker container  list |grep redis
e0e9a6b0ed77        01a52b3b5cd1            "docker-entrypoint.s…"   20 minutes ago      Up 20 minutes                           k8s_emptydir-redis_emptydir-redis_default_4baadb25-1e62-4cf5-9724-821d04dcdd44_2
dfef32905fe5        k8s.gcr.io/pause:3.1    "/pause"                 45 minutes ago      Up 45 minutes                           k8s_POD_emptydir-redis_default_4baadb25-1e62-4cf5-9724-821d04dcdd44_0
```

docker container inspect e0e9a6b0ed77查看存储内容如下图：

![empty存储mount信息](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B9%9D%EF%BC%89%E5%88%9D%E8%AF%86Pod%E5%AD%98%E5%82%A8%E7%AE%A1%E7%90%86/2%20-%201620.jpg)

查看目录的信息：

```js
[root@node-2 ~]# ls -l /var/lib/kubelet/pods/4baadb25-1e62-4cf5-9724-821d04dcdd44/volumes/kubernetes.io~empty-dir/emptydir-redis
总用量 4
-rw-r--r-- 1 polkitd input 156 10月  8 14:55 dump.rdb
```

1. Pod删除后，volume的信息也随之删除

```js
[root@node-1 ~]# kubectl delete pods emptydir-redis 
pod "emptydir-redis" deleted
[root@node-1 ~]# ssh node-2
Last login: Tue Oct  8 15:15:41 2019 from 10.254.100.101
[root@node-2 ~]# ls -l /var/lib/kubelet/pods/4baadb25-1e62-4cf5-9724-821d04dcdd44/volumes/kubernetes.io~empty-dir/emptydir-redis
ls: 无法访问/var/lib/kubelet/pods/4baadb25-1e62-4cf5-9724-821d04dcdd44/volumes/kubernetes.io~empty-dir/emptydir-redis: 没有那个文件或目录
```

**小结**：emptyDir是host上定义的一块临时存储，通过bind mount的形式挂载到容器中使用，容器重启数据会保留，容器删除则volume会随之删除。

## 1.3 hostPath主机存储

与emptyDir类似，hostpath支持将node节点的目录或文件挂载到容器中使用，用于单机测试场景，此外适用于一些容器业务需要访问宿主机目录，如监控系统访问/proc和/sys目录，日志系统访问/var/lib/docker目录的一些场景。支持设置不同的type类型

- Directory              本地存在的目录
- DirectoryOrCreate 目录，如果不存在则创建，权限设置为755，属主和组设置和kubelet一致
- File                      本地存在文件
- FileOrCreate         文件，如果不存在则创建，权限设置为644，属主和组设置和kubelet一致
- Socket                 本地已存在Socket文件
- CharDevice          本地已存在的Char字符设备
- BlockDevice         本地已存在的Block块设备

1. 挂载本地/mnt目录到容器中

```js
[root@node-1 happylau]# cat hostpath-demo.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-demo
  labels:
    storage: hostpath
  annotations:
    kubernetes.io/storage: hostpath
spec:
  containers:
  - name: nginx
    image: nginx:latest
    imagePullPolicy: IfNotPresent
    ports:
    - name: nginx-http-port
      protocol: TCP
      containerPort: 80
    volumeMounts: #挂载到nginx的web站点目录下
    - name: hostpath-demo
      mountPath: /usr/share/nginx/html
  volumes:  #定一个hostPath本地的存储
  - name: hostpath-demo
    hostPath:
      type: DirectoryOrCreate
      path: /mnt/data
```

1. 生成nginx容器和web站点数据

```js
[root@node-1 happylau]# kubectl apply -f hostpath-demo.yaml 
pod/hostpath-demo created

获取pod所在的node节点
[root@node-1 happylau]# kubectl get pods hostpath-demo -o wide 
NAME            READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
hostpath-demo   1/1     Running   0          31s   10.244.2.24   node-3   <none>           <none>

生成web站点的数据
[root@node-1 happylau]# ssh node-3
Last login: Tue Oct  8 22:49:14 2019 from 10.254.100.101
[root@node-3 ~]# echo "hostPath test page" >/mnt/data/index.html
[root@node-3 ~]# curl http://10.244.2.24
hostPath test page
```

1. 查看容器挂载存储的情况，以bind mount的形式挂载到容器中

![hostPath的容器挂载信息](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B9%9D%EF%BC%89%E5%88%9D%E8%AF%86Pod%E5%AD%98%E5%82%A8%E7%AE%A1%E7%90%86/3%20-%201620.jpg)

1. 模拟容器重启的的故障，容器重启后volume中的数据依保留

```js
#docker层面kill掉进程
[root@node-3 ~]# docker container  list |grep hostpath
39a7e21afebb        f949e7d76d63           "nginx -g 'daemon of…"   11 minutes ago      Up 11 minutes                                k8s_nginx_hostpath-demo_default_6da41e3d-8585-4997-bf90-255ca0948030_0
490f50108e41        k8s.gcr.io/pause:3.1   "/pause"                 11 minutes ago      Up 11 minutes                                k8s_POD_hostpath-demo_default_6da41e3d-8585-4997-bf90-255ca0948030_0
[root@node-3 ~]# docker container kill 39a7e21afebb
39a7e21afebb
[root@node-3 ~]# exit
登出


#获取pod的地址，通过RESTART可知，容器重启过一次，测试数据依旧保留
[root@node-1 happylau]# kubectl get pods -o wide  hostpath-demo 
NAME                                   READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
hostpath-demo                          1/1     Running   1          12m   10.244.2.24   node-3   <none>           <none>
[root@node-1 happylau]# curl http://10.244.2.24
hostPath test page
```

**小结**：hostPath与emptyDir类似提供临时的存储，hostPath适用于一些容器需要访问宿主机目录或文件的场景，对于数据持久化而言都不是很好的实现方案。

## 1.4  NFS存储对接

NFS是实现Network File System网络文件共享的NAS存储，kubernetes与NFS对接实现存储的共享，当容器删除不影响存储且可以实现跨机存储共享，本文以搭建一个NFS存储实现kubernetes对接。

1. 准备一个nfs server共享，将node-1的/mnt/data目录共享

```js
安装nfs服务
[root@node-1 ~]# yum install nfs-utils -y

配置nfs共享,提前创建好目录
[root@node-1 ~]# cat /etc/exports
/mnt/data	10.254.100.0/24(rw)

重启并验证
[root@node-1 ~]# systemctl restart nfs
[root@node-1 ~]# showmount -e node-1
Export list for node-1:
/mnt/data 10.254.100.0/24
```

1. kubernets使用nfs的驱动对接

```js
[root@node-1 happylau]# cat nfs-demo.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: nfs-demo 
  labels:
    storage: nfs 
  annotations:
    kubernetes.io/storage: nfs
spec:
  containers:
  - name: nginx
    image: nginx:latest
    imagePullPolicy: IfNotPresent
    ports:
    - name: nginx-http-port
      protocol: TCP
      containerPort: 80
    volumeMounts: #挂载到nfs的目录下
    - name: nfs-demo 
      mountPath: /usr/share/nginx/html
  volumes: #定义一个nfs驱动的存储
  - name: nfs-demo
    nfs:
      server: 10.254.100.101
      path: /mnt/data
```

1. 生成pod，使用kubectl get pods的时候提示events中报错信息，挂载失败

```js
Events:
  Type     Reason       Age   From               Message
  ----     ------       ----  ----               -------
  Normal   Scheduled    40s   default-scheduler  Successfully assigned default/nfs-demo to node-2
  Warning  FailedMount  39s   kubelet, node-2    MountVolume.SetUp failed for volume "nfs-demo" : mount failed: exit status 32
Mounting command: systemd-run
Mounting arguments: --description=Kubernetes transient mount for /var/lib/kubelet/pods/78bf6a81-082d-4d6c-a163-75241bf21cde/volumes/kubernetes.io~nfs/nfs-demo --scope -- mount -t nfs 10.254.100.101:/mnt/data /var/lib/kubelet/pods/78bf6a81-082d-4d6c-a163-75241bf21cde/volumes/kubernetes.io~nfs/nfs-demo
Output: Running scope as unit run-29843.scope.
mount: wrong fs type, bad option, bad superblock on 10.254.100.101:/mnt/data,
       missing codepage or helper program, or other error
       (for several filesystems (e.g. nfs, cifs) you might
       need a /sbin/mount.<type> helper program)
```

1. 从上面的步骤中得知，宿主机挂载nfs的时候提示没有mount.nfs的命令，因此需要在所有的node节点上安装上nfs的客户端软件nfs-utils,以node-2为例，其他节点类似

```js
[root@node-1 happylau]# ssh node-2
Last login: Tue Oct  8 15:22:04 2019 from 10.254.100.101
[root@node-2 ~]# yum install nfs-utils -y
```

1. 测试站点数据

```js
[root@node-1 happylau]# kubectl get pods nfs-demo -o wide 
NAME       READY   STATUS    RESTARTS   AGE     IP            NODE     NOMINATED NODE   READINESS GATES
nfs-demo   1/1     Running   0          4m41s   10.244.1.28   node-2   <none>           <none>
[root@node-1 happylau]# echo "nfs test age" >/mnt/data/index.html
[root@node-1 happylau]# curl http://10.244.1.28
nfs test age
```

1. 删除pod后查看nfs共享的数据情况,原有数据依旧保留

```js
[root@node-1 happylau]# kubectl delete pods nfs-demo 
pod "nfs-demo" deleted

[root@node-1 happylau]# mount.nfs node-1:/mnt/data/ /media/
[root@node-1 happylau]# ls -l /media/
总用量 4
-rw-r--r-- 1 root root 13 10月  8 23:26 index.html
```

## 1.5 TKE使用volume存储

TKE支持在创建Workload时如Deployments，DaemonSets，StatefulSets等指定存储卷，支持临时目录emptyDir，主机路径hostPath，nfs盘，pvc，云硬盘，configmap，secrets，此处以腾讯云CFS为例（提前在CFS中创建好存储，确保CFS和容器宿主机在同一个VPC网络内）。

1. 创建存储卷，使用NFS挂载腾讯云CFS存储

![TKE创建nfs的volume](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B9%9D%EF%BC%89%E5%88%9D%E8%AF%86Pod%E5%AD%98%E5%82%A8%E7%AE%A1%E7%90%86/4%20-%201620.jpg)

1. Pod中使用存储，通过volume-nfs-demo名字调用存储卷

![TKE中pod使用volume存储](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B9%9D%EF%BC%89%E5%88%9D%E8%AF%86Pod%E5%AD%98%E5%82%A8%E7%AE%A1%E7%90%86/5%20-%201620.jpg)

1. 对应生成的yaml文件内容如下

```js
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
    description: demo
  creationTimestamp: "2019-10-08T15:45:18Z"
  generation: 1
  labels:
    k8s-app: the-volume-demo
    qcloud-app: the-volume-demo
  name: the-volume-demo
  namespace: default
  resourceVersion: "618380753"
  selfLink: /apis/apps/v1beta2/namespaces/default/deployments/the-volume-demo
  uid: a0fc4600-e9e2-11e9-b3f4-decf0ef369cf
spec:
  minReadySeconds: 10
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      k8s-app: the-volume-demo
      qcloud-app: the-volume-demo
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        k8s-app: the-volume-demo
        qcloud-app: the-volume-demo
    spec:
      containers:
      - image: nginx:latest
        imagePullPolicy: Always
        name: nginx-demo
        resources:
          limits:
            cpu: 500m
            memory: 1Gi
          requests:
            cpu: 250m
            memory: 256Mi
        securityContext:
          privileged: false
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts: #挂载到pod中
        - mountPath: /usr/share/nginx/html
          name: volume-nfs-demo
      dnsPolicy: ClusterFirst
      imagePullSecrets:
      - name: qcloudregistrykey
      - name: tencenthubkey
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
      volumes: #CFS存储
      - name: volume-nfs-demo
        nfs:
          path: /
          server: 10.66.200.7
```

# 写在最后

本文介绍了kubernetes存储中最基本volume的使用，介绍了volume支持多种不同驱动，以实际案例介绍emptyDir，hostPath，nfs驱动的对接，并介绍了TKE下volume功能的使用。由于volume需要知道底层存储的细节，不便于广泛使用，后来衍生为PV，管理员定义PV实现和底层存储对接，用户通过PVC使用PV，下节我们将介绍PV/PVC和StorageClass的使用。

# 参考文献

volume管理：https://kubernetes.io/docs/concepts/storage/volumes/

pod中使用volume：https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/

> 『 转载 』该文章来源于网络，侵删。 

