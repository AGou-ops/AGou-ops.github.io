---
title: "05 初识核心概念pod"
date: 2019-08-04T10:36:47+08:00
lastmod: 2019-08-04T10:36:47+08:00
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

前面的系列文章已介绍kubernetes架构，安装，升级和快速入门，读者通过文章的实操已对kubernetes已有初步的认识和理解，从本章开始逐步介绍kubernetes中的基础概念概念和核心概念，基础概念包括：namespace，labels，annotations，pods，volumes等；核心概念包含kubernetes中各种controller，包含以下几种：

- 应用副本控制器有：Deployments，ReplicaSets，DaemonSets，StatefulSets；
- 批处理任务控制器Jobs和CronJob
- 存储控制器PersistentVoloume，PersistentVolumeClaim，StorageClass；
- 服务[负载均衡](#)Service，Ingress，NetworkPolicy和DNS名称解析；
- 配置和密钥ConfigMaps和Secrets

 本文从最基础的概念pod开始讲解，后续逐步介绍应用部署，存储，负载均衡等相关的控制器，kubernetes内部由多个不同的控制器组成，每个控制器完成不同的功能。

# 1. 深入学习pod

## 1.1 Container和Pod概念

容器是一种便携式，轻量级别的容器虚拟化技术，使用linux cggroup技术实现各种资源的隔离，如cpu，memory，pid，mount，IPC等，相比于虚拟化技术如KVM，容器技术更加轻量级，它的产生主要解决环境的环境发布的问题，目前主流的容器技术是docker，说到容器，一般都等同于docker。

要运行容器首先需要有镜像，应用和应用依赖的环境运行在容器中，在kubernetes中不会直接运行container，而是运行pod，一个pod里面包含多个container，container之间共享相同的namespace，network，storage等。镜像存储在私有镜像或者公有镜像中，运行时通过docker image pull的方式拉取到本地运行，images的拉取策略包含有两种：

- ImagePullPolicy为Always，不管本地是否有直接下载
- ImagePullPolicy为IfNotPresent，默认镜像拉取得策略，本地不存在再拉取

Pods是kubernetes中最小的调度单位，Pods内运行一个或者多个container，container之间共享pod的网络ip资源，存储volume资源，计算等资源，方便pod内部的container之间能够实现快速的访问和交互。

![img](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%94)%E5%88%9D%E8%AF%86%E6%A0%B8%E5%BF%83%E6%A6%82%E5%BF%B5pod/1%20-%201620.jpg)Pod概念介绍

 如上图所示，Pod的使用方式通常包含两种：

- Pod中运行一个容器，最经常使用的模式，container封装在pod中调度，两者几乎等同，但k8s不直接管理容器
- Pod中运行多个容器，多个容器封装在pod中一起调度，适用于容器之间有数据交互和调用的场景，如app+redis，pod内部共享相同的网络命名空间，存储命名空间，进程命名空间等。

## 1.2 如何创建pod

kubernetes交互的方式通常分为四种：

- 命令行，kubectl和kubernetes交互，完成资源的管理，命令行入门简单，但只能支持部分资源创建
- API，通过resfulAPI以http的方式和kubernetes交互，适用于基于API做二次开发
- SDK，提供各种语言原生的SDK，实现各种语言编程接入
- YAML，通过易于理解的YAML文件格式，描述资源的定义，功能最丰富，最终转换为json格式

kubernetes中通过定义生申明式的方式定义资源，即通过在yaml文件中定义所需的资源，kubernetes通过controller-manager按照yaml文件中定义的资源去生成所需的资源（match the current state to desired state）。通常在kubernetes中通过yaml文件的方式定义资源，然后通过kubectl create -f 文件.yaml的方式应用配置，如下演示创建一个nginx应用的操作。

1、编写yaml文件，定义一个pod资源

```js
[root@node-1 demo]# cat nginx.yaml 
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
```

关于配置文件，说明如下：

- apiVersion  api使用的版本,kubectl api-versions可查看到当前系统能支持的版本列表
- kind           指定资源类型，表示为Pod的资源类型
- metadata   指定Pod的元数据，metadata.name指定名称，metadata.labels指定Pod的所属的标签
- spec         指定Pod的模版属性，spec.containers配置容器的信息，spec.containers.name指定名字，spec.containers.image指定容器镜像的名称，spec.containers.imagePullPolicy是镜像的下载方式，IfNotPresent表示当镜像不存在时下载，spec.containers.ports.name指定port的名称，spec.containers.ports.protocol协议类型为TCP，spec.containers.ports.containerPort为容器端口。

2、创建pod应用

```js
[root@node-1 demo]# kubectl apply -f nginx.yaml 
pod/nginx-demo created
```

3、访问应用

