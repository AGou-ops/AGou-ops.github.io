---
title: "19 Dashboard使k8s普及大众"
date: 2019-08-04T10:36:49+08:00
lastmod: 2019-08-04T10:36:49+08:00
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

前面的[kubernets系列文章]()介绍了通过命令行和yaml文件的方式对kubernetes中资源的管理，命令行和yaml文件方式管理对于管理员来说无疑是利器，而对于普通大众来说，图形管理界面需求则为更迫切的方式，本章介绍kubernetes社区提供的一个图形界面管理工具：kubernetes-dashboard，通过一个WebUI管理kubernetes的资源。

# 1. kubernetes-dashboard简介

kubernetes中管理集群中资源的方式通常有四种：命令行、YAML、API和图形界面，四种不同的方式适用于不同的人群和场景，对比如下：

- 命令行kubectl，kubectl提供了命令行管理kubernetes资源
  - 优点：使用方便、便捷、快速管理集群资源
  - 缺点：功能相对有限，部分操作无法支持，有一定的门槛
- YAML资源定义，kubernetes中最终转换形式，推荐使用方式
  - 优点：功能齐备，能够定义kubernetes的所有对象和资源
  - 缺点：门槛较高，需要具备专业技术能力，使用排障难度大
- API管理接入，提供各种编程语言SDK接口，方便各种编程语言应用程序接入
  - 优点：适配各种编程语言，如Java，Go，Python，C等，方便开发kubernetes
  - 缺点：门槛较高，适用于开发人员
- 图形kubernetes-dashboard，提供图形化管理界面，能够利用metric-server实现node和pod的监控
  - 优点：使用简单，便捷，适合大众。
  - 缺点：功能相对简单，功能原生，适用于demo

# 2. **kubernetes-**dashboard安装

社区提供了kubernetes-dashbaord的YAML资源定义文件，直接下载YAML文件安装即可实现dashboard的安装接入，需要准备条件如下：

- 已安装好的kubernetes集群，本文环境为1.15.3
- metric-server监控，node监控和pod监控视图需依赖于监控系统
- RBAC认证授权，设置好账户并授予访问权限

1、下载kubernetes-dashboard安装文件并应用YAML资源定义

```js
[root@node-1 ~]# kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.0-beta8/aio/deploy/recommended.yaml
namespace/kubernetes-dashboard created
serviceaccount/kubernetes-dashboard created
service/kubernetes-dashboard created
secret/kubernetes-dashboard-certs created
secret/kubernetes-dashboard-csrf created
secret/kubernetes-dashboard-key-holder created
configmap/kubernetes-dashboard-settings created
role.rbac.authorization.k8s.io/kubernetes-dashboard created
clusterrole.rbac.authorization.k8s.io/kubernetes-dashboard configured
rolebinding.rbac.authorization.k8s.io/kubernetes-dashboard created
clusterrolebinding.rbac.authorization.k8s.io/kubernetes-dashboard unchanged
deployment.apps/kubernetes-dashboard created
service/dashboard-metrics-scraper created
deployment.apps/dashboard-metrics-scraper created
```

安装文件中定义了dashboard相关的资源，可以查阅YAML文件，资源包含有：

- kubernetes-dashboard命名空间
- ServiceAccount访问用户
- Service服务访问应用，默认为ClusterIP
- Secrets，存放有kubernetes-dashboard-certs，kubernetes-dashboard-csrf，kubernetes-dashboard-key-holder证书
- ConfigMap配置文件
- RBAC认证授权，包含有Role，ClusterRole，RoleBinding，ClusterRoleBinding
- Deployments应用，kubernetes-dashboard核心镜像，还有一个和监控集成的dashboard-metrics-scraper

2、校验资源的安装情况，kubernetes-dashbaord的资源都安装在kubernetes-dashboard命名空间下,包含有Deployments，Services，Secrets，ConfigMap等

![kubernetes-dashboard安装校验](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/1%20-%20qfgj5u3014.gif)

3、kubernetes-dashbaord安装完毕后，kubernetes-dashboard默认service的类型为ClusterIP，为了从外部访问控制面板，开放为NodePort类型

