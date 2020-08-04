---
title: "18 Prometheus提供完备监控系统"
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

上一个章节中[kubernetes系列教程(十九)使用metric-server让HPA弹性伸缩愉快运行]()介绍了在kubernetes中的监控架构，通过安装和使用metric-server提供kubernetes中的核心监控指标：提供node节点和pod容器CPU和内存的监控能力，核心监控指标提供的监控维度和指标相对有限，需要更好的扩展监控能力，需要使用自定义监控来实现，本文介绍prometheus提供更更加丰富的自定义监控能力。

# 1. 初识prometheus

## 1.1 prometheus简介

> Prometheus is an open-source systems monitoring and alerting toolkit originally built at SoundCloud. It is now a standalone open source project and maintained independently of any company. To emphasize this, and to clarify the project's governance structure, Prometheus joined theCloud Native Computing Foundationin 2016 as the second hosted project, afterKubernetes.

Prometheus是一个开源的监控系统+告警系统工具集，最早由SoudCloud开发，目前已被很多公司广泛使用，于2016年加入CNCF组织，成为继kubernetes之后第二个管理的项目。得益于kubernetes的火热，prometheus被越来越多的企业应用，已成为新一代的监控系统，成为CNCF第二个毕业的项目。

**prometheus特点**：

- 一个指标和键值对标识的时间序列化多维度数据模型
- PromQL提供一个便捷查询语言实现多维度数据查询
- 不依赖于分布式存储，单个节点能提供自治功能
- 通过HTTP协议拉取时间系列数据模型
- 支持通过gateway主动推送时间序列
- 支持服务发现或者静态配置发现节点
- 内置有多维度数据画图和集成grafana数据展示

## 1.2 prometheus架构

![prometheus架构](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/1%20-%201620.jpg)

**prometheus架构：**

- prometheus-server，prometheus主服务端，从exporters端采集和存储数据，并提供PromQL数据查询语言
  - Retrieval      采集模块，从exporters和pushgateway中采集数据，采集数据经过一定规则处理
  - TSDB          数据存储，TSDB是时序化数据库，将Retrieval采集数据存储，默认存储在本地
  - http server   提供http接口查询和数据展板，默认端口是9090，可以登陆查询监控指标和绘图
  - PromQL      提供边界的PromQL语言，用于数据统计，数据输出和数据展示接口集成
- 数据采集，数据采集模块，包含两种数据采集方式：拉去pull和推送push
  - Jobs exporters    采集宿主机和container的性能指标，通过http方式拉取，支持多种不同数据类型采集
  - Short-lived jobs  瞬时在线任务，适用于实时监控指标，server端拉去时可能消失了，采用主动上报机制
  - Pushgateway      推动网关，Short-lived jobs将数据主动push到过gateway，server再从gateway拉取
- 数据展示，借助于PromQL语言实现实现数据的展示，包含还有prometheus UI，Gafana和API clients
  - Prometheus Web UI，prometheus默认提一个数据查询和画图展示的UI，通过http 9090端口
  - Grafana，一个开源非常优秀绚烂的数据展示框架，从Prometheus中获取数据，采用模版绘图
  - API Clients，支持多种不同的客户端SDK语言，包括Go，python，Java等，便于编写开发监控系统
- 告警系统，从server接受告警，推送给AlertManager告警系统，告警系统接受告警信息去重，分组。通知包含
  - pageduty
  - Email，邮件告警，结合smtp
  - 其他，如webhook等
- 服务发现，借助于第三方接口实现服务机制，如DNS，Consul，Kubernetes等，如和kubernetes apiserver结合，获取目标target的是列表，并定期轮训获取到监控数据。

# 2. prometheus和kubernetes结合

## 2.1 prometheus安装简介

prometheus安装涉及较多的组件，因此给安装带来较大的困难，kube-prometheus是coreos公司提供在kubernets中自动安装prometheus的组件，为集成kuberntes提供的安装，包含如下组件：

