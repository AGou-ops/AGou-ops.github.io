---
title: "12 详解DaemonSet控制器"
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





# **写在前面**

上章节中介绍了[Deployment，ReplicaSet，ReplicationController](#)等副本控制器的使用和场景，接下来介绍[kubernetes系列教程](#)控制器DaemonSet使用。

# 1. DaemonSet控制器

## 1.1 DaemonSet简介

介绍DaemonSet时我们先来思考一个问题：相信大家都接触过监控系统比如zabbix，监控系统需要在被监控机安装一个agent，安装agent通常会涉及到以下几个场景：

- 所有节点都必须安装agent以便采集监控数据
- 新加入的节点需要配置agent，手动或者运行脚本
- 节点下线后需要手动在监控系统中删除

kubernetes中经常涉及到在node上安装部署应用，它是如何解决上述的问题的呢？答案是DaemonSet。DaemonSet守护进程简称DS，适用于在所有节点或部分节点运行一个daemon守护进程，如监控我们安装部署时网络插件kube-flannel和kube-proxy，DaemonSet具有如下特点：

- DaemonSet确保所有节点运行一个Pod副本
- 指定节点运行一个Pod副本，通过标签选择器或者节点亲和性
- 新增节点会自动在节点增加一个Pod
- 移除节点时垃圾回收机制会自动清理Pod

![DaemnonSet控制器](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%BA%8C%EF%BC%89%E8%AF%A6%E8%A7%A3DaemonSet%E6%8E%A7%E5%88%B6%E5%99%A8/1%20-%201620.jpg)

DaemonSet适用于每个node节点均需要部署一个守护进程的场景，常见的场景例如：

- 日志采集agent，如fluentd或logstash
- 监控采集agent，如Prometheus Node Exporter,Sysdig Agent,Ganglia gmond
- 分布式集群组件，如Ceph MON，Ceph OSD，glusterd，Hadoop Yarn NodeManager等
- k8s必要运行组件，如网络flannel，weave，calico，kube-proxy等

安装k8s时默认在kube-system命名空间已经安装了有两个DaemonSet，分别为kube-flannel-ds-amd64和kube-proxy，分别负责flannel overlay网络的互通和service代理的实现，可以通过如下命令查看：

\1. 查看kube-system命令空间的DaemonSet列表，当前集群有三个node节点，所以每个DS会运行三个Pod副本

```js
[root@node-1 ~]# kubectl get ds -n kube-system 
NAME                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                   AGE
kube-flannel-ds-amd64   3         3         3       3            3           beta.kubernetes.io/arch=amd64   46d
kube-proxy              3         3         3       3            3           beta.kubernetes.io/os=linux     46d
```

\2. 查看Pod的副本情况，可以看到DaemonSet在每个节点都运行一个Pod

![img](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%BA%8C%EF%BC%89%E8%AF%A6%E8%A7%A3DaemonSet%E6%8E%A7%E5%88%B6%E5%99%A8/1%20-%201620.jpg)

## 1.2 DaemonSet定义

DaemonSet的定义和Deployment定义使用相类似，需要定义apiVersion，Kind，metadata和spec属性信息，spec中不需要定义replicas个数，spec.template即定义DS生成容器的模版信息，如下是运行一个fluentd-elasticsearch镜像容器的daemon守护进程，运行在每个node上通过fluentd采集日志上报到ElasticSearch。

\1. 通过yaml文件定义DaemonSet

```js
[root@node-1 happylau]# cat fluentd-es-daemonset.yaml 
apiVersion: apps/v1              #api版本信息
kind: DaemonSet                  #类型为DaemonSet
metadata:                        #元数据信息
  name: fluentd-elasticsearch
  namespace: kube-system        #运行的命名空间
  labels:
    k8s-app: fluentd-logging
spec:                          #DS模版
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:            #容器信息
      - name: fluentd-elasticsearch
        image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        resources:          #resource资源
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:      #挂载存储，agent需要到这些目录采集日志
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      terminationGracePeriodSeconds: 30
      volumes:            #将主机的目录以hostPath的形式挂载到容器Pod中。
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

DaemonSet定义注意事项：

- daemonset.spec.template定义Pod的模板信息，包含的metadata信息需要和selector保持一致
- template必须定义RestartPolicy的策略，切策略值为Always，保障服务异常时能自动重启恢复
- Pod运行在特定节点，支持指定调度策略，如nodeSelector，Node affinity，实现灵活调度

\2. 生成DaemonSet

```js
[root@node-1 happylau]# kubectl apply -f fluentd-es-daemonset.yaml 
daemonset.apps/fluentd-elasticsearch created
```

\3. 查看DaemonSet列表

```js
[root@node-1 happylau]# kubectl get daemonsets -n kube-system  fluentd-elasticsearch 
NAME                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
fluentd-elasticsearch   3         3         3       3            3           <none>          16s
```

\4. 查看node上运行Pod的情况,在NODE列可以看到每个node都运行了一个Pod

```js
[root@node-1 happylau]# kubectl get pods -n kube-system -o wide |grep fluentd 
fluentd-elasticsearch-blpqb      1/1     Running   0          3m7s   10.244.2.79      node-3   <none>           <none>
fluentd-elasticsearch-ksdlt      1/1     Running   0          3m7s   10.244.0.11      node-1   <none>           <none>
fluentd-elasticsearch-shtkh      1/1     Running   0          3m7s   10.244.1.64      node-2   <none>           <none>
```

\5. 查看DaemonSet详情，可以看到DaemonSet支持RollingUpdate滚动更新策略

```js
[root@node-1 happylau]# kubectl get daemonsets -n kube-system fluentd-elasticsearch -o yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"DaemonSet","metadata":{"annotations":{},"labels":{"k8s-app":"fluentd-logging"},"name":"fluentd-elasticsearch","namespace":"kube-system"},"spec":{"selector":{"matchLabels":{"name":"fluentd-elasticsearch"}},"template":{"metadata":{"labels":{"name":"fluentd-elasticsearch"}},"spec":{"containers":[{"image":"quay.io/fluentd_elasticsearch/fluentd:v2.5.2","name":"fluentd-elasticsearch","resources":{"limits":{"memory":"200Mi"},"requests":{"cpu":"100m","memory":"200Mi"}},"volumeMounts":[{"mountPath":"/var/log","name":"varlog"},{"mountPath":"/var/lib/docker/containers","name":"varlibdockercontainers","readOnly":true}]}],"terminationGracePeriodSeconds":30,"tolerations":[{"effect":"NoSchedule","key":"node-role.kubernetes.io/master"}],"volumes":[{"hostPath":{"path":"/var/log"},"name":"varlog"},{"hostPath":{"path":"/var/lib/docker/containers"},"name":"varlibdockercontainers"}]}}}}
  creationTimestamp: "2019-10-30T15:19:20Z"
  generation: 1
  labels:
    k8s-app: fluentd-logging
  name: fluentd-elasticsearch
  namespace: kube-system
  resourceVersion: "6046222"
  selfLink: /apis/extensions/v1beta1/namespaces/kube-system/daemonsets/fluentd-elasticsearch
  uid: c2c02c48-9f93-48f3-9d6c-32bfa671db0e
spec:
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      creationTimestamp: null
      labels:
        name: fluentd-elasticsearch
    spec:
      containers:
      - image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        imagePullPolicy: IfNotPresent
        name: fluentd-elasticsearch
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /var/log
          name: varlog
        - mountPath: /var/lib/docker/containers
          name: varlibdockercontainers
          readOnly: true
      dnsPolicy: ClusterFirst
      restartPolicy: Always             #重启策略必须为Always，保障异常时能自动恢复
      schedulerName: default-scheduler  #默认调度策略
      securityContext: {}
      terminationGracePeriodSeconds: 30
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
      volumes:
      - hostPath:
          path: /var/log
          type: ""
        name: varlog
      - hostPath:
          path: /var/lib/docker/containers
          type: ""
        name: varlibdockercontainers
  templateGeneration: 1
  updateStrategy:  #滚动更新策略
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
status:
  currentNumberScheduled: 3
  desiredNumberScheduled: 3
  numberAvailable: 3
  numberMisscheduled: 0
  numberReady: 3
  observedGeneration: 1
  updatedNumberScheduled: 3
```

## 1.3 滚动更新与回滚

\1. 更新镜像至最新版本

```js
[root@node-1 ~]# kubectl set image daemonsets fluentd-elasticsearch fluentd-elasticsearch=quay.io/fluentd_elasticsearch/fluentd:latest -n kube-system
daemonset.extensions/fluentd-elasticsearch image updated
```

\2. 查看滚动更新状态

```js
[root@node-1 ~]# kubectl rollout status daemonset -n kube-system fluentd-elasticsearch 
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 1 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 1 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 1 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 of 3 updated pods are available...
daemon set "fluentd-elasticsearch" successfully rolled out
```

\3. 查看DaemonSet详情，可以看到DS滚动更新的过程：DaemonSet先将node上的pod删除然后再创建

![DaemonSet滚动更新过程](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%BA%8C%EF%BC%89%E8%AF%A6%E8%A7%A3DaemonSet%E6%8E%A7%E5%88%B6%E5%99%A8/3%20-%201620.jpg)

\4. 查看DaemonSet滚动更新版本，REVSION 1为初始的版本

```js
[root@node-1 ~]# kubectl rollout history daemonset -n kube-system fluentd-elasticsearch 
daemonset.extensions/fluentd-elasticsearch 
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
```

\5. 更新回退，如果配置没有符合到预期可以回滚到原始的版本

```js
[root@node-1 ~]# kubectl rollout undo daemonset -n kube-system fluentd-elasticsearch --to-revision=1
daemonset.extensions/fluentd-elasticsearch rolled back
```

\6. 确认版本回退情况

![DaemonSet版本回退](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%BA%8C%EF%BC%89%E8%AF%A6%E8%A7%A3DaemonSet%E6%8E%A7%E5%88%B6%E5%99%A8/4%20-%201620.jpg)

\7. 观察版本回退的过程，回退的过程和和滚动更新过程类似，先删除Pod再创建

![DaemonSet回退过程](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%BA%8C%EF%BC%89%E8%AF%A6%E8%A7%A3DaemonSet%E6%8E%A7%E5%88%B6%E5%99%A8/5%20-%201620.jpg)

\8. 删除DaemonSet

```js
[root@node-1 ~]# kubectl delete daemonsets -n kube-system fluentd-elasticsearch 
daemonset.extensions "fluentd-elasticsearch" deleted
[root@node-1 ~]# kubectl get pods -n kube-system |grep fluentd
fluentd-elasticsearch-d6f6f      0/1     Terminating   0          110m
```

## 1.4 DaemonSet调度

前面[kubernetes系列教程（七）深入玩转pod调度](#)文章介绍了Pod的调度机制，DaemonSet通过kubernetes默认的调度器scheduler会在所有的node节点上运行一个Pod副本，可以通过如下三种方式将Pod运行在部分节点上：

- 指定nodeName节点运行
- 通过标签运行nodeSelector
- 通过亲和力调度node Affinity和node Anti-affinity

DaemonSet调度算法用于实现将Pod运行在特定的node节点上，如下以通过node affinity亲和力将Pod调度到部分的节点上node-2上为例。

\1. 为node添加一个app=web的labels

```js
[root@node-1 happylau]# kubectl get nodes --show-labels 
NAME     STATUS   ROLES    AGE   VERSION   LABELS
node-1   Ready    master   47d   v1.15.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-1,kubernetes.io/os=linux,node-role.kubernetes.io/master=
node-2   Ready    <none>   47d   v1.15.3   app=web,beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-2,kubernetes.io/os=linux
node-3   Ready    <none>   47d   v1.15.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node-3,kubernetes.io/os=linux
```

\2.  添加node affinity亲和力调度算法，requiredDuringSchedulingIgnoredDuringExecution设置基本需要满足条件，preferredDuringSchedulingIgnoredDuringExecution设置优选满足条件

```js
[root@node-1 happylau]# cat fluentd-es-daemonset.yaml 
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: fluentd-elasticsearch
        image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:  #优先满足条件
          - weight: 1
            preference:
              matchExpressions:
              - key: app 
                operator: In
                values:
                - web 
          requiredDuringSchedulingIgnoredDuringExecution:  #要求满足条件
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/hostname
                operator: In
                values:
                - node-2
                - node-3
      terminationGracePeriodSeconds: 30
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

\3. 生成DS，并查看列表

```js
[root@node-1 happylau]# kubectl delete ds -n kube-system fluentd-elasticsearch 
daemonset.extensions "fluentd-elasticsearch" deleted

[root@node-1 happylau]# kubectl get daemonsets -n kube-system fluentd-elasticsearch 
NAME                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
fluentd-elasticsearch   1         1         1       1            1           <none>          112s
```

\4. 校验Pod运行的情况，DaemonSet的Pod调度到node-2节点上

```js
[root@node-1 happylau]# kubectl get pods -n kube-system -o wide 
NAME                             READY   STATUS    RESTARTS   AGE     IP               NODE     NOMINATED NODE   READINESS GATES          <none>
fluentd-elasticsearch-9kngs      1/1     Running   0          2m39s   10.244.1.82      node-2   <none>           <none>
```

# **写在最后**

 本文介绍了kubernetes中DaemonSet控制器，DS控制器能确保所有的节点运行一个特定的daemon守护进程，此外通过nodeSelector或node Affinity能够实现将Pod调度到特定的node节点。

# **参考文档**

DaemonSet**：**https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/



> 『 转载 』该文章来源于网络，侵删。 