![修改kubernetes-dashboard service类型](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/2%20-%20hdifejzdkg.gif)
4、此时通过https协议访问30433端口即可打开dashboard的控制台，为了保护数据安全性，集群默认开启了RBAC认证授权，需要授予权限的用户才可以访问到kubernetes集群，因此需要授权用户访问集群，集群中已定有了cluster-admin的角色和相关的Role，ClusterRole和ClusterRoleBinding角色，定义ServiceAccount将其关联即可，如下:

```js
[root@node-1 ~]# cat dashboard-rbac.yaml 
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: happylau 
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: happylau
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: happylau 
  namespace: kubernetes-dashboard
```

5、应用RBAC规则，创建一个happylau的用户，并和cluster-admin的角色关联

```js
[root@node-1 ~]# kubectl apply -f dashboard-rbac.yaml 
serviceaccount/happylau created
clusterrolebinding.rbac.authorization.k8s.io/happylau created
[root@node-1 ~]# kubectl get serviceaccounts -n kubernetes-dashboard 
NAME                   SECRETS   AGE
default                1         114m
happylau               1         8s
kubernetes-dashboard   1         114m
```

6、此时通过kubernetes-dashboard-csrf服务会自动创建一个和用户名关联的Secrets，通过token字段来登陆，token通过base64加密，解密后即可登录，如下演示登录的过程

![kubernetes-dashboard获取token登录](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/3%20-%20gkqlkgm9gd.gif)

自此，kubernetes-dashboard安装完毕，通过RBAC认证授权特定用户访问集群权限，接下来一起探索dashboard带来的魔力吧。

# 3. 探索**kubernetes-dashboard**

kubernetes-dashboard图形工具能提供以下功能：

- 查看kubernetes中的资源对象，包含kubernetes中各种资源
  - Cluster  集群级别的资源，如命名空间，节点，PV，StorageClass，ClusterRole等
  - Workloads，不同类型的工作负载，包含Deployments，StatefulSets，DaemonSets，Jobs等
  - Discovery and LoadBalancing，服务发现和负载均衡，包含service和ingress
  - ConfigMap and Storage，包含ConfigMap，Secrets和PVC
  - Costom Resource Definition，自定义资源定义
- kubernetes资源监控，调用metric-server监控系统，实现Cluster集群，Workloads应用负载，存储等资源的监控
- 管理资源对象，包含创建，编辑yaml，删除负载等，主要是以Deployments等应用为主的管理

1、查看集群整体概览资源，可以看到整体集群，应用负载，Pod资源的资源使用情况

![资源概览](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/4%20-%20rulsbe0plr.gif)

2、Cluster集群资源管理，包含还有Nodes，Namespace，StorageClass等，提供在线编辑yaml方式

![集群资源](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/5%20-%20hrg1tbf83c.gif)

3、查看应用工作负载Workloads，包含各种不同的工作负载如Deployments，StatefulSets，Jobs等

![工作负载](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/6%20-%20ep74ttkzsq.gif)

4、部署Deployments工作负载，支持从YAML文件输入，YAML文件加载和图形界面部署应用

![部署工作负载](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/7%20-%206hzcg7s761.gif)

5、工作负载管理，扩展工作负载副本数目，滚动更新等

![扩展副本+滚动更新](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/8%20-%20a2mvzinf2o.gif)

6、远程登录容器和查看容器日志

![登录容器和查看日志](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81%E4%B8%80)dashboard%E4%BD%BFk8s%E6%99%AE%E5%8F%8A%E5%A4%A7%E4%BC%97/9%20-%20wg24e0cujb.gif)

# 写在最后

kubernetes-dashboard提供了原生的k8s管理工具，提供一个便捷的可视化界面，方便使用控制台管理k8s资源，dashboard提供的功能相对原生，企业可以根据公司的需求通过api进行二次开发，以满足需求。对于k8s管理员而言，一般以使用命令行或yaml文件为主。

# 参考文献

dashboard安装手册：https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/

RBAC认证授权：https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/

> 『 转载 』该文章来源于网络，侵删。 