- The Prometheus Operator        prometheus核心组件
- Highly available Prometheus     提供高可用能力
- Highly available Alertmanager   告警管理器
- Prometheus node-exporter      数据采集组件
- Prometheus Adapter for Kubernetes Metrics APIs   和kubernetes集成的适配器
- kube-state-metrics                指标监控转换，使之适配kubernetes风格的接口
- Grafana                                 数据展示

安装环境：

1、kubernetes版本,1.15.3

```js
[root@node-1 ~]# kubectl version
Client Version: version.Info{Major:"1", Minor:"15", GitVersion:"v1.15.3", GitCommit:"2d3c76f9091b6bec110a5e63777c332469e0cba2", GitTreeState:"clean", BuildDate:"2019-08-19T11:13:54Z", GoVersion:"go1.12.9", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"15", GitVersion:"v1.15.3", GitCommit:"2d3c76f9091b6bec110a5e63777c332469e0cba2", GitTreeState:"clean", BuildDate:"2019-08-19T11:05:50Z", GoVersion:"go1.12.9", Compiler:"gc", Platform:"linux/amd64"}
```

2、prometheus版本

```js
prometheus  v2.12.0
prometheus-operator v0.34.0
node-exporter v0.18.1
alertmanager  v0.20.0
grafana  6.4.3
```

## 2.2 prometheus安装

1、获取kube-prometheus安装源

```js
[root@node-1 ~]# git clone https://github.com/coreos/kube-prometheus.git
```

2、快速安装prometheus组件，相关的setup包的yaml文件在setup目录下,包含有很多自定义的CRD资源

```js
[root@node-1 ~]# kubectl apply -f kube-prometheus/manifests/setup/
namespace/monitoring created
customresourcedefinition.apiextensions.k8s.io/alertmanagers.monitoring.coreos.com unchanged
customresourcedefinition.apiextensions.k8s.io/podmonitors.monitoring.coreos.com unchanged
customresourcedefinition.apiextensions.k8s.io/prometheuses.monitoring.coreos.com unchanged
customresourcedefinition.apiextensions.k8s.io/prometheusrules.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/servicemonitors.monitoring.coreos.com created
clusterrole.rbac.authorization.k8s.io/prometheus-operator created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-operator created
deployment.apps/prometheus-operator created
service/prometheus-operator created
serviceaccount/prometheus-operator created

校验CRD资源安装情况,prometheus,alertmanagers,rules,servicemonitor均以CRM资源的方式部署
[root@node-1 ~]# kubectl get customresourcedefinitions.apiextensions.k8s.io |grep monitoring
alertmanagers.monitoring.coreos.com       2020-01-30T05:36:58Z
podmonitors.monitoring.coreos.com         2020-01-30T05:37:06Z
prometheuses.monitoring.coreos.com        2020-01-30T05:37:18Z
prometheusrules.monitoring.coreos.com     2020-01-30T05:44:05Z
servicemonitors.monitoring.coreos.com     2020-01-30T05:44:06Z

部署了一个prometheus-operator的deployments和services
[root@node-1 ~]# kubectl get deployments -n monitoring 
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
prometheus-operator   1/1     1            1           3m5s
[root@node-1 ~]# kubectl get services -n monitoring 
NAME                  TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE
prometheus-operator   ClusterIP   None         <none>        8080/TCP   3m13s
```

3、部署prometheus其他组件，包含kube-state-metric，grafana，node-exporter，alertmanager，prometheus-adapter，prometheus，组件包含在manifest所在目录，安装组件的角色如下：

- prometheus                prometheus核心组件
- prometheus-adapter   prometheus适配器，做数据转换
- kube-state-metrics    kubernetes指标转换器，转换为apiserver能识别的指标
- alertmanager             告警管理器，用于指标阀值告警实现
- node-exporter           exporters，客户端监控上报agent，用于实现数据上报
- grafana                    数据显示展板
- configmaps              grafana数据展板配置模版，封装在configmap中
- clusterrole，clusterrolebinding    prometheus访问kubernetes的RBAC授权 

