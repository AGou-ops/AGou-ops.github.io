---
title: "04 离线升级kubernetes集群"
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





# 1. kubernetes集群升级

## 1.1 kubernetes升级概述

  kubernetes版本升级迭代非常快，每三个月更新一个版本,很多新的功能在新版本中快速迭代，为了与社区版本功能保持一致，升级kubernetes集群，社区已通过kubeadm工具统一升级集群，升级步骤简单易行。首先来看下升级kubernetes集群需要升级那些组件：

- 升级管理节点，管理节点上的kube-apiserver，kuber-controller-manager，kube-scheduler，etcd等；
- 其他管理节点，管理节点如果以高可用的方式部署，多个高可用节点需要一并升级；
- worker工作节点，升级工作节点上的Container Runtime如docker，kubelet和kube-proxy。

 版本升级通常分为两类：小版本升级和跨版本升级，小版本升级如1.14.1升级只1.14.2，小版本之间可以跨版本升级如1.14.1直接升级至1.14.3；跨版本升级指大版本升级，如1.14.x升级至1.15.x。本文以离线的方式将1.14.1升级至1.1.5.1版本，升级前需要满足条件如下：

- 当前集群版本需要大于1.14.x，可升级至1.14.x和1.15.x版本，小版本和跨版本之间升级；
- 关闭swap空间；
- 备份数据，将etcd数据备份，以及一些重要目录如/etc/kubernetes,/var/lib/kubelet；
- 升级过程中pod需要重启，确保应用使用RollingUpdate滚动升级策略，避免业务有影响。

## 1.2 升级前准备工作

1、查看当前版本,系统上部署的版本是1.1.4.1

```js
[root@node-1 ~]# kubectl version
Client Version: version.Info{Major:"1", Minor:"14", GitVersion:"v1.14.1", GitCommit:"b7394102d6ef778017f2ca4046abbaa23b88c290", GitTreeState:"clean", BuildDate:"2019-04-08T17:11:31Z", GoVersion:"go1.12.1", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"14", GitVersion:"v1.14.1", GitCommit:"b7394102d6ef778017f2ca4046abbaa23b88c290", GitTreeState:"clean", BuildDate:"2019-04-08T17:02:58Z", GoVersion:"go1.12.1", Compiler:"gc", Platform:"linux/amd64"}

[root@node-1 ~]# kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"14", GitVersion:"v1.14.1", GitCommit:"b7394102d6ef778017f2ca4046abbaa23b88c290", GitTreeState:"clean", BuildDate:"2019-04-08T17:08:49Z", GoVersion:"go1.12.1", Compiler:"gc", Platform:"linux/amd64"}
```

2、查看node节点的版本,node上的kubelet和kube-proxy使用1.1.4.1版本

```js
[root@node-1 ~]# kubectl get nodes
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    master   25h   v1.14.1
node-2   Ready    <none>   25h   v1.14.1
node-3   Ready    <none>   25h   v1.14.1
```

3、其他组件状态，确保当前组件，应用状态正常

```js
[root@node-1 ~]# kubectl get componentstatuses 
NAME                 STATUS    MESSAGE             ERROR
scheduler            Healthy   ok                  
controller-manager   Healthy   ok                  
etcd-0               Healthy   {"health":"true"}   
[root@node-1 ~]# 
[root@node-1 ~]# kubectl get deployments --all-namespaces 
NAMESPACE     NAME      READY   UP-TO-DATE   AVAILABLE   AGE
default       demo      3/3     3            3           37m
kube-system   coredns   2/2     2            2           25h
```

4、查看kubernetes最新版本（配置kubernetes的yum源，需要合理上网才可以访问），使用yum list --showduplicates kubeadm --disableexcludes=kubernetes查看当前能升级版本，绿色为当前版本，蓝色为可以升级的版本，如下图：

![img](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%9B%9B)%E7%A6%BB%E7%BA%BF%E5%8D%87%E7%BA%A7kubernetes%E9%9B%86%E7%BE%A4/1%20-%201620.jpg)kubernetes可升级版本列表

## 1.3 升级master节点

1、倒入安装镜像，先从cos中下载安装镜像并通过docker load导入到系统中，[下载地址](https://happylau-k8s-1251956900.cos.ap-chengdu.myqcloud.com/kubernetes/v1.15.1.tar.gz)，解压并进入到v1.15.1目录下，将镜像倒入到三个节点中,以node-2为例倒入镜像：

- [1.15.1下载地址](https://happylau-k8s-1251956900.cos.ap-chengdu.myqcloud.com/kubernetes/v1.15.1.tar.gz)
- [1.17.2下载地址](https://happylau-k8s-1251956900.cos.ap-chengdu.myqcloud.com/kubernetes/v1.17.2.tar.gz)

```js
倒入镜像：
[root@node-2 v1.15.1]# docker image load -i kube-apiserver\:v1.15.1.tar 
[root@node-2 v1.15.1]# docker image load -i kube-scheduler\:v1.15.1.tar 
[root@node-2 v1.15.1]# docker image load -i kube-controller-manager\:v1.15.1.tar 
[root@node-2 v1.15.1]# docker image load -i kube-proxy\:v1.15.1.tar 

查看当前系统导入镜像列表：
[root@node-1 ~]# docker image list 
REPOSITORY                           TAG                 IMAGE ID            CREATED             SIZE
k8s.gcr.io/kube-proxy                v1.15.1             89a062da739d        8 weeks ago         82.4MB
k8s.gcr.io/kube-controller-manager   v1.15.1             d75082f1d121        8 weeks ago         159MB
k8s.gcr.io/kube-scheduler            v1.15.1             b0b3c4c404da        8 weeks ago         81.1MB
k8s.gcr.io/kube-apiserver            v1.15.1             68c3eb07bfc3        8 weeks ago         207MB
k8s.gcr.io/kube-proxy                v1.14.1             20a2d7035165        5 months ago        82.1MB
k8s.gcr.io/kube-apiserver            v1.14.1             cfaa4ad74c37        5 months ago        210MB
k8s.gcr.io/kube-scheduler            v1.14.1             8931473d5bdb        5 months ago        81.6MB
k8s.gcr.io/kube-controller-manager   v1.14.1             efb3887b411d        5 months ago        158MB
quay.io/coreos/flannel               v0.11.0-amd64       ff281650a721        7 months ago        52.6MB
k8s.gcr.io/coredns                   1.3.1               eb516548c180        8 months ago        40.3MB
k8s.gcr.io/etcd                      3.3.10              2c4adeb21b4f        9 months ago        258MB
k8s.gcr.io/pause                     3.1                 da86e6ba6ca1        21 months ago       742kB
```

2、更新kubeadm版本至1.15.1，国内可以参考https://blog.51cto.com/2157217/1983992设置kubernetes源

![img](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%9B%9B)%E7%A6%BB%E7%BA%BF%E5%8D%87%E7%BA%A7kubernetes%E9%9B%86%E7%BE%A4/2%20-%201620.jpg)更新kubeadm版本至1.15.1

3、校验kubeadm版本,已升级至1.1.5.1版本

```js
[root@node-1 ~]# kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"15", GitVersion:"v1.15.1", GitCommit:"4485c6f18cee9a5d3c3b4e523bd27972b1b53892", GitTreeState:"clean", BuildDate:"2019-07-18T09:15:32Z", GoVersion:"go1.12.5", Compiler:"gc", Platform:"linux/amd64"}
```

4、查看升级计划，通过kubeadm可以查看当前集群的升级计划，会显示当前小版本最新的版本以及社区最新的版本

```js
[root@node-1 ~]# kubeadm upgrade plan
[upgrade/config] Making sure the configuration is correct:
[upgrade/config] Reading configuration from the cluster...
[upgrade/config] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -oyaml'
[preflight] Running pre-flight checks.
[upgrade] Making sure the cluster is healthy:
[upgrade] Fetching available versions to upgrade to
[upgrade/versions] Cluster version: v1.14.1  #当前集群版本
[upgrade/versions] kubeadm version: v1.15.1  #当前kubeadm版本
[upgrade/versions] Latest stable version: v1.15.3 #社区最新版本
[upgrade/versions] Latest version in the v1.14 series: v1.14.6 #1.14.x中最新的版本

Components that must be upgraded manually after you have upgraded the control plane with 'kubeadm upgrade apply':
COMPONENT   CURRENT       AVAILABLE
Kubelet     3 x v1.14.1   v1.14.6

Upgrade to the latest version in the v1.14 series:

COMPONENT            CURRENT   AVAILABLE #可升级的版本信息，当前可从1.14.1升级至1.14.6版本
API Server           v1.14.1   v1.14.6
Controller Manager   v1.14.1   v1.14.6
Scheduler            v1.14.1   v1.14.6
Kube Proxy           v1.14.1   v1.14.6
CoreDNS              1.3.1     1.3.1
Etcd                 3.3.10    3.3.10

You can now apply the upgrade by executing the following command:

	kubeadm upgrade apply v1.14.6 #升级至1.14.6执行的操作命令

_____________________________________________________________________

Components that must be upgraded manually after you have upgraded the control plane with 'kubeadm upgrade apply':
COMPONENT   CURRENT       AVAILABLE
Kubelet     3 x v1.14.1   v1.15.3

Upgrade to the latest stable version:

COMPONENT            CURRENT   AVAILABLE #跨版本升级的版本，当前最新的版本是1.15.3
API Server           v1.14.1   v1.15.3
Controller Manager   v1.14.1   v1.15.3
Scheduler            v1.14.1   v1.15.3
Kube Proxy           v1.14.1   v1.15.3
CoreDNS              1.3.1     1.3.1
Etcd                 3.3.10    3.3.10

You can now apply the upgrade by executing the following command:

	kubeadm upgrade apply v1.15.3 #升级至社区最新的版本执行的操作

Note: Before you can perform this upgrade, you have to update kubeadm to v1.15.3.

_____________________________________________________________________
```

5、当前镜像没有下载最新镜像，本文以升级1.1.5.1版本为例，升级其他版本相类似，需要确保当前集群已获取到相关镜像，升级过程中也会更新证书，可通过`--certificate-renewal=false关闭证书升级，`升级至1.15.1版本操作如下：

```js
[root@node-1 ~]# kubeadm upgrade apply v1.15.1
[upgrade/config] Making sure the configuration is correct:
[upgrade/config] Reading configuration from the cluster...
[upgrade/config] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -oyaml'
[preflight] Running pre-flight checks.
[upgrade] Making sure the cluster is healthy:
[upgrade/version] You have chosen to change the cluster version to "v1.15.1"
[upgrade/versions] Cluster version: v1.14.1
[upgrade/versions] kubeadm version: v1.15.1
[upgrade/confirm] Are you sure you want to proceed with the upgrade? [y/N]: y 版本升级信息，确认操作
[upgrade/prepull] Will prepull images for components [kube-apiserver kube-controller-manager kube-scheduler etcd]
[upgrade/prepull] Prepulling image for component etcd.
[upgrade/prepull] Prepulling image for component kube-apiserver.
[upgrade/prepull] Prepulling image for component kube-controller-manager.
[upgrade/prepull] Prepulling image for component kube-scheduler.
[apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
[apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
[apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-etcd
[apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
[apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
[apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
[apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-etcd
[apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
[upgrade/prepull] Prepulled image for component kube-controller-manager.
[upgrade/prepull] Prepulled image for component kube-scheduler.
[upgrade/prepull] Prepulled image for component etcd.
[upgrade/prepull] Prepulled image for component kube-apiserver. #拉取镜像的步骤
[upgrade/prepull] Successfully prepulled the images for all the control plane components
[upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.15.1"...
Static pod: kube-apiserver-node-1 hash: bdf7ffba48feb2fc4c7676e7525066fd
Static pod: kube-controller-manager-node-1 hash: ecf9c37413eace225bc60becabeddb3b
Static pod: kube-scheduler-node-1 hash: f44110a0ca540009109bfc32a7eb0baa
[upgrade/etcd] Upgrading to TLS for etcd #开始更新静态pod，及master上的每个节点
[upgrade/staticpods] Writing new Static Pod manifests to "/etc/kubernetes/tmp/kubeadm-upgraded-manifests122291749"
[upgrade/staticpods] Preparing for "kube-apiserver" upgrade
[upgrade/staticpods] Renewing apiserver certificate
[upgrade/staticpods] Renewing apiserver-kubelet-client certificate
[upgrade/staticpods] Renewing front-proxy-client certificate
[upgrade/staticpods] Renewing apiserver-etcd-client certificate #更新证书
[upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-apiserver.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2019-09-15-12-41-40/kube-apiserver.yaml"
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/staticpods] This might take a minute or longer depending on the component/version gap (timeout 5m0s)
Static pod: kube-apiserver-node-1 hash: bdf7ffba48feb2fc4c7676e7525066fd
Static pod: kube-apiserver-node-1 hash: bdf7ffba48feb2fc4c7676e7525066fd
Static pod: kube-apiserver-node-1 hash: bdf7ffba48feb2fc4c7676e7525066fd
Static pod: kube-apiserver-node-1 hash: 4cd1e2acc44e2d908fd2c7b307bfce59
[apiclient] Found 1 Pods for label selector component=kube-apiserver
[upgrade/staticpods] Component "kube-apiserver" upgraded successfully! #更新成功
[upgrade/staticpods] Preparing for "kube-controller-manager" upgrade
[upgrade/staticpods] Renewing controller-manager.conf certificate
[upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-controller-manager.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2019-09-15-12-41-40/kube-controller-manager.yaml"
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/staticpods] This might take a minute or longer depending on the component/version gap (timeout 5m0s)
Static pod: kube-controller-manager-node-1 hash: ecf9c37413eace225bc60becabeddb3b
Static pod: kube-controller-manager-node-1 hash: 17b23c8c6fcf9b9f8a3061b3a2fbf633
[apiclient] Found 1 Pods for label selector component=kube-controller-manager
[upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!#更新成功
[upgrade/staticpods] Preparing for "kube-scheduler" upgrade
[upgrade/staticpods] Renewing scheduler.conf certificate
[upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-scheduler.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2019-09-15-12-41-40/kube-scheduler.yaml"
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/staticpods] This might take a minute or longer depending on the component/version gap (timeout 5m0s)
Static pod: kube-scheduler-node-1 hash: f44110a0ca540009109bfc32a7eb0baa
Static pod: kube-scheduler-node-1 hash: 18859150495c74ad1b9f283da804a3db
[apiclient] Found 1 Pods for label selector component=kube-scheduler
[upgrade/staticpods] Component "kube-scheduler" upgraded successfully! #更新成功
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config-1.15" in namespace kube-system with the configuration for the kubelets in the cluster
[kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.15" ConfigMap in the kube-system namespace
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
[bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
[bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
[addons] Applied essential addon: CoreDNS
[addons] Applied essential addon: kube-proxy

[upgrade/successful] SUCCESS! Your cluster was upgraded to "v1.15.1". Enjoy! #更新成功提示
[upgrade/kubelet] Now that your control plane is upgraded, please proceed with upgrading your kubelets if you haven't already done so.
```

6、上述可看到master升级成功的信息，升级指特定版本只需要在apply的后面指定具体的版本即可，升级完完master后可以升级各个组件的plugin，详情参考不同网络的升级步骤，如flannel，calico等，升级过程升级对应的DaemonSets即可。

7、升级kubelet版本并重启kubelet服务，至此，master节点版本升级完毕。

```js
[root@node-1 ~]# yum install -y kubelet-1.15.1-0 kubectl-1.15.1-0 --disableexcludes=kubernetes
[root@node-1 ~]# systemctl daemon-reload
[root@node-1 ~]# systemctl restart kubelet
```

## 1.4 升级worker节点

1、升级kubeadm和kubelet软件包

```js
[root@node-2 ~]# yum install -y kubelet-1.15.1-0  --disableexcludes=kubernetes
[root@node-2 ~]# yum install -y kubeadm-1.15.1-0 --disableexcludes=kubernetes
[root@node-2 ~]# yum install -y kubectl-1.15.1-0 --disableexcludes=kubernetes
```

2、设置节点进入维护模式并驱逐worker节点上的应用，会将出了DaemonSets之外的其他应用迁移到其他节点上

```js
设置维护和驱逐：
[root@node-1 ~]# kubectl drain node-2 --ignore-daemonsets
node/node-2 cordoned
WARNING: ignoring DaemonSet-managed Pods: kube-system/kube-flannel-ds-amd64-tm6wj, kube-system/kube-proxy-2wqhj
evicting pod "coredns-5c98db65d4-86gg7"
evicting pod "demo-7b86696648-djvgb"
pod/demo-7b86696648-djvgb evicted
pod/coredns-5c98db65d4-86gg7 evicted
node/node-2 evicted

查看node的情况，此时node-2多了SchedulingDisabled标识位，即新的node都不会调度到该节点上
[root@node-1 ~]# kubectl get nodes
NAME     STATUS                     ROLES    AGE   VERSION
node-1   Ready                      master   26h   v1.15.1
node-2   Ready,SchedulingDisabled   <none>   26h   v1.14.1
node-3   Ready                      <none>   26h   v1.14.1

查看node-2上的pods，pod都已经迁移到其他node节点上
[root@node-1 ~]# kubectl get pods --all-namespaces -o wide 
NAMESPACE     NAME                             READY   STATUS    RESTARTS   AGE    IP               NODE     NOMINATED NODE   READINESS GATES
default       demo-7b86696648-6f22r            1/1     Running   0          30s    10.244.2.5       node-3   <none>           <none>
default       demo-7b86696648-fjmxn            1/1     Running   0          116m   10.244.2.2       node-3   <none>           <none>
default       demo-7b86696648-nwwxf            1/1     Running   0          116m   10.244.2.3       node-3   <none>           <none>
kube-system   coredns-5c98db65d4-cqbbl         1/1     Running   0          30s    10.244.0.6       node-1   <none>           <none>
kube-system   coredns-5c98db65d4-g59qt         1/1     Running   2          28m    10.244.2.4       node-3   <none>           <none>
kube-system   etcd-node-1                      1/1     Running   0          13m    10.254.100.101   node-1   <none>           <none>
kube-system   kube-apiserver-node-1            1/1     Running   0          13m    10.254.100.101   node-1   <none>           <none>
kube-system   kube-controller-manager-node-1   1/1     Running   0          13m    10.254.100.101   node-1   <none>           <none>
kube-system   kube-flannel-ds-amd64-99tjl      1/1     Running   1          26h    10.254.100.101   node-1   <none>           <none>
kube-system   kube-flannel-ds-amd64-jp594      1/1     Running   0          26h    10.254.100.103   node-3   <none>           <none>
kube-system   kube-flannel-ds-amd64-tm6wj      1/1     Running   0          26h    10.254.100.102   node-2   <none>           <none>
kube-system   kube-proxy-2wqhj                 1/1     Running   0          28m    10.254.100.102   node-2   <none>           <none>
kube-system   kube-proxy-k7c4f                 1/1     Running   1          27m    10.254.100.101   node-1   <none>           <none>
kube-system   kube-proxy-zffgq                 1/1     Running   0          28m    10.254.100.103   node-3   <none>           <none>
kube-system   kube-scheduler-node-1            1/1     Running   0          13m    10.254.100.101   node-1   <none>           <none>
```

3、升级worker节点

```js
[root@node-2 ~]# kubeadm upgrade node 
[upgrade] Reading configuration from the cluster...
[upgrade] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -oyaml'
[upgrade] Skipping phase. Not a control plane node[kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.15" ConfigMap in the kube-system namespace
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[upgrade] The configuration for this node was successfully updated!
[upgrade] Now you should go ahead and upgrade the kubelet package using your package manager.
```

4、重启kubelet服务

```js
[root@node-2 ~]# systemctl daemon-reload
[root@node-2 ~]# systemctl restart kubelet
```

5、取消节点调度标志，确保worker节点可正常调度

```js
[root@node-1 ~]# kubectl uncordon node-2
node/node-2 uncordoned
[root@node-1 ~]# kubectl get nodes 
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    master   27h   v1.15.1
node-2   Ready    <none>   27h   v1.15.1 #已升级成功
node-3   Ready    <none>   27h   v1.14.1
```

按照上述步骤升级node-3节点，如下是升级完成后所有节点版本状态：

```js
[root@node-1 ~]# kubectl get nodes
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    master   27h   v1.15.1
node-2   Ready    <none>   27h   v1.15.1
node-3   Ready    <none>   27h   v1.15.1
```

## 1.5 升级原理

1、kubeadm upgrade apply执行动作

- 检查集群是否具备更新条件，检查apiserver处于可用状态，所有node处于ready状态，确保cs组件正常
- 强制版本更新策略
- 检查更新所需镜像是否下载或者可拉取
- 更新所有控制节点组件，确保异常时能回滚到原有状态
- 更新kube-dns和kube-proxy的配置文件，确保所需的的RBAC授权配置正常
- 生成新的证书文件并备份证书（当证书超时超过180天）

2、kubeadm upgrade node执行动作

- 从kubeadm中获取ClusterConfiguration，即从集群中获取到更新集群的配置文件并应用
- 更新node节点上的kubelet配置信息和软件

# 2. 更新集群至1.15.3

截止至2019.9.15，当前kubernetes社区最新版本是1.15.3，本文演示以在线的方式升级kubernetes集群至1.15.3版本，步骤和前文操作类似。

1、安装最新软件包，kubeadm，kubelet，kubectl,三个节点均需要安装

```js
[root@node-1 ~]# yum install kubeadm kubectl kubelet 
已加载插件：fastestmirror, langpacks
Loading mirror speeds from cached hostfile
正在解决依赖关系
--> 正在检查事务
---> 软件包 kubeadm.x86_64.0.1.15.1-0 将被 升级
---> 软件包 kubeadm.x86_64.0.1.15.3-0 将被 更新
---> 软件包 kubectl.x86_64.0.1.15.1-0 将被 升级
---> 软件包 kubectl.x86_64.0.1.15.3-0 将被 更新
---> 软件包 kubelet.x86_64.0.1.15.1-0 将被 升级
---> 软件包 kubelet.x86_64.0.1.15.3-0 将被 更新
--> 解决依赖关系完成

依赖关系解决

========================================================================================================================================================================
 Package                                架构                                  版本                                      源                                         大小
========================================================================================================================================================================
正在更新:
 kubeadm                                x86_64                                1.15.3-0                                  kubernetes                                8.9 M
 kubectl                                x86_64                                1.15.3-0                                  kubernetes                                9.5 M
 kubelet                                x86_64                                1.15.3-0                                  kubernetes                                 22 M

事务概要
========================================================================================================================================================================
升级  3 软件包
```

2、升级master节点

```js
查看升级计划
[root@node-1 ~]# kubeadm upgrade plan
[upgrade/config] Making sure the configuration is correct:
[upgrade/config] Reading configuration from the cluster...
[upgrade/config] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -oyaml'
[preflight] Running pre-flight checks.
[upgrade] Making sure the cluster is healthy:
[upgrade] Fetching available versions to upgrade to
[upgrade/versions] Cluster version: v1.15.1
[upgrade/versions] kubeadm version: v1.15.3
[upgrade/versions] Latest stable version: v1.15.3
[upgrade/versions] Latest version in the v1.15 series: v1.15.3

Components that must be upgraded manually after you have upgraded the control plane with 'kubeadm upgrade apply':
COMPONENT   CURRENT       AVAILABLE
Kubelet     3 x v1.15.1   v1.15.3

Upgrade to the latest version in the v1.15 series:

COMPONENT            CURRENT   AVAILABLE
API Server           v1.15.1   v1.15.3
Controller Manager   v1.15.1   v1.15.3
Scheduler            v1.15.1   v1.15.3
Kube Proxy           v1.15.1   v1.15.3
CoreDNS              1.3.1     1.3.1
Etcd                 3.3.10    3.3.10

You can now apply the upgrade by executing the following command:

	kubeadm upgrade apply v1.15.3

_____________________________________________________________________

升级master节点
[root@node-1 ~]# kubeadm upgrade apply v1.15.3
```

3、升级worker节点,以此升级node-2和node-3节点

```js
设置五污点去驱逐
[root@node-1 ~]# kubectl drain node-2 --ignore-daemonsets

执行升级操作
[root@node-2 ~]# kubeadm upgrade node 
[root@node-2 ~]# systemctl daemon-reload
[root@node-2 ~]# systemctl restart kubelet

取消调度标志位
[root@node-1 ~]# kubectl uncordon node-2 
node/node-2 uncordoned

确认版本升级
[root@node-1 ~]# kubectl get nodes 
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    master   27h   v1.15.3
node-2   Ready    <none>   27h   v1.15.3
node-3   Ready    <none>   27h   v1.15.1
```

4、所有节点升级后的状态

```js
所有node状态
[root@node-1 ~]# kubectl get nodes 
NAME     STATUS   ROLES    AGE   VERSION
node-1   Ready    master   27h   v1.15.3
node-2   Ready    <none>   27h   v1.15.3
node-3   Ready    <none>   27h   v1.15.3

查看组件状态
[root@node-1 ~]# kubectl get componentstatuses 
NAME                 STATUS    MESSAGE             ERROR
scheduler            Healthy   ok                  
controller-manager   Healthy   ok                  
etcd-0               Healthy   {"health":"true"}   

查看应用状态
[root@node-1 ~]# kubectl get deployments --all-namespaces 
NAMESPACE     NAME      READY   UP-TO-DATE   AVAILABLE   AGE
default       demo      3/3     3            3           160m
kube-system   coredns   2/2     2            2           27h

查看DaemonSets状态
[root@node-1 ~]# kubectl get daemonsets --all-namespaces 
NAMESPACE     NAME                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                   AGE
kube-system   kube-flannel-ds-amd64   3         3         3       3            3           beta.kubernetes.io/arch=amd64   27h
kube-system   kube-proxy              3         3         3       3            3           beta.kubernetes.io/os=linux     27h
```

# 写在最后

 至此，通过上述的两个案例介绍了kubernetes离线升级（无法连接外网）和在线升级（需合理上网）的操作，升级master节点，升级node节点的流程和实现细节，对于体验新功能和线上版本升级提供指导。

# 参考文献

https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade-1-15/



> 『 转载 』该文章来源于网络，侵删。 
