---
title: "01 初探kubernetes功能与组件"
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


# 1. kubernetes简介

## 1.1 docker容器技术

> Docker provides a way to run applications securely isolated in a container, packaged with all its dependencies and libraries.Build once, Run anywhwere.

Docker提供了一种将应用程序安全，隔离运行的一种方式，能够将应用程序依赖和库文件打包在一个容器中，后续再任何地方运行起来即可，其包含了应用程序所依赖相关环境，一次构建，任意运行（build once，run anywhere）

![docker架构图](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B8%80%EF%BC%89%E4%BF%AF%E7%9E%B0kubernetes%E5%85%A8%E8%B2%8C/1%20-%201620.jpg)

Docker组成：

- Docker Daemon   容器管理组件，守护进程，负载容器，镜像，存储，网络等管理
- Docker Client      容器客户端，负责和Docker Daemon交互，完成容器生命周期管理
- Docker Registry   容器镜像仓库，负责存储，分发，打包
- Docker Object     容器对象，主要包含container和images

容器给应用程序开发环境带来很大的便利，从根本上解决了容器的环境依赖，打包等问题，然而，Docker带来的容器打包的便利，同时也带来了以下的挑战：

- 容器如何调度，分发
- 多台机器如何协同工作
- Docker主机故障时应用如何恢复
- 如何保障应用高可用，横向扩展，动态伸缩

## 1.2 kubernetes简介与功能

> Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications.It groups containers that make up an application into logical units for easy management and discovery. Kubernetes builds upon15 years of experience of running production workloads at Google, combined with best-of-breed ideas and practices from the community.

Kubernetes是google开源的一套微服务，容器化的编排引擎，提供容器话应用的自动化部署，横向扩展和管理，是google内部容器十多年实战沉淀的结晶，已战胜Swarm，Mesos成为容器编排的行业标准。

三大容器编排引擎：

- Swarm Docker原生提供的容器化编排引擎，随着docker支持kubernetes逐渐废弃
- Mesos 结合Marathon提供容器调度编排的能力，还能提供其他framwork的调度
- Kubernetes 已成为容器编排引擎的唯一标准，越来越多程序支持kubernetes。

kuberntes内置有很多非常优秀的特性使开发者专注于业务本身，其包含的功能如下：

![kubernetes功能](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B8%80%EF%BC%89%E4%BF%AF%E7%9E%B0kubernetes%E5%85%A8%E8%B2%8C/2%20-%201620.jpg)

- Service discovery and load balancing，服务发现和[负载均衡](#)，通过DNS实现内部解析，service实现负载均衡
- Storage orchestration，存储编排，通过plungin的形式支持多种存储，如本地，nfs，ceph，公有云快存储等
- Automated rollouts and rollbacks，自动发布与回滚，通过匹配当前状态与目标状态一致，更新失败时可回滚
- Automatic bin packing，自动资源调度，可以设置pod调度的所需（requests）资源和限制资源（limits）
- Self-healing，内置的健康检查策略，自动发现和处理集群内的异常，更换，需重启的pod节点
- Secret and configuration management，密钥和配置管理，对于敏感信息如密码，账号的那个通过secret存储，应用的配置文件通过configmap存储，避免将配置文件固定在镜像中，增加容器编排的灵活性
- Batch execution，批处理执行，通过job和cronjob提供单次批处理任务和循环计划任务功能的实现
- Horizontal scaling,横向扩展功能，包含有HPA和AS，即应用的基于CPU利用率的[弹性伸缩](#)和基于平台级的弹性伸缩，如自动增加node和删除nodes节点。

## 1.3 kubernetes架构解析

![kubernetes整体架构](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B8%80%EF%BC%89%E4%BF%AF%E7%9E%B0kubernetes%E5%85%A8%E8%B2%8C/3%20-%201620.jpg)

kubernetes包含两种角色：master节点和node节点，master节点是集群的控制管理节点，作为整个k8s集群的大脑。

- 负责集群所有接入请求(kube-apiserver)，在整个集群的入口；
- 集群资源调度(kube-controller-scheduler)，通过watch监视pod的创建，负责将pod调度到合适的node节点；
- 集群状态的一致性(kube-controller-manager)，通过多种控制器确保集群的一致性，包含有Node Controller，Replication Controller，Endpoints Controller等；
- 元数据信息存储(etcd)，数据持久存储化，存储集群中包括node，pod，rc，service等数据；

node节点是实际的工作节点，负责集群负载的实际运行，即pod运行的载体，其通常包含三个组件：Container Runtime，kubelet和kube-proxy

- Container Runtime是容器运行时，负责实现container生命周期管理，如docker，containerd，rktlet；
- kubelet负责镜像和pod的管理，
- kube-proxy是service服务实现的抽象，负责维护和转发pod的路由，实现集群内部和外部网络的访问。

其他组件还包括：

- cloud-controller-manager，用于公有云的接入实现，提供节点管理(node)，路由管理，服务管理(LoadBalancer和Ingress)，存储管理(Volume，如云盘，NAS接入)，需要由公有云厂商实现具体的细节，kubernetes提供实现接口的接入，如腾讯云目前提供CVM的node管理，节点的弹性伸缩(AS),负载均衡的接入(CLB),存储的管理([CBS](#)和CFS)等产品的集成；
- DNS组件由kube-dns或coredns实现集群内的名称解析；
- kubernetes-dashboard用于图形界面管理；
- kubectl命令行工具进行API交互；
- 服务外部接入，通过ingress实现七层接入，由多种controller控制器组成
  - traefik
  - nginx ingress controller
  - haproxy ingress controller
  - 公有云厂商ingress controller
- 监控系统用于采集node和pod的监控数据
  - metric-server  核心指标监控
  - prometheus    自定义指标监控，提供丰富功能
  - heapster+influxdb+grafana  旧核心指标监控方案，现已废弃
- 日志采集系统，用于收集容器的业务数据,实现日志的采集，存储和展示，由EFK实现
  - Fluentd  日志采集
  - ElasticSearch  日志存储+检索
  - Kiabana  数据展示

## 1.4 kubernetes高可用架构

kubernetes高可用集群通常由3或5个节点组成高可用集群，需要保障各个节点的高可用性

- etcd  内置集群机制，保障数据持久存储
- kube-apiserver  无状态api服务，有负载均衡调度器做负载分发，如haproxy或nginx
- kube-scheduler 内置选举机制，保障调度器高可用，确保同个时刻一个leader节点工作，其他处于阻塞，防止脑裂
- kube-controller-manager 内置的选举机制保障控制器高可用，机制和kube-scheduler一致。

![kubernetes高可用架构](https://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E4%B8%80%EF%BC%89%E4%BF%AF%E7%9E%B0kubernetes%E5%85%A8%E8%B2%8C/4%20-%201620.jpg)

# 参考文档

\1. kubernetes功能介绍，https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/

\2. kubernetes组件介绍https://kubernetes.io/docs/concepts/overview/components/

# 该系列文章声明
{% cq %} 该kubernetes系列教程均来源于 @happylau ，仅做略微修改，仅限于个人学习使用。 {% endcq %}

为防止原系列教程失效，故作此备份.

---

> 『 转载 』该文章来源于网络，侵删。 

