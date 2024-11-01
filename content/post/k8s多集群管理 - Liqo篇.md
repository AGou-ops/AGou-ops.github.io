---
title: K8s多集群管理 - Liqo篇
date: 2024-11-01T10:26:47+08:00
lastmod: 2024-11-01T10:26:47+08:00
draft: false
description: ""
tags: 
categories: 
keywords: 
author: AGou-ops
toc: true
autoCollapseToc: true
contentCopyright: <a href="http://www.wtfpl.net/about/" rel="noopener" target="_blank">WTFPL v2</a>
reward: true
mathjax: false
---
> Liqo 是一个多集群管理平台，可以实现跨 Kubernetes 集群的动态资源调度。
> Liqo 允许在远程集群上无缝运行 Pod，而无需对 Kubernetes 和应用程序进行任何修改。有了 Liqo，就可以将 Kubernetes 集群的控制平面扩展到集群的边界，将整个远程集群映射成一个虚拟本地节点，从而可以实现原生的多集群。

<!--more-->
## 预先准备
概述：
- 两个可供测试使用的k8s集群；
- 集群中提供LB，可以使用metallb实现LB功能 --> [Installation :: MetalLB, bare metal load-balancer for Kubernetes](https://metallb.universe.tf/installation/)；
- 集群之间网络可以互通；
- liqoctl客户端工具 --> [Liqo CLI tool — Liqo](https://docs.liqo.io/en/stable/installation/liqoctl.html)；

我这里准备了两套环境，一个单节点的，一个三节点的集群（作为main集群），如下所示：
```bash
❯ kgno --kubeconfig ~/.kube/config.59
NAME                       STATUS   ROLES           AGE   VERSION
ailpha-node-10-20-183-59   Ready    control-plane   97m   v1.30.2
❯ kgno
NAME                     STATUS   ROLES           AGE     VERSION
master-01-10.20.183.80   Ready    control-plane   3d23h   v1.31.0
master-02-10.20.183.81   Ready    control-plane   3d23h   v1.31.0
master-03-10.20.183.82   Ready    control-plane   3d23h   v1.31.0
```
ℹ️单节点和集群安装k8s可以参考我修改的离线脚本：
- [GitHub - AGou-ops/k8s-binary-ansible: Deploy a Production Ready Kubernetes High Availability Cluster with Binary](https://github.com/AGou-ops/k8s-binary-ansible)
- [GitHub - AGou-ops/k8s-kubeadm-onekey](https://github.com/AGou-ops/k8s-kubeadm-onekey)
## 使用helm快速安装liqo
拉取`liqo`的helm chart：
```bash
# 添加liqo的helm仓库
helm repo add liqo https://helm.liqo.io/
# 更新helm仓库缓存
helm repo update
# 拉取liqo的helm chart并解压到当前目录
helm pull liqo/liqo --untar --untardir ./
```
为不同的集群修改相应的配置：
```bash
# 首先拷贝一份values.yaml给另外一个集群使用
cp -a values.yaml{,.59}

# 三节点k8s集群配置
vim values.yaml
# 1. 修改networkManager.conf.podCIDR和networkManager.conf.serviceCIDR
# 修改集群对应的网段
  config:
    podCIDR: "172.18.0.0/16"
    serviceCIDR: "10.64.0.0/16"

# 2. 修改discovery.config.clusterName，集群名称
  config:
    clusterIDOverride: ""
    clusterName: "main"

# 单节点k8s配置
vim values.yaml.59
# 1. 修改networkManager.conf.podCIDR和networkManager.conf.serviceCIDR
# 修改集群对应的网段
  config:
    podCIDR: "10.244.0.0/16"
    serviceCIDR: "10.96.0.0/12"


# 2. 修改discovery.config.clusterName，集群名称
  config:
    clusterIDOverride: ""
    clusterName: "standard"

```
使用`helm`安装`liqo`：
```bash
# main三节点k8s集群
helm install liqo -n liqo --create-namespace .

# standard单节点k8s
helm -n ~/.kube/config.59 install liqo -n liqo --create-namespace -f values.yaml.59 .
```
⚠️注意`-f`指定values文件。

使用`liqoctl`检查`liqo`集群是否安装成功（使用`--kubeconfig`可以指定集群连接信息）：
```bash
❯ liqoctl status
┌─ Namespace existence check ──────────────────────────────────────────────────────┐
|  INFO  ✔ liqo control plane namespace liqo exists                                |
└──────────────────────────────────────────────────────────────────────────────────┘

┌─ Control plane check ────────────────────────────────────────────────────────────┐
|  Deployment                                                                      |
|      liqo-controller-manager: Desired: 1, Ready: 1/1, Available: 1/1             |
|      liqo-crd-replicator:     Desired: 1, Ready: 1/1, Available: 1/1             |
|      liqo-metric-agent:       Desired: 1, Ready: 1/1, Available: 1/1             |
|      liqo-auth:               Desired: 1, Ready: 1/1, Available: 1/1             |
|      liqo-proxy:              Desired: 1, Ready: 1/1, Available: 1/1             |
|      liqo-network-manager:    Desired: 1, Ready: 1/1, Available: 1/1             |
|      liqo-gateway:            Desired: 1, Ready: 1/1, Available: 1/1             |
|  DaemonSet                                                                       |
|      liqo-route:              Desired: 3, Ready: 3/3, Available: 3/3             |
└──────────────────────────────────────────────────────────────────────────────────┘

┌─ Local cluster information ──────────────────────────────────────────────────────┐
|  Cluster identity                                                                |
|      Cluster ID:   0142b21a-c01b-4812-9d3b-3a819b5b1e25                          |
|      Cluster name: main                                                          |
|  Configuration                                                                   |
|      Version: v0.10.3                                                            |
|  Network                                                                         |
|      Pod CIDR:      172.18.0.0/16                                                |
|      Service CIDR:  10.64.0.0/16                                                 |
|      External CIDR: 10.65.0.0/16                                                 |
|  Endpoints                                                                       |
|      Network gateway:       udp://10.20.183.163:5871                             |
|      Authentication:        https://10.20.183.162                                |
|      Kubernetes API server: https://10.20.183.80:6443                            |
└──────────────────────────────────────────────────────────────────────────────────┘
```
> 安装完成之后，通过`kubectl get po -A`发现有的pod处于`OffloadingBackOff`状态，可以通过对`daemonset`添加节点亲和进行解决：
> 
> ```
> nodeAffinity:
  >   requiredDuringSchedulingIgnoredDuringExecution:
   >     nodeSelectorTerms:
   >     - matchExpressions:
   >        - key: liqo.io/type
   >          operator: DoesNotExist
   > ```
> 参考：[FAQ — Liqo](https://docs.liqo.io/en/stable/faq/faq.html#why-daemonsets-pods-e-g-kube-proxy-cni-pods-scheduled-on-virtual-nodes-are-in-offloadingbackoff)
## 连接两个集群（peer two clusters）
创建带外控制平面（Out-of-band control plane）：
```bash
liqoctl --kubeconfig ~/.kube/config.59 generate peer-command
# 示例输出

Execute this command on a *different* cluster to enable an outgoing peering with the current cluster:

liqoctl peer out-of-band standard --auth-url https://10.20.183.171 --cluster-id d6ece703-eb8a-49f2-90ed-2005bf206ef5 --auth-token 5e9e3f2cdc18c56b4a28aada9263dd96a75e1c23d788e04a9377db280470aa2215bb79d9148882643ebd27b39d22c865d66933b4b1cdb1576b62d6742e73b386

```
拷贝以上输出的命令，直接执行（三节点集群）：
```bash
liqoctl peer out-of-band standard --auth-url https://10.20.183.171 --cluster-id d6ece703-eb8a-49f2-90ed-2005bf206ef5 --auth-token 5e9e3f2cdc18c56b4a28aada9263dd96a75e1c23d788e04a9377db280470aa2215bb79d9148882643ebd27b39d22c865d66933b4b1cdb1576b62d6742e73b386
```

执行完成之后检查`foreignCluster`资源来查看对等连接是否成功建立：
```bash
kubectl get foreignCluster
# 示例输出
NAME       TYPE        OUTGOING PEERING   INCOMING PEERING   NETWORKING    AUTHENTICATION   AGE
standard   OutOfBand   Established        None               Established   Established      47m
```
此时可以通过`kubectl`命令查看已经创建好的虚拟节点：
```bash
kubectl get nodes -l liqo.io/type=virtual-node
# 示例输出
NAME            STATUS   ROLES   AGE   VERSION
liqo-standard   Ready    agent   50m   v1.31.0
```
## 实战示例
首先创建一个命名空间，并将这个命令空间作为liqo的工作负载：
```bash
kubectl create ns liqo-demo
liqoctl offload namespace liqo-demo
# unoffload命名空间
# liqoctl unoffload namespace foo
```
### 简单的pod
```bash
kubectl -n liqo-demo apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: nginx-local
  labels:
    app: liqo-demo
spec:
  containers:
    - name: nginx
      image: nginx
      imagePullPolicy: IfNotPresent
      ports:
        - containerPort: 80
          name: web
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: liqo.io/type
                operator: NotIn
                values:
                  - virtual-node
---
apiVersion: v1
kind: Pod
metadata:
  name: nginx-remote
  labels:
    app: liqo-demo
spec:
  containers:
    - name: nginx
      image: nginx
      imagePullPolicy: IfNotPresent
      ports:
        - containerPort: 80
          name: web
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: liqo.io/type
                operator: In
                values:
                  - virtual-node
---
apiVersion: v1
kind: Service
metadata:
  name: liqo-demo
spec:
  ports:
    - name: web
      port: 80
      protocol: TCP
      targetPort: web
  selector:
    app: liqo-demo
  type: ClusterIP
EOF

```
ℹ️需要注意点就是上面的节点亲和配置。
查看已经创建的pod：
```bash
❯ kgpon liqo-demo -owide
# 
NAME           READY   STATUS    RESTARTS   AGE   IP             NODE                     NOMINATED NODE   READINESS GATES
nginx-local    1/1     Running   0          49m   172.18.1.226   master-01-10.20.183.80   <none>           <none>
nginx-remote   1/1     Running   0          49m   10.244.0.38    liqo-standard            <none>           <none>
```
可以看到`nginx-remote`这个pod跑在了虚拟节点上，也就是我们的另外一个集群。
在另外一个集群，也就是单节点的k8s上查看：
```bash
❯ kgpoallowide --kubeconfig ~/.kube/config.59 | grep nginx-remote
# 示例输出
liqo-demo-main-3d6661   nginx-remote                                       1/1     Running   0              52m    10.244.0.38    ailpha-node-10-20-183-59   <none>           <none>

```
可以看到`nginx-remote`跑在了一个名为`liqo-demo-main-3d6661`的命名空间里，使用curl访问service服务正常且不同集群里面的nginx pod能正确处理和返回请求。
### deployment示例
```bash
kubectl -n liqo-demo apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: liqo-demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: liqo-demo-app
  template:
    metadata:
      labels:
        app: liqo-demo-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: liqo-demo-app
      containers:
      - name: nginx
        image: nginx
        ports:
        - containerPort: 80
EOF
```
## 参考链接
- [What is Liqo? — Liqo](https://docs.liqo.io/en/stable/index.html)