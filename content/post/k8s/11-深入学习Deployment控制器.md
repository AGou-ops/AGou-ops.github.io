---
title: "11 深入学习Deployment控制器"
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

前面的文章我们深入介绍了Pod的使用，包括[Pod定义](#)，[Pod资源管理和服务质量](#)，[Pod健康检查](#)，[Pod存储管理](#)，[Pod调度](#)，当Pod所在的node异常时，Pod无法自动恢复，因此Pod很少单独使用，一般以template的形式嵌套在控制器中使用，下来介绍[kubernetes系列教程](#)副本控制器Deployment，ReplicaSet，ReplicationController的使用。

# 1. 深入学习控制器

## 1.1 控制器概述

Pod是kubernetes所有运行应用或部署服务的基础，可以看作是k8s中运行的机器人，应用单独运行在Pod中不具备高级的特性，比如节点故障时Pod无法自动迁移，Pod多副本横向扩展，应用滚动升级RollingUpdate等，因此Pod一般不会单独使用，需要使用控制器来实现。

我们先看一个概念ReplicationController副本控制器，简称RC，副本控制是实现Pod高可用的基础，其通过定义副本的副本数replicas，当运行的Pod数量少于replicas时RC会自动创建Pod，当Pod数量多于replicas时RC会自动删除多余的Pod，确保当前运行的Pod和RC定义的副本数保持一致。

副本控制器包括Deployment，ReplicaSet，ReplicationController，StatefulSet等。其中常用有两个：Deployment和StatefulSet，Deployment用于无状态服务，StatefulSet用于有状态服务，ReplicaSet作为Deployment后端副本控制器，ReplicationController则是旧使用的副本控制器。

为了实现不同的功能，kubernetes中提供多种不同的控制器满足不同的业务场景，可以分为四类：

- Stateless application无状态化应用，如Deployment，ReplicaSet，RC等；
- Stateful application有状态化应用，需要保存数据状态，如数据库，数据库集群；
- Node daemon节点支撑守护，适用于在所有或部分节点运行Daemon，如日志，监控采集；
- Batch批处理任务，非长期运行服务，分为一次性运行Job和计划运行CronJob两种。

本文我们主要介绍无状态服务副本控制器的使用，包括Deployment，ReplicaSet和ReplicationController。

## 1.2 Deployment

Deployment是实现无状态应用副本控制器，其通过declarative申明式的方式定义Pod的副本数，Deployment的副本机制是通过ReplicaSet实现，replicas副本的管理通过在ReplicaSet中添加和删除Pod，RollingUpdate通过新建ReplicaSet，然后逐步移除和添加ReplicaSet中的Pod数量，从而实现滚动更新，使用Deployment的场景如下：

- 滚动升级RollingUpdate，后台通过ReplicaSet实现
- 多副本replicas实现，增加副本(高负载)或减少副本(低负载)
- 应用回滚Rollout，版本更新支持回退

### 1.2.1 Deployment定义

\1. 我们定义一个Deployment，副本数为3，Pod以模版Template的形式封装在Deployment中，为了结合之前Pod学习内容，我们增加了resource和健康检查的定义，具体实现参考前面介绍的文章。

```js
[root@node-1 happylau]# cat deployment-demo.yaml 
apiVersion: apps/v1
kind: Deployment
metadata:            #Deployment的元数据信息，包含名字，标签
  name: deployment-nginx-demo
  labels:
    app: nginx
    rc: deployment
  annotations:
    kubernetes.io/replicationcontroller: Deployment
    kubernetes.io/description: "ReplicationController Deployment Demo"
spec:
  replicas: 3          #副本数量，包含有3个Pod副本
  selector:            #标签选择器，选择管理包含指定标签的Pod
    matchLabels:
      app: nginx
      rc: deployment
  template:       #如下是Pod的模板定义，没有apiVersion，Kind属性，需包含metadata定义
    metadata:          #Pod的元数据信息，必须包含有labels
      labels:
        app: nginx
        rc: deployment 
    spec:              #spec指定容器的属性信息
      containers:
      - name: nginx-deployment
        image: nginx:1.7.9
        imagePullPolicy: IfNotPresent
        ports:          #容器端口信息
        - name: http-80-port
          protocol: TCP
          containerPort: 80
        resources:      #资源管理,requests请求资源，limits限制资源
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:  #健康检查器livenessProbe，存活检查
          httpGet:
            path: /index.html
            port: 80
            scheme: HTTP
          initialDelaySeconds: 3
          periodSeconds: 5
          timeoutSeconds: 2
        readinessProbe:  #健康检查器readinessProbe，就绪检查
          httpGet:
            path: /index.html
            port: 80
            scheme: HTTP
          initialDelaySeconds: 3
          periodSeconds: 5
          timeoutSeconds: 2
```

Deployment字段说明：

- deployment基本属性，包括apiVersion,Kind,metadata和spec，其中，deployment.metdata指定名称和标签内容，deployment.spec指定部署组的属性信息；
- deployment属性信息包含有replicas，Selector和template，其中replicas指定副本数目，Selector指定管理的Pod标签，template为定义Pod的模板，Deployment通过模板创建Pod；
- deployment.spec.template为Pod定义的模板，和Pod定义不太一样，template中不包含apiVersion和Kind属性，要求必须有metadata，deployment.spec.template.spec为容器的属性信息，其他定义内容和Pod一致。

\2. 生成Deployment，创建时加一个--record参数,会在annotation中记录deployment.kubernetes.io/revision版本

```js
[root@node-1 happylau]# kubectl apply -f deployment-demo.yaml --record
deployment.apps/deployment-nginx-demo created
```

\3. 查看Deployment列表，运行时自动下载镜像，如下已运行了3个副本

```js
[root@node-1 happylau]# kubectl get deployments deployment-nginx-demo 
NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment-nginx-demo   3/3     3            3           2m37s

NAME代表名称,metadata.name字段定义
READY代表Pod的健康状态，前面值是readiness，后面是liveness
UP-TO-DATE代表更新，用于滚动升级
AVAILABLE代表可用
AGE创建至今运行的时长
```

\4.  查看Deployment的详情，可以看到Deployment通过一个deployment-nginx-demo-866bb6cf78 replicaset副本控制器控制Pod的副本数量

![Deployment详情信息](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/1%20-%201620.jpg)

\5. 查看replicaset的详情信息，通过Events可查看到deployment-nginx-demo-866bb6cf78创建了三个Pod

![ReplicaSet详情信息](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/2%20-%201620.jpg)

\6. 查看Pod详情，最终通过Pod定义的模版创建container，资源定义，健康检查等包含在Pod定义的模版中

![Pod详情信息](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/3%20-%201620.jpg)

通过上面的实战演练我们可得知Deployment的副本控制功能是由replicaset实现，replicaset生成Deployment中定义的replicas副本的数量，即创建多个副本，如下图所示：

![Deployment创建结构示意图](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/4%20-%201620.jpg)

### 1.2.2 Deployment扩容

当业务比较繁忙时可以通过增加副本数，增加副本数是通过yaml文件中的replicas控制的，当设置了replias后，Deployment控制器会自动根据当前副本数目创建所需的Pod数，这些pod会自动加入到service中实现负载均衡，相反减少副本数，这些pod会自动从service中删除。

![Deployment扩容](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/5%20-%201620.jpg)

\1. 将deployment的副本数扩容至4个，可通过修改yaml文件的replicas个数或者通过scale命令扩展。

```js
[root@node-1 ~]# kubectl scale --replicas=4 deployment deployment-nginx-demo 
deployment.extensions/deployment-nginx-demo scaled
```

\2. 查看Deployment副本数量,已增加至4个副本

```js
[root@node-1 ~]# kubectl get deployments
NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment-nginx-demo   4/4     4            4           77m
```

\3. 副本的扩容是如何实现的呢？我们查看replicaset的详情信息观察，增加副本的个数是通过replicaset来扩容，通过模版复制新的Pod

![Deployment扩展](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/6%20-%201620.jpg)

\4. 副本缩容

```js
[root@node-1 ~]# kubectl scale --replicas=2 deployment deployment-nginx-demo 
deployment.extensions/deployment-nginx-demo scaled

[root@node-1 ~]# kubectl get deployments deployment-nginx-demo 
NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment-nginx-demo   2/2     2            2           7h41m
```

![Deployment减少副本](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/7%20-%201620.jpg)

通过上面的操作演练我们可以得知:Deployment的扩容是通过ReplicaSet的模版创建Pod或删除Pod实现，scale是手动扩展实现副本的机制，kubernetes还提供了另外一种副本自动扩容机制horizontalpodautoscalers(Horizontal Pod Autoscaling),即通过定义CPU的利用率实现自动的横向扩展，由于需要依赖于监控组件，后续我们再做介绍。

### 1.2.3 滚动更新

Deployment支持滚动更新，默认创建Deployment后会增加滚动更新的策略，通过逐步替代replicas中的pod实现更新无服务中断（需要结合service），如下图所示：将一个deployment副本数为3的应用更新，先更新10.0.0.6 pod，更新pod应用，替换新的ip，然后加入到service中，以此类推再继续更新其他pod，从而实现滚动更新，不影响服务的升级。

![滚动更新](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/8%20-%201620.jpg)

通过类型为：RollingUpdate，每次更新最大的数量maxSurge是replicas总数的25%,最大不可用的数量maxUnavailable为25%，如下是通过kubectl get deployments deployment-nginx-demo -o yaml查看滚动更新相关的策略。

```js
spec:
  progressDeadlineSeconds: 600
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx
      rc: deployment
  strategy:  #strategy定义的是升级的策略，类型为RollingUpdate
    rollingUpdate: 
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
```

\1. 滚动更新是当pod.template中定义的相关属性变化，如下将镜像更新到1.9.1，通过--record会记录操作命令

```js
[root@node-1 ~]# kubectl set image deployments deployment-nginx-demo nginx-deployment=nginx:1.9.1 --record
deployment.extensions/deployment-nginx-demo image updated
```

\2. 查看滚动升级的状态（由于第一次nginx的镜像写错了，容器下载镜像失败，写成nignx，导致修改后有两次record）

```js
[root@node-1 happylau]# kubectl rollout status deployment deployment-nginx-demo 
deployment "deployment-nginx-demo" successfully rolled out

查看滚动升级版本，REVSISION代表版本号：
[root@node-1 happylau]# kubectl rollout history deployment deployment-nginx-demo 
deployment.extensions/deployment-nginx-demo 
REVISION  CHANGE-CAUSE
1         <none>
2         kubectl set image deployments deployment-nginx-demo nginx-deployment=nignx:1.9.1 --record=true
3         kubectl set image deployments deployment-nginx-demo nginx-deployment=nignx:1.9.1 --record=true
```

\3. 观察Deployment的升级过程，新创建一个RS deployment-nginx-demo-65c8c98c7b，逐渐将旧RS中的pod替换，直至旧的RS deployment-nginx-demo-866bb6cf78上的副本数为0.

![滚动升级原理](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/9%20-%201620.jpg)

\4. 查看RS的列表，可以看到新的RS的副本数为2，其他RS副本数为0

```js
[root@node-1 ~]# kubectl get replicasets 
NAME                               DESIRED   CURRENT   READY   AGE
deployment-nginx-demo-65c8c98c7b   2         2         2       21m  #新的RS，REVSION为3
deployment-nginx-demo-6cb65f58c6   0         0         0       22m  #镜像写错的RS，REVISON为2
deployment-nginx-demo-866bb6cf78   0         0         0       40m  #旧的RS，对应REVSION为1
```

\5. 测试版本升级是否成功

```js
[root@node-1 ~]# kubectl get pods -o wide 
NAME                                     READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
deployment-nginx-demo-65c8c98c7b-bzql9   1/1     Running   0          25m   10.244.1.58   node-2   <none>           <none>
deployment-nginx-demo-65c8c98c7b-vrjhp   1/1     Running   0          25m   10.244.2.72   node-3   <none>           <none>
[root@node-1 ~]# curl -I http://10.244.2.72 
HTTP/1.1 200 OK
Server: nginx/1.9.1 #镜像的版本成功更新
Date: Mon, 28 Oct 2019 15:28:49 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 26 May 2015 15:02:09 GMT
Connection: keep-alive
ETag: "55648af1-264"
Accept-Ranges: bytes
```

### 1.2.4 版本回退

如果版本不符合预期，kubernetes提供回退的功能，和滚动更新一样，回退的功能Deployment将替换到原始的RS上，即逐步将Pod的副本替换到旧的RS上.

\1. 执行回滚，回退到REVISON版本为1

```js
[root@node-1 ~]# kubectl rollout undo deployment deployment-nginx-demo --to-revision=1
deployment.extensions/deployment-nginx-demo rolled back
```

\2. 查看Deployment的回退状态和历史版本

```js
[root@node-1 ~]# kubectl rollout status deployment deployment-nginx-demo 
deployment "deployment-nginx-demo" successfully rolled out

[root@node-1 ~]# kubectl rollout history deployment deployment-nginx-demo 
deployment.extensions/deployment-nginx-demo 
REVISION  CHANGE-CAUSE
2         kubectl set image deployments deployment-nginx-demo nginx-deployment=nignx:1.9.1 --record=true
3         kubectl set image deployments deployment-nginx-demo nginx-deployment=nignx:1.9.1 --record=true
4         <none>
```

\3. 查看Deployment的详情，可以看到RS已经会退到原始的RS了

![版本回退](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/10%20-%201620.jpg)

\4. 测试nginx的版本

```js
[root@node-1 ~]# kubectl get pods -o wide 
NAME                                     READY   STATUS    RESTARTS   AGE     IP            NODE     NOMINATED NODE   READINESS GATES
deployment-nginx-demo-866bb6cf78-9thtn   1/1     Running   0          3m42s   10.244.1.59   node-2   <none>           <none>
deployment-nginx-demo-866bb6cf78-ws2hx   1/1     Running   0          3m48s   10.244.2.73   node-3   <none>           <none>


#测试版本
[root@node-1 ~]# curl -I http://10.244.1.59 
HTTP/1.1 200 OK
Server: nginx/1.7.9 #回退到1.7.9版本
Date: Mon, 28 Oct 2019 15:36:07 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 23 Dec 2014 16:25:09 GMT
Connection: keep-alive
ETag: "54999765-264"
Accept-Ranges: bytes
```

**小结**：通过上面的操作演练可知，Deployment是通过ReplicaSet实现Pod副本数的管理（扩容或减少副本数），滚动更新是通过新建RS，将Pod从旧的RS逐步更新到新的RS上；相反，回滚版本将会退到指定版本的ReplicaSet上。

## 1.3 ReplicaSet

ReplicaSet副本集简称RS，用于实现副本数的控制，通过上面的学习我们可以知道Deployment实际是调用ReplicaSet实现副本的控制，RS不具备滚动升级和回滚的特性，一般推荐使用Deployment，ReplicaSet的定义和Deployment差不多，如下：

\1. 定义ReplicaSet

```js
[root@node-1 happylau]# cat replicaset-demo.yaml 
apiVersion: extensions/v1beta1
kind: ReplicaSet
metadata:
  name: replicaset-demo
  labels:
    controller: replicaset
  annotations:
    kubernetes.io/description: "Kubernetes Replication Controller Replication"
spec:
  replicas: 3    #副本数
  selector:      #Pod标签选择器
    matchLabels:  
      controller: replicaset
  template:      #创建Pod的模板
    metadata:
      labels:
        controller: replicaset
    spec:        #容器信息
      containers:
      - name: nginx-replicaset-demo
        image: nginx:1.7.9
        imagePullPolicy: IfNotPresent
        ports:
        - name: http-80-port
          protocol: TCP
          containerPort: 80
```

\2. 创建RS并查看RS列表

```js
[root@node-1 happylau]# kubectl apply -f replicaset-demo.yaml 
replicaset.extensions/replicaset-demo created

[root@node-1 happylau]# kubectl get replicasets replicaset-demo 
NAME              DESIRED   CURRENT   READY   AGE
replicaset-demo   3         3         3       15s
```

\3. 扩展副本数至4个

```js
[root@node-1 happylau]# kubectl scale --replicas=4 replicaset replicaset-demo 
replicaset.extensions/replicaset-demo scaled
[root@node-1 happylau]# kubectl get replicasets replicaset-demo 
NAME              DESIRED   CURRENT   READY   AGE
replicaset-demo   4         4         4       76s
```

\4. 减少副本数至2个

```js
[root@node-1 happylau]# kubectl scale --replicas=2 replicaset replicaset-demo 
replicaset.extensions/replicaset-demo scaled
[root@node-1 happylau]# kubectl get replicasets replicaset-demo 
NAME              DESIRED   CURRENT   READY   AGE
replicaset-demo   2         2         2       114s
```

\5. 镜像版本升级，验证得知不具备版本升级的能力

```js
[root@node-1 happylau]# kubectl set image replicasets replicaset-demo nginx-replicaset-demo=nginx:1.9.1
replicaset.extensions/replicaset-demo image updated  #命令执行成功了
```

![ReplicaSet验证版本更新](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%80%EF%BC%89%E6%B7%B1%E5%85%A5%E5%AD%A6%E4%B9%A0Deployment%E6%8E%A7%E5%88%B6%E5%99%A8/11%20-%201620.jpg)

ReplicaSet小结：通过上面的演示可以知道，RS定义和Deployment类似，能实现副本的控制，扩展和缩减，Deployment是更高层次的副本控制器，ReplicaSet主要为Deployment的副本控制器和滚动更新机制，ReplicaSet本身无法提供滚动更新的能力。

## 1.4 ReplicationController

ReplicationController副本控制器简称RC，是kubernetes中最早的副本控制器，RC是ReplicaSet之前的版本，ReplicationController提供副本控制能力，其定义方式和Deployment，ReplicaSet相类似，如下：

\1. 定义ReplicationController

```js
[root@node-1 happylau]# cat rc-demo.yaml 
apiVersion: v1 
kind: ReplicationController 
metadata:
  name: rc-demo 
  labels:
    controller: replicationcontroller 
  annotations:
    kubernetes.io/description: "Kubernetes Replication Controller Replication"
spec:
  replicas: 3
  selector:     #不能使用matchLables字符集模式
    controller: replicationcontroller 
  template:
    metadata:
      labels:
        controller: replicationcontroller   
    spec:
      containers:
      - name: nginx-rc-demo 
        image: nginx:1.7.9
        imagePullPolicy: IfNotPresent
        ports:
        - name: http-80-port
          protocol: TCP
          containerPort: 80
```

\2. 生成RC并查看列表

```js
[root@node-1 happylau]# kubectl apply -f rc-demo.yaml 
replicationcontroller/rc-demo created

[root@node-1 happylau]# kubectl get replicationcontrollers 
NAME      DESIRED   CURRENT   READY   AGE
rc-demo   3         3         3       103s

#查看详情
[root@node-1 happylau]# kubectl describe replicationcontrollers rc-demo 
Name:         rc-demo
Namespace:    default
Selector:     controller=replicationcontroller
Labels:       controller=replicationcontroller
Annotations:  kubectl.kubernetes.io/last-applied-configuration:
                {"apiVersion":"v1","kind":"ReplicationController","metadata":{"annotations":{"kubernetes.io/description":"Kubernetes Replication Controlle...
              kubernetes.io/description: Kubernetes Replication Controller Replication
Replicas:     3 current / 3 desired
Pods Status:  3 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  controller=replicationcontroller
  Containers:
   nginx-rc-demo:
    Image:        nginx:1.7.9
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From                    Message
  ----    ------            ----  ----                    -------
  Normal  SuccessfulCreate  113s  replication-controller  Created pod: rc-demo-hm8s9
  Normal  SuccessfulCreate  113s  replication-controller  Created pod: rc-demo-xnfht
  Normal  SuccessfulCreate  113s  replication-controller  Created pod: rc-demo-lfhc9
```

3.副本扩容至4个

```js
[root@node-1 happylau]# kubectl scale --replicas=4 replicationcontroller rc-demo 
replicationcontroller/rc-demo scaled
[root@node-1 happylau]# kubectl get replicationcontrollers 
NAME      DESIRED   CURRENT   READY   AGE
rc-demo   4         4         4       3m23s 
```

\4. 副本缩容至2个

```js
[root@node-1 happylau]# kubectl scale --replicas=2 replicationcontroller rc-demo 
replicationcontroller/rc-demo scaled
[root@node-1 happylau]# kubectl get replicationcontrollers 
NAME      DESIRED   CURRENT   READY   AGE
rc-demo   2         2         2       3m51s
```

# 写在最后

本文介绍了kubernetes中三个副本控制器：Deployment，ReplicaSet和ReplicationController，当前使用最广泛的是Deployment，ReplicaSet为Deployment提供滚动更新机制，RC当前是旧版的副本控制器，当前已废弃，推荐使用Deployment控制器，具备副本控制器，扩展副本，缩减副本，滚动升级和回滚等高级能力。

# 参考文献

Deployment：https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

ReplicaSet：https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/

ReplicationController：[https://kubernetes.io/docs/concepts/workloads/controllers/

> 『 转载 』该文章来源于网络，侵删。 