```js
[root@node-1 ~]# kubectl apply -f kube-prometheus/manifests/
alertmanager.monitoring.coreos.com/main created
secret/alertmanager-main created
service/alertmanager-main created
serviceaccount/alertmanager-main created
servicemonitor.monitoring.coreos.com/alertmanager created
secret/grafana-datasources created
configmap/grafana-dashboard-apiserver created
configmap/grafana-dashboard-cluster-total created
configmap/grafana-dashboard-controller-manager created
configmap/grafana-dashboard-k8s-resources-cluster created
configmap/grafana-dashboard-k8s-resources-namespace created
configmap/grafana-dashboard-k8s-resources-node created
configmap/grafana-dashboard-k8s-resources-pod created
configmap/grafana-dashboard-k8s-resources-workload created
configmap/grafana-dashboard-k8s-resources-workloads-namespace created
configmap/grafana-dashboard-kubelet created
configmap/grafana-dashboard-namespace-by-pod created
configmap/grafana-dashboard-namespace-by-workload created
configmap/grafana-dashboard-node-cluster-rsrc-use created
configmap/grafana-dashboard-node-rsrc-use created
configmap/grafana-dashboard-nodes created
configmap/grafana-dashboard-persistentvolumesusage created
configmap/grafana-dashboard-pod-total created
configmap/grafana-dashboard-pods created
configmap/grafana-dashboard-prometheus-remote-write created
configmap/grafana-dashboard-prometheus created
configmap/grafana-dashboard-proxy created
configmap/grafana-dashboard-scheduler created
configmap/grafana-dashboard-statefulset created
configmap/grafana-dashboard-workload-total created
configmap/grafana-dashboards created
deployment.apps/grafana created
service/grafana created
serviceaccount/grafana created
servicemonitor.monitoring.coreos.com/grafana created
clusterrole.rbac.authorization.k8s.io/kube-state-metrics created
clusterrolebinding.rbac.authorization.k8s.io/kube-state-metrics created
deployment.apps/kube-state-metrics created
role.rbac.authorization.k8s.io/kube-state-metrics created
rolebinding.rbac.authorization.k8s.io/kube-state-metrics created
service/kube-state-metrics created
serviceaccount/kube-state-metrics created
servicemonitor.monitoring.coreos.com/kube-state-metrics created
clusterrole.rbac.authorization.k8s.io/node-exporter created
clusterrolebinding.rbac.authorization.k8s.io/node-exporter created
daemonset.apps/node-exporter created
service/node-exporter created
serviceaccount/node-exporter created
servicemonitor.monitoring.coreos.com/node-exporter created
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io created
clusterrole.rbac.authorization.k8s.io/prometheus-adapter created
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-adapter created
clusterrolebinding.rbac.authorization.k8s.io/resource-metrics:system:auth-delegator created
clusterrole.rbac.authorization.k8s.io/resource-metrics-server-resources created
configmap/adapter-config created
deployment.apps/prometheus-adapter created
rolebinding.rbac.authorization.k8s.io/resource-metrics-auth-reader created
service/prometheus-adapter created
serviceaccount/prometheus-adapter created
clusterrole.rbac.authorization.k8s.io/prometheus-k8s created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-k8s created
servicemonitor.monitoring.coreos.com/prometheus-operator created
prometheus.monitoring.coreos.com/k8s created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s-config created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s created
role.rbac.authorization.k8s.io/prometheus-k8s-config created
role.rbac.authorization.k8s.io/prometheus-k8s created
role.rbac.authorization.k8s.io/prometheus-k8s created
role.rbac.authorization.k8s.io/prometheus-k8s created
prometheusrule.monitoring.coreos.com/prometheus-k8s-rules created
service/prometheus-k8s created
serviceaccount/prometheus-k8s created
servicemonitor.monitoring.coreos.com/prometheus created
servicemonitor.monitoring.coreos.com/kube-apiserver created
servicemonitor.monitoring.coreos.com/coredns created
servicemonitor.monitoring.coreos.com/kube-controller-manager created
servicemonitor.monitoring.coreos.com/kube-scheduler created
servicemonitor.monitoring.coreos.com/kubelet created
```

4、校验prometheus安装情况，包括node-exporter、kube-state-metrics、prometheus-adapter、alertmanager

