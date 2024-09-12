---
title: "K8s Operator之controller Tools学习笔记"
date: 2024-09-12T16:07:54+08:00
lastmod: 2024-09-12T16:07:54+08:00
draft: false
description: ""
tags: ["k8s","controller-tools","operator"]
categories: ["k8s", "operator"]
keywords: []

author: "AGou-ops"

# weight:
# menu: "main"
# comment: true
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
> controller-tools是一个由 Kubernetes 社区维护的项目，用于简化 Kubernetes 控制器的开发。其中提供了一组工具来生成和更新 Kubernetes API 对象的代码，以及构建自定义控制器所需的代码框架。
> 
> 仓库地址：[GitHub - kubernetes-sigs/controller-tools: Tools to use with the controller-runtime libraries](https://github.com/kubernetes-sigs/controller-tools)

<!--more-->
## controller-tools包含工具与安装
### 包含工具
查看`controller-tools`源码的`cmd`目录可以发现，有以下三个cli工具：
- controller-gen：用于生成 zz_xxx.deepcopy.go 文件以及 crd 文件【kubebuilder也是通过这个工具生成crd的相关框架的】
- type-scaffold：用于生成所需的 types.go 文件
- helpgen：用于生成针对 Kubernetes API 对象的代码文档，可以包括 API 对象的字段、标签和注释等信息
### 安装
#### 从仓库release中下载
[Releases · kubernetes-sigs/controller-tools](https://github.com/kubernetes-sigs/controller-tools/releases)
但看着只有controller-gen这个工具，没有看到另外两个。
#### 从源码编译安装
```bash
git clone https://github.com/kubernetes-sigs/controller-tools.git
cd controller-tools
go mod tidy

# 直接安装到GOPATH bin目录下，需要提前把GOPATH bin添加进系统PATH，添加步骤在此不再赘述。
go install ./cmd/{controller-gen,type-scaffold,helpgen}
```
查看是否安装成功：
```bash
controller-gen
type-scaffold -h
helpgen
```
## 快速开始及示例






## 参考链接
-  [GitHub - kubernetes-sigs/controller-tools: Tools to use with the controller-runtime libraries](https://github.com/kubernetes-sigs/controller-tools)