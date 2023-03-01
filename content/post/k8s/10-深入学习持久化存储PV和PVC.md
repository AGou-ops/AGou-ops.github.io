---
title: "10 深入学习持久化存储PV和PVC"
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

上一篇文章中[kubernetes系列教程（九）初识Pod存储管理](#)介绍了kubernetes中存储Volume的使用，volume支持多种不同的内置驱动，使用volumes需要知道后端驱动的细节，使用起来不方便，因此社区提出了PV概念，即通过管理员定义好PV，通过PVC使用PV；随着PV数量的不断增加，管理员需要频繁定义PV，因此提出了动态存储StorageClass，通过PVC中调用StorageClass动态创建PV，接下来介绍[kubernetes系列教程](#)高级进阶PV/PVC。

# 1. PV与PVC存储

## 1.1 PV概念介绍

- PV即PersistentVolume持久化存储，是管理员定义的一块存储空间，能抽象化底层存储细节，和node类似，PV是集群级别的资源，生命周期独立于Pod，支持静态创建和动态创建，动态创建需通过StorageClass。
- PVC即PersistentVolumeClaim持久化存储申明，作为PV资源的使用方，可以指定请求存储容量大小和访问模式
- StorageClass，存储类型支持创建PV，通过在PVC中指定StorageClass可动态创建PV，且支持指定不同的存储

![PV/PVC概念介绍](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0%E6%8C%81%E4%B9%85%E5%8C%96%E5%AD%98%E5%82%A8PV%E5%92%8CPVC/1%20-%201620.jpg)

PV支持设置字段介绍：

- Capacity    存储的特性，当前只支持通过capacity指定存储大小，未来会支持IOPS，吞吐量等指标
- VolumeMode  存储卷的类型，默认为filesystem，如果是块设备指定为block
- Class  通过storageClassName指定静态StorageClass的名称
- Reclaim Policy 回收策略，支持Retain保留，Recycle回收，DELETE删除
- Volume驱动类型，和上一篇文章介绍的类似，支持不同的plugin驱动如RBD，NFS
- Mount Options  挂载模式，支持管理员定义不同的挂载选项
- AccessMode  访问模式，指定node的挂载方式，支持ReadWriteOnce读写挂载一次，ReadOnlyMany多个节点挂载只读模式，ReadWriteMany多个节点挂载读写模式，不同的volume驱动类型支持的模式有所不同，如下

![PV支持的不同AccessMode](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0%E6%8C%81%E4%B9%85%E5%8C%96%E5%AD%98%E5%82%A8PV%E5%92%8CPVC/2%20-%201620.jpg)

## 1.2 定义PV存储

接下来我们开始学习PV的使用，使用阶段分为：1. 预先创建好PV，2. 用户通过PVC调用PV，3. Pod中应用PVC，创建流程参考下图：

![PV和PVC使用过程](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0%E6%8C%81%E4%B9%85%E5%8C%96%E5%AD%98%E5%82%A8PV%E5%92%8CPVC/3%20-%201620.jpg)

\1. 定义一个PV，指定大小为10G，读写模式为单个node读写，回收模式为Retain，后端驱动plugin为NFS

```js
[root@node-1 happylau]# cat pv-nfs-storage.yaml 
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs-storage 
  labels:
    storage: nfs
  annotations:
    kubernetes.io.description: pv-storage
spec:
  storageClassName: nfs  #静态指定存储类StorageClass名称
  capacity:              #capacity指定存储容量大小
    storage: 10Gi        
  accessModes:           #访问模式为单个节点读写模式
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain  #回收模式为保留
  nfs:                  #后端plugin驱动类型为NFS，指定server和path路径
    server: 10.254.100.101
    path: /mnt/data
```

\2. 创建PersistentVolumes

```js
[root@node-1 happylau]# kubectl apply -f pv-nfs-storage.yaml 
persistentvolume/pv-nfs-storage unchanged
```

\3. 查看PersistentVolumes列表

```js
[root@node-1 happylau]# kubectl get persistentvolumes 
NAME             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE
pv-nfs-storage   10Gi       RWO            Retain           Available           nfs                     43m
```

关于PV输出解释说明：

1. ACCESS MODES 指定的是读写模式，RWO代表ReadWriteOnce，ROM代表ReadOnlyMany，RWX代表ReadWriteMany
2. STATUS代表PV状态，Available刚创建未绑定状态，Bound为与PVC绑定，Released为PVC删除PV未释放，Failed状态异常。

\4. 查看PV详细信息,呈现的信息会更详细

```js
[root@node-1 ~]# kubectl describe persistentvolumes pv-nfs-storage 
Name:            pv-nfs-storage
Labels:          storage=nfs
Annotations:     kubectl.kubernetes.io/last-applied-configuration:
                   {"apiVersion":"v1","kind":"PersistentVolume","metadata":{"annotations":{"kubernetes.io.description":"pv-storage"},"labels":{"storage":"nfs...
                 kubernetes.io.description: pv-storage
Finalizers:      [kubernetes.io/pv-protection]
StorageClass:    nfs
Status:          Available
Claim:           
Reclaim Policy:  Retain
Access Modes:    RWO
VolumeMode:      Filesystem
Capacity:        10Gi
Node Affinity:   <none>
Message:         
Source:
    Type:      NFS (an NFS mount that lasts the lifetime of a pod)
    Server:    10.254.100.101
    Path:      /mnt/data
    ReadOnly:  false
Events:        <none>
```

## 1.3. PVC引用PV

\1. 通过定义PVC，通过selector和PV实现关联，指定到相同的StorageClass

```js
[root@node-1 happylau]# cat pvc-nfs-storage.yaml 
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-nfs-storage
  labels:
    storage: pvc
  annotations:
    kubernetes.io/description: "PersistentVolumeClaim for PV"
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  storageClassName: nfs
  resources:
    requests:
      storage: 1Gi
    limits:
      storage: 10Gi
  selector:
    matchLabels:
      storage: nfs
```

\2. 生成PersistentVolumeClaim

```js
[root@node-1 happylau]# kubectl apply -f pvc-nfs-storage.yaml 
persistentvolumeclaim/pvc-nfs-storage created
```

\3. 查看PersistentVolumeClaim列表,通过STATUS可以知道，当前PVC和PV已经Bond关联

```js
[root@node-1 happylau]# kubectl get persistentvolumeclaims 
NAME              STATUS   VOLUME           CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc-nfs-storage   Bound    pv-nfs-storage   10Gi       RWO            nfs   

查看PVC详情：
[root@node-1 happylau]# kubectl describe persistentvolumeclaims pvc-nfs-storage 
Name:          pvc-nfs-storage
Namespace:     default
StorageClass:  nfs
Status:        Bound
Volume:        pv-nfs-storage
Labels:        storage=pvc
Annotations:   kubectl.kubernetes.io/last-applied-configuration:
                 {"apiVersion":"v1","kind":"PersistentVolumeClaim","metadata":{"annotations":{"kubernetes.io/description":"PersistentVolumeClaim for PV"},"...
               kubernetes.io/description: PersistentVolumeClaim for PV
               pv.kubernetes.io/bind-completed: yes
               pv.kubernetes.io/bound-by-controller: yes
Finalizers:    [kubernetes.io/pvc-protection]
Capacity:      10Gi
Access Modes:  RWO
VolumeMode:    Filesystem
Mounted By:    <none>
Events:        <none>        
```

\4. 再次查看PV的状态，此时状态为Bond，和default命名空间下的PVC pvc-nfs-storage关联,此时PVC已经定义好

![PV和PVC绑定状态详情](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0%E6%8C%81%E4%B9%85%E5%8C%96%E5%AD%98%E5%82%A8PV%E5%92%8CPVC/4%20-%201620.jpg)

## 1.4 Pod引用PVC

PV和PVC定义好后，需要在Pod中引用定义的存储，引用方式和之前定义的类似，spec.containers.volumeMounts在Pod中引用定义的存储，前面的文章中我们直接通过Pod调用，本文案例通过将Pod以Template的形式定义封装在Deployment的控制器中，下篇文章我们再深入介绍Deployment，ReplicaSet，StatefulSet等副本控制器。

\1. 定义一个Deployments，通过deployment.spec.template.spec应用Pod,在volumes中调用PVC存储，volumeMounts将存储挂载到指定目录。

```js
[root@node-1 happylau]# cat pvc-nfs-deployments.yaml 
apiVersion: apps/v1 
kind: Deployment
metadata:  #deployment的元数据
  name: pvc-nfs-deployment
  labels:
    app: pvc-nfs-deployment
spec:      #deployment的属性信息
  replicas: 1  #副本控制数
  selector:
    matchLabels:
      app: pvc-nfs-deployment
  template:    #通过定义模板引用Pod，template中的信息和Pod定义的信息一致，包含metadata,spec信息
    metadata:  #定义Pod的labels
      labels:
        app: pvc-nfs-deployment
    spec:
      containers:
      - name: nginx-web 
        image: nginx:latest
        imagePullPolicy: IfNotPresent
        ports:
        - name: nginx-http-80
          protocol: TCP
          containerPort: 80
        volumeMounts:  #将PVC存储挂载到目录
        - name: pvc-nfs-storage
          mountPath: /usr/share/nginx/html 
      volumes:    #通过volumes引用persistentVolumeClaim存储
      - name: pvc-nfs-storage
        persistentVolumeClaim:
          claimName: pvc-nfs-storage
```

\2. 创建Deployments并查看创建情况和Pod情况

```js
创建Deployments
[root@node-1 happylau]# kubectl apply -f pvc-nfs-deployments.yaml 
deployment.apps/pvc-nfs-deployment created

查看Deployments列表
[root@node-1 happylau]# kubectl get deployments
NAME                 READY   UP-TO-DATE   AVAILABLE   AGE
pvc-nfs-deployment   1/1     1            1           16s

查看Deployments中的Pod
[root@node-1 happylau]# kubectl get pods -l app=pvc-nfs-deployment -o wide 
NAME                                  READY   STATUS    RESTARTS   AGE    IP            NODE     NOMINATED NODE   READINESS GATES
pvc-nfs-deployment-7467b9fbfc-xwdpr   1/1     Running   0          106s   10.244.1.29   node-2   <none>           <none>
```

\3. Pod中查看存储挂载信息，并做数据读写。

```js
[root@node-1 happylau]# kubectl exec -it pvc-nfs-deployment-7467b9fbfc-xwdpr  /bin/bash
root@pvc-nfs-deployment-7467b9fbfc-xwdpr:/# df -h
Filesystem                Size  Used Avail Use% Mounted on
overlay                    50G  4.3G   43G  10% /
tmpfs                      64M     0   64M   0% /dev
tmpfs                     920M     0  920M   0% /sys/fs/cgroup
/dev/vda1                  50G  4.3G   43G  10% /etc/hosts
shm                        64M     0   64M   0% /dev/shm
10.254.100.101:/mnt/data   50G  9.9G   37G  22% /usr/share/nginx/html #挂载成功
tmpfs                     920M   12K  920M   1% /run/secrets/kubernetes.io/serviceaccount
tmpfs                     920M     0  920M   0% /proc/acpi
tmpfs                     920M     0  920M   0% /proc/scsi
tmpfs                     920M     0  920M   0% /sys/firmware

写入站点数据内容
root@pvc-nfs-deployment-7467b9fbfc-xwdpr:~# echo "pvc index by happylau" >/usr/share/nginx/html/index.html 
root@pvc-nfs-deployment-7467b9fbfc-xwdpr:~# ls -l /usr/share/nginx/html/
total 4
-rw-r--r-- 1 nobody nogroup 22 Oct 12 02:00 index.html
```

\4. 测试访问，直接访问Pod的IP，一般通过service来调用，后续再介绍service

```js
[root@node-1 ~]# kubectl get pods -l app=pvc-nfs-deployment -o wide 
NAME                                  READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
pvc-nfs-deployment-7467b9fbfc-xwdpr   1/1     Running   0          14m   10.244.1.29   node-2   <none>           <none>
[root@node-1 ~]# curl http://10.244.1.29
pvc index by happylau
```

# 写在最后

本文通过介绍了持久化存储PV和持久化存储声明PVC的使用场景和相关概念，并通过实例演示PV和PVC的使用，由于PV需要管理员预先定义，对于大规模环境下使用不便利，因此有了动态PV，即通过StorageClass实现，下章节我们将介绍StorageClass的使用。

# 参考文献

PV和PVC介绍：https://kubernetes.io/docs/concepts/storage/persistent-volumes/

有状态化应用：https://kubernetes.io/docs/tasks/run-application/run-single-instance-stateful-application/



> 『 转载 』该文章来源于网络，侵删。 