```js
获取容器的IP地址
[root@node-1 demo]# kubectl get pods -o wide 
NAME                    READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
demo-7b86696648-8bq7h   1/1     Running   0          8h    10.244.1.11   node-2   <none>           <none>
demo-7b86696648-8qp46   1/1     Running   0          8h    10.244.1.10   node-2   <none>           <none>
demo-7b86696648-d6hfw   1/1     Running   0          8h    10.244.1.12   node-2   <none>           <none>
nginx-demo              1/1     Running   0          50s   10.244.2.11   node-3   <none>           <none>

访问站点内容：
[root@node-1 demo]# curl http://10.244.2.11
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

前面我们我们学习过kubernetes支持滚动升级RollingUpdate，弹性扩容replicas等特性，如何给Pod做滚动升级保障业务不中断，如何提高Pod的副本个数保障高可用呢？答案是：不支持。Pod是单个，无法支持一些高级特性，高级特性需要通过高级的副本控制器如ReplicaSets，Deployments，StatefulSets，DaemonSets等才能支持。Pod在实际应用中很少用，除了测试和运行一些简单的功能外，实际使用建议使用Deployments代替，Pod的定义以Template的方式嵌入在副本控制器中。

## 1.3. 如何编写yaml文件

前面我们提到过kubernetse是申明式的方式部署应用，应用的部署都定义在yaml文件中来实现，如何来编写应用的yaml文件呢，下面我来分享两个实际使用的技巧：

1、通过定义模版快速生成，kubectl create apps -o yaml --dry-run的方式生成，--dry-run仅仅是试运行，并不实际在k8s集群中运行，通过指定-o yaml输出yaml格式文件，生成后给基于模版修改即可，如下：

```js
[root@node-1 demo]# kubectl create deployment demo --image=nginx:latest  --dry-run -o yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: demo
  name: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: demo
    spec:
      containers:
      - image: nginx:latest
        name: nginx
        resources: {}
status: {}
```

2、explain命令，explain命令堪称是语法查询器，可以查到每个字段的含义，使用说明和使用方式，如想要查看Pod的spec中containers其他支持的字段，可以通过kubectl explain Pod.spec.containers的方式查询，如下：

```js
[root@node-1 demo]# kubectl explain Pods.spec.containers
KIND:     Pod
VERSION:  v1

RESOURCE: containers <[]Object>

DESCRIPTION:
     List of containers belonging to the pod. Containers cannot currently be
     added or removed. There must be at least one container in a Pod. Cannot be
     updated.

     A single application container that you want to run within a pod.

FIELDS:
   args	<[]string> #命令参数
     Arguments to the entrypoint. The docker image's CMD is used if this is not
     provided. Variable references $(VAR_NAME) are expanded using the
     container's environment. If a variable cannot be resolved, the reference in
     the input string will be unchanged. The $(VAR_NAME) syntax can be escaped
     with a double $$, ie: $$(VAR_NAME). Escaped references will never be
     expanded, regardless of whether the variable exists or not. Cannot be
     updated. More info:
     https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/#running-a-command-in-a-shell

   image	<string> #镜像定义
     Docker image name. More info:
     https://kubernetes.io/docs/concepts/containers/images This field is
     optional to allow higher level config management to default or override
     container images in workload controllers like Deployments and StatefulSets.

   ports	<[]Object> #端口定义
     List of ports to expose from the container. Exposing a port here gives the
     system additional information about the network connections a container
     uses, but is primarily informational. Not specifying a port here DOES NOT
     prevent that port from being exposed. Any port which is listening on the
     default "0.0.0.0" address inside a container will be accessible from the
     network. Cannot be updated.

   readinessProbe	<Object> #可用健康检查
     Periodic probe of container service readiness. Container will be removed
     from service endpoints if the probe fails. Cannot be updated. More info:
     https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#container-probes

   resources	<Object> #资源设置
     Compute Resources required by this container. Cannot be updated. More info:
     https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/

...省略部分输出...
   volumeMounts	<[]Object> #挂载存储
     Pod volumes to mount into the container's filesystem. Cannot be updated.

   workingDir	<string>
     Container's working directory. If not specified, the container runtime's
     default will be used, which might be configured in the container image.
     Cannot be updated.
```

关于explain内容解释说明

- <string>        表示后面接一个字符串
- <[]Object>     表示后面是一个列表的对象，列表需要以-开始，且可以写多个
- <Object>       表示一个对象，对象内部包含多个属性

如继续上面的内容，如果需要查看resource资源定义，可以通过explain pods.spec.containers.resource来查看具体的使用方法。

通过上面两个工具的介绍，平时在日常工作中找到编写yaml文件部署应用的地图，建议手工多写几次，注意语法锁进，多写几次就熟悉了。Pod中设计到有很多的特性，如资源分配，健康检查，存储挂载等（参考附录文章），后续我们做详细介绍，Pod将以Template的方式嵌入到副本控制器如Deployments中。

# 附录

容器镜像介绍：https://kubernetes.io/docs/concepts/containers/images/

Pod介绍：https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/

Resource限定内存资源：https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/

Resource限定CPU资源：https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/

Pod挂载存储：https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/

Pod配置健康检查：https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/



> 『 转载 』该文章来源于网络，侵删。 