、grafana等

```js
#node-exporter agent上报端,通过DaemonSets部署
[root@node-1 ~]# kubectl get daemonsets -n monitoring 
NAME            DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
node-exporter   3         3         3       3            3           kubernetes.io/os=linux   12m
[root@node-1 ~]# kubectl get pods -n monitoring  |grep node-exporter
node-exporter-gq26x                   2/2     Running   0          12m
node-exporter-nvfh4                   2/2     Running   0          12m
node-exporter-zg95v                   2/2     Running   0          12m


#prometheus-adapter，grafana，kube-state-metrics以deployments的形式部署
[root@node-1 ~]# kubectl get deployments -n monitoring 
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
grafana               1/1     1            1           13m
kube-state-metrics    1/1     1            1           13m
prometheus-adapter    1/1     1            1           13m
prometheus-operator   1/1     1            1           3h33m

#prometheus核心组件和告警组件，以statefulsets的形式部署
[root@node-1 ~]# kubectl get statefulsets.apps -n monitoring 
NAME                READY   AGE
alertmanager-main   3/3     15m
prometheus-k8s      2/2     15m

#服务暴露，包括grafana，prometheus等
[root@node-1 ~]# kubectl get services -n monitoring 
NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
alertmanager-main       ClusterIP   10.106.114.121   <none>        9093/TCP                     13m
alertmanager-operated   ClusterIP   None             <none>        9093/TCP,9094/TCP,9094/UDP   13m
grafana                 ClusterIP   10.105.229.156   <none>        3000/TCP                     13m
kube-state-metrics      ClusterIP   None             <none>        8443/TCP,9443/TCP            13m
node-exporter           ClusterIP   None             <none>        9100/TCP                     13m
prometheus-adapter      ClusterIP   10.106.46.187    <none>        443/TCP                      13m
prometheus-k8s          ClusterIP   10.108.126.97    <none>        9090/TCP                     13m
prometheus-operated     ClusterIP   None             <none>        9090/TCP                     13m
prometheus-operator     ClusterIP   None             <none>        8080/TCP
```

# 3. prometheus使用

## 3.1 prometheus原生指标

prometheus-k8s默认提供ClusterIP开放9090端口用于集群内部，修改为NodePort供集群外部访问，如下修改将prometheus-k8s的类型修改为NodePort类型

```js
[root@node-1 ~]# kubectl patch -p '{"spec":{"type": "NodePort"}}' services -n monitoring prometheus-k8s
service/prometheus-k8s patched

[root@node-1 ~]# kubectl get services -n monitoring prometheus-k8s -o yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"labels":{"prometheus":"k8s"},"name":"prometheus-k8s","namespace":"monitoring"},"spec":{"ports":[{"name":"web","port":9090,"targetPort":"web"}],"selector":{"app":"prometheus","prometheus":"k8s"},"sessionAffinity":"ClientIP"}}
  creationTimestamp: "2020-01-30T09:04:03Z"
  labels:
    prometheus: k8s
  name: prometheus-k8s
  namespace: monitoring
  resourceVersion: "18773330"
  selfLink: /api/v1/namespaces/monitoring/services/prometheus-k8s
  uid: 272e8f9a-d412-4f42-9553-da5f7e71cf2f
spec:
  clusterIP: 10.108.126.97
  externalTrafficPolicy: Cluster
  ports:
  - name: web
    nodePort: 31924    #NodePort端口
    port: 9090
    protocol: TCP
    targetPort: web
  selector:
    app: prometheus
    prometheus: k8s
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
  type: NodePort
status:
  loadBalancer: {}
```

1、查询prometheus监控指标，prometheus包含有丰富的指标，可以选择不同的监控指标

![prometheus监控指标](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/2%20-%20gpjzsyix9o.gif)

选择container_cpu_usage_seconds_total查询容器的cpu使用率为例，执行Excute执行查询，可以获取到所有容器的cpu使用数据，切换至Graph可以绘制简单的图像，图像显示相对简单，指标通过grafana显示会更绚烂，一般较少使用prometheus的绘图功能

![prometheus指标+绘图](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/3%20-%20qczw5x71i5.gif)

2、服务发现，用于动态发现prometheus服务相关的组件，并定期向服务组件拉取数据

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/4%20-%20jk3ow87to5.gif)

3、内置告警规则，默认内置定义有alert告警规则，用户实现监控告警切换到alerts为告警的内容，可以看到告警的指标。

![prometheus告警规则](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/5%20-%20bvk0olwc3a.gif)

prometheus提供了丰富的监控指标metric，并通过9090的http端口提供了外部访问监控指标和简单绘图的功能，相比grafana而言，图形界面的功能相对简单，主要用于查询prometheus数据，借助于PromQL语言查询监控指标数据。

## 3.2 grafana数据展示

相比于prometheus web UI，grafana能够提供更丰富的数据展示功能，起借助于PromQL语言实现丰富的数据查询并通过模版展示控制台，grafana默认的3000端口并未对外部开放，为了从集群外部访问grafana，需要将grafana的servcie类型修改为NodePort,开放NodePort端口为30923

```js
[root@node-1 ~]# kubectl patch -p '{"spec": {"type": "NodePort"}}' services grafana -n monitoring
service/grafana patched

[root@node-1 ~]# kubectl get services grafana -n monitoring 
NAME      TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
grafana   NodePort   10.105.229.156   <none>        3000:30923/TCP   114m
```

外部通过30923端口访问grafana，初始默认登陆的用户名和密码均为admin，首次登陆grafana会提示修改用户密码，密码符合复杂性要求，如下为登陆后的grafana的展板显示

![grafana展板](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/6%20-%201620.jpg)

1、kubernetes集群监控，包含有整个集群CPU资源使用+分配，内存资源使用+分配，CPU配额，网络资源等，可以全局看到集群资源的使用情况

![prometheus集群监控](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/7%20-%20h74ibrvm5k.gif)

2、Node节点监控，可以看到kubernetes集群中特定某个节点的资源情况啊：CPU使用率，CPU负载，内存使用率，磁盘IO，磁盘空间，网络带宽，网络传输等指标

![prometheus节点监控](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/8%20-%201ok8k7wwql.gif)

3、Pod监控，可以查看到命名空间下pod的资源情况：容器CPU使用率，内存使用，磁盘IO，磁盘空间等

![prometheus容器监控](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/9%20-%2042qjmncbxv.gif)

4、kubernetes工作负载监控，可以和查看到Deployment，StatefulSets，DaemonSets

![prometheus负载监控](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/10%20-%205dpm46c98a.gif)

5、网络监控，可以看到集群Cluster级别网络监控、工作负载Workload级别网络监控和Pod级别网络监控，包括网络的发送数据，接受数据，出带宽和入带宽指标。

![grafana网络监控](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/11%20-%208jmhdztw08.gif)

6、grafana默认还提供了其他很多的监控指标，比如apiserver，kubelet，pv等

![grafana更多监控指标](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E4%BA%8C%E5%8D%81)prometheus%E6%8F%90%E4%BE%9B%E5%AE%8C%E5%A4%87%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F/12%20-%20zvb0xawqty.gif)

# 写在最后

本文总结了在kubernetes中使用prometheus提供完备的自定义监控系统，通过grafana展示更丰富绚烂的图标内容，相比于核心监控指标metric-server而言，prometheus能够提供更加丰富的监控指标，且这些自定义监控指标能用于HPA V2（参考[官方说明](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)）中实现更丰富的弹性扩展伸缩能力，毫无疑问，prometheus的出现让kubernetes的监控变得更简单而功能丰富。

# 参考文献

prometheus官网：[https://prometheus.io](https://prometheus.io/)

kube-prometheus安装官档：https://github.com/coreos/kube-prometheus

TKE自动弹性伸缩指标说明：[https://cloud.tencent.com/document/product/457/38929](https://cloud.tencent.com/document/product/457/38929?from=10680)

HPA使用说明：https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/



> 『 转载 』该文章来源于网络，侵删。 
