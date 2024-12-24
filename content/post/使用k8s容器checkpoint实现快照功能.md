---
title: 使用k8s CRI的checkpoint实现容器快照功能
date: 2024-11-07T09:57:55+08:00
lastmod: 2024-11-07T09:57:55+08:00
draft: false
description: ""
tags: ["k8s","containerd"]
categories: ["k8s", "CRI"]
keywords: 
author: AGou-ops
toc: true
autoCollapseToc: true
contentCopyright: <a href="http://www.wtfpl.net/about/" rel="noopener" target="_blank">WTFPL v2</a>
reward: true
mathjax: false
---
> Kubernetes v1.25 引入了[Container Checkpointing API 作为 alpha 功能](https://kubernetes.io/docs/reference/node/kubelet-checkpoint-api/)，并[在 Kubernetes v1.30 中达到了 beta 版](https://kubernetes.io/docs/reference/node/kubelet-checkpoint-api/)。这提供了一种备份和恢复 Pod 中运行的容器而无需停止它们的方法。此功能主要针对安全和取证分析，但任何 Kubernetes 用户都可以利用一般备份和恢复功能。

`checkpointing`是一种确保应用程序可以从故障中恢复并维持其状态的技术。它捕获正在运行的进程的状态，包括其内存、文件描述符和其他元数据。此信息存储为检查点，稍后可用于从同一时间点恢复进程，从而实现从故障或主机之间迁移的无缝恢复，**通俗来说就是容器快照功能**。
<!--more-->
## docker中实现
docker中有一个相关的功能，`docker pause`，其底层依赖于linux的[freezer cgroup](https://www.kernel.org/doc/Documentation/cgroup-v1/freezer-subsystem.txt)，用于暂停指定容器的所有进程。

`docker checkpoint`在底层使用了`CRIU`，因此在使用该功能之前需要提前安装`CRIU`这个包，它将容器状态转换为磁盘上的文件.
ℹ️注意该功能截止目前仍处于实验阶段。
### 示例
具体使用示例参考：[docker checkpoint | Docker Docs](https://docs.docker.com/reference/cli/docker/checkpoint/)
## k8s中实现（containerd v2.0.0）
先决条件：
- **CRIU**: 需要提前安装[CRIU](https://criu.org/Main_Page)工具；
- **Kubernetes cluster**: A v1.25+ Kubernetes cluster.  
- **Container runtime**: A container runtime that supports container checkpointing:  
    - [containerd](https://containerd.io/): Support from v2.0.  
    - [CRI-O](https://cri-o.io/): v1.25 has support for container checkpointing.  
- **CRI-O configuration**: To use checkpointing with CRI-O, the runtime needs to be started with the command-line option `--enable-criu-support=true`. 

这里我使用`k8s v1.31.2`和`containerd v2.0.0`作为示例。

调用`kubelet API`即可向底层`CRI`（containerd）发起`checkpoint`请求，`containerd`收到请求之后，会将指定检查点的存放放置于默认的`kubelet`工作录目录`/var/lib/kubelet/checkpoints`中，文档类型为tar归档，名称格式为`checkpoint-<podFullName>-<containerName>-<timestamp>.tar`
```bash
POST {kubeletURL}/checkpoint/{namespace}/{pod}/{container}
```
### 示例
首先使用`kubectl`运行一个测试pod：
```bash
kubectl run kuard -l app=kuard --image 163751/kuard:green
```
接着调用`kubelet API`创建检查点：
```bash
curl -k -XPOST "https://localhost:10250/checkpoint/default/kuard/kuard" \
  --cacert /etc/kubernetes/pki/ca.pem \
  --cert /etc/kubernetes/pki/apiserver-kubelet-client.pem \
  --key /etc/kubernetes/pki/apiserver-kubelet-client.key
# 示例输出
{"items":["/var/lib/kubelet/checkpoints/checkpoint-kuard_default-kuard-2024-11-07T11:14:12+08:00.tar"]}
```
此时观察pod状态，可以发现还是在正常运行，没有中断。

另外，可以使用[checkpointctl](https://github.com/checkpoint-restore/checkpointctl)工具，深度分析上面所生成的包：
```bash
checkpointctl show /var/lib/kubelet/checkpoints/checkpoint-kuard_default-kuard-2024-11-07T11:14:12+08:00.tar
# 示例输出
Displaying container checkpoint data from /var/lib/kubelet/checkpoints/checkpoint-kuard_default-kuard-2024-11-07T11:14:12+08:00.tar

+-----------+------------------------------+--------------+-----------------------+----------------------+------------+------------+-------------------+
| CONTAINER |            IMAGE             |      ID      |        RUNTIME        |       CREATED        |   ENGINE   | CHKPT SIZE | ROOT FS DIFF SIZE |
+-----------+------------------------------+--------------+-----------------------+----------------------+------------+------------+-------------------+
| kuard     | docker.io/163751/kuard:green | dfbb41f7991e | io.containerd.runc.v2 | 2024-11-07T01:59:26Z | containerd | 1.4 MiB    | 202 B             |
+-----------+------------------------------+--------------+-----------------------+----------------------+------------+------------+-------------------+
```
下面演示如何使用[GitHub - containers/buildah: A tool that facilitates building OCI images.](https://github.com/containers/buildah)恢复该镜像快照：
```bash
newcontainer=$(buildah from scratch)
buildah add $newcontainer /var/lib/kubelet/checkpoints/checkpoint-kuard_default-kuard-2024-11-07T11:14:12+08:00.tar /
buildah config --annotation=io.kubernetes.cri-o.annotations.checkpoint.name=kuard $newcontainer
buildah commit $newcontainer kuard/checkpoint-image:latest

buildah images
# 示例输出
REPOSITORY                         TAG      IMAGE ID       CREATED          SIZE
localhost/kuard/checkpoint-image   latest   4cadb7c8aea3   10 seconds ago   1.47 MB

# 推送到私有仓
buildah push localhost/kuard/checkpoint-image:latest registry.local:5000/kuard/checkpoint-image:latest


# 运行pod
kubectl run kuard-checkpoint-test --image registry.local:5000/kuard/checkpoint-image:latest
```
## 参考链接
- [reddit.com/r/kubernetes/comments/1gku57t/containerd\_20/](https://www.reddit.com/r/kubernetes/comments/1gku57t/containerd_20/)
- [CRIU](https://criu.org/Main_Page)
- [Forensic Container Checkpointing with CRIU in Kubernetes - Blog by Saifeddine Rajhi](https://seifrajhi.github.io/blog/k8s-criu-container-checkpointing/)
- [docker container pause | Docker Docs](https://docs.docker.com/reference/cli/docker/container/pause/)
- [docker checkpoint | Docker Docs](https://docs.docker.com/reference/cli/docker/checkpoint/)