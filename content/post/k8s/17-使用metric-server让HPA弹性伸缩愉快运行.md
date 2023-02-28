---
title: "17 使用metric Server让HPA弹性伸缩愉快运行"
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





# 1. 监控架构概述

kubernetes监控指标大体可以分为两类：核心监控指标和自定义指标，核心监控指标是kubernetes内置稳定可靠监控指标，早期由heapster完成，现由metric-server实现；自定义指标用于实现核心指标的扩展，能够提供更丰富的指标支持，如应用状态指标，自定义指标需要通过Aggregator和k8s api集成，当前主流通过promethues实现。

监控指标用途：

- kubectl top                           查看node和pod的cpu+内存使用情况
- kubernetes-dashbaord        控制台查看节点和pod资源监控
- Horizontal Pod Autoscaler   水平横向动态扩展
- Scheduler                            调度器调度选择条件

# 2. metric-server架构和安装

## 2. 1 metric-server简介

> Metrics Server is a cluster-wide aggregator of resource usage data. Resource metrics are used by components like kubectl top and the Horizontal Pod Autoscaler to scale workloads. To autoscale based upon a custom metric, you need to use the Prometheus Adapter  Metric-server是一个集群级别的资源指标收集器，用于收集资源指标数据

- 提供基础资源如CPU、内存监控接口查询；
- 接口通过 Kubernetes aggregator注册到kube-apiserver中；
- 对外通过Metric API暴露给外部访问；
- 自定义指标使用需要借助Prometheus实现。

The Metrics API

- /node                           获取所有节点的指标，指标名称为NodeMetrics
- /node/<node_name>   特定节点指标
- /namespaces/{namespace}/pods            获取命名空间下的所有pod指标
- /namespaces/{namespace}/pods/{pod}  特定pod的指标，指标名称为PodMetrics

未来将能够支持指标聚合，如max最大值，min最小值，95th峰值，以及自定义时间窗口，如1h，1d，1w等。

## 2.2 metric-server架构

![monitoring_architecture.png](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B9%9D)%E4%BD%BF%E7%94%A8metric-server%E8%AE%A9HPA%E5%BC%B9%E6%80%A7%E4%BC%B8%E7%BC%A9%E6%84%89%E5%BF%AB%E8%BF%90%E8%A1%8C/1%20-%201620.jpg)

监控架构分两部分内容：核心监控(图白色部分)和自定义监控（图蓝色部分）

1、 核心监控实现

- 通过kubelet收集资源估算+使用估算
- metric-server负责数据收集，不负责数据存储
- metric-server对外暴露Metric API接口
- 核心监控指标客用户HPA，kubectl top，scheduler和dashboard

2、 自定义监控实现

- 自定义监控指标包括监控指标和服务指标
- 需要在每个node上部署一个agent上报至集群监控agent，如prometheus
- 集群监控agent收集数据后需要将监控指标+服务指标通过API adaptor转换为apiserver能够处理的接口
- HPA通过自定义指标实现更丰富的弹性扩展能力，需要通过HPA adaptor API做次转换。

## 2.3 metric-server部署

1、获取metric-server安装文件，当前具有两个版本：1.7和1.8+，kubernetes1.7版本安装1.7的metric-server版本，kubernetes 1.8后版本安装metric server 1.8+版本

```js
[root@node-1 ~]# git clone https://github.com/kubernetes-sigs/metrics-server.git
```

2、部署metric-server，部署1.8+版本

```js
[root@node-1 metrics-server]# kubectl apply -f deploy/1.8+/
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader created
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator created
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader created
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io created
serviceaccount/metrics-server created
deployment.apps/metrics-server created
service/metrics-server created
clusterrole.rbac.authorization.k8s.io/system:metrics-server created
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server created
```

核心的配置文件是metrics-server-deployment.yaml，metric-server以Deployment的方式部署在集群中，j镜像k8s.gcr.io/metrics-server-amd64:v0.3.6需要提前下载好，其对应的安装文件内容如下：

```js
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: metrics-server
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
  labels:
    k8s-app: metrics-server
spec:
  selector:
    matchLabels:
      k8s-app: metrics-server
  template:
    metadata:
      name: metrics-server
      labels:
        k8s-app: metrics-server
    spec:
      serviceAccountName: metrics-server
      volumes:
      # mount in tmp so we can safely use from-scratch images and/or read-only containers
      - name: tmp-dir
        emptyDir: {}
      containers:
      - name: metrics-server
        image: k8s.gcr.io/metrics-server-amd64:v0.3.6
        args:
          - --cert-dir=/tmp
          - --secure-port=4443
ExternalIP
        ports:
        - name: main-port
          containerPort: 4443
          protocol: TCP
        securityContext:
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
        imagePullPolicy: Always
        volumeMounts:
        - name: tmp-dir
          mountPath: /tmp
      nodeSelector:
        beta.kubernetes.io/os: linux
```

3、检查metric-server部署的情况,查看metric-server的Pod已部署成功

```js
[root@node-1 1.8+]# kubectl get deployments metrics-server -n kube-system 
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
metrics-server   1/1     1            1           2m49s
[root@node-1 1.8+]# kubectl get pods -n kube-system metrics-server-67db467b7b-5xf8x 
NAME                              READY   STATUS    RESTARTS   AGE
metrics-server-67db467b7b-5xf8x   1/1     Running   0          3m
```

实际此时metric-server并不能使用，使用kubectl top node <node-id>查看会提示Error from server (NotFound): nodemetrics.metrics.k8s.io "node-1" not found类似的报错，查看metric-server的pod的日志信息，显示如下：

```js
[root@node-1 1.8+]# kubectl logs metrics-server-67db467b7b-5xf8x  -n kube-system -f
I1230 11:34:10.905500       1 serving.go:312] Generated self-signed cert (/tmp/apiserver.crt, /tmp/apiserver.key)
I1230 11:34:11.527346       1 secure_serving.go:116] Serving securely on [::]:4443
E1230 11:35:11.552067       1 manager.go:111] unable to fully collect metrics: [unable to fully scrape metrics from source kubelet_summary:node-1: unable to fetch metrics from Kubelet node-1 (node-1): Get https://node-1:10250/stats/summary?only_cpu_and_memory=true: dial tcp: lookup node-1 on 10.96.0.10:53: no such host, unable to fully scrape metrics from source kubelet_summary:node-3: unable to fetch metrics from Kubelet node-3 (node-3): Get https://node-3:10250/stats/summary?only_cpu_and_memory=true: dial tcp: lookup node-3 on 10.96.0.10:53: no such host, unable to fully scrape metrics from source kubelet_summary:node-2: unable to fetch metrics from Kubelet node-2 (node-2): Get https://node-2:10250/stats/summary?only_cpu_and_memory=true: dial tcp: lookup node-2 on 10.96.0.10:53: no such host]
```

4、上述的报错信息提示pod中通过DNS无法解析主机名，可以通过在pod中定义hosts文件或告知metric-server优先使用IP的方式通讯，修改metric-server的deployment配置文件，修改如下并重新应用配置

![修改metric-server部署配置文件](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B9%9D)%E4%BD%BF%E7%94%A8metric-server%E8%AE%A9HPA%E5%BC%B9%E6%80%A7%E4%BC%B8%E7%BC%A9%E6%84%89%E5%BF%AB%E8%BF%90%E8%A1%8C/2%20-%201620.jpg)

5、应用metric-server部署文件后重新生成一个pod，日志中再次查看提示另外一个报错信息

```js
[root@node-1 1.8+]# kubectl logs metrics-server-f54f5d6bf-s42rc   -n kube-system -f
I1230 11:45:26.615547       1 serving.go:312] Generated self-signed cert (/tmp/apiserver.crt, /tmp/apiserver.key)
I1230 11:45:27.043723       1 secure_serving.go:116] Serving securely on [::]:4443

E1230 11:46:27.065274       1 manager.go:111] unable to fully collect metrics: [unable to fully scrape metrics from source kubelet_summary:node-2: unable to fetch metrics from Kubelet node-2 (10.254.100.102): Get https://10.254.100.102:10250/stats/summary?only_cpu_and_memory=true: x509: cannot validate certificate for 10.254.100.102 because it doesn't contain any IP SANs, unable to fully scrape metrics from source kubelet_summary:node-1: unable to fetch metrics from Kubelet node-1 (10.254.100.101): Get https://10.254.100.101:10250/stats/summary?only_cpu_and_memory=true: x509: cannot validate certificate for 10.254.100.101 because it doesn't contain any IP SANs, unable to fully scrape metrics from source kubelet_summary:node-3: unable to fetch metrics from Kubelet node-3 (10.254.100.103): Get https://10.254.100.103:10250/stats/summary?only_cpu_and_memory=true: x509: cannot validate certificate for 10.254.100.103 because it doesn't contain any IP SANs]
```

6、修改metric-server的deployments配置文件，添加--kubelet-insecure-tls参数设置

![metric-server调整部署参数](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B9%9D)%E4%BD%BF%E7%94%A8metric-server%E8%AE%A9HPA%E5%BC%B9%E6%80%A7%E4%BC%B8%E7%BC%A9%E6%84%89%E5%BF%AB%E8%BF%90%E8%A1%8C/3%20-%201620.jpg)

再次重新部署后无报错，等待几分钟后就有数据上报告metric-server中了，可以通过kubectl top进行验证测试。

## 2.4 metric-server api测试

1、安装完metric-server后会增加一个metrics.k8s.io/v1beta1的API组，该API组通过Aggregator接入apiserver中

![metric-server api接口](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B9%9D)%E4%BD%BF%E7%94%A8metric-server%E8%AE%A9HPA%E5%BC%B9%E6%80%A7%E4%BC%B8%E7%BC%A9%E6%84%89%E5%BF%AB%E8%BF%90%E8%A1%8C/4%20-%201620.jpg)

2、使用命令行查看kubectl top node的监控信息,可以看到CPU和内存的利用率

```js
[root@node-1 1.8+]# kubectl top node 
NAME     CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
node-1   110m         5%     4127Mi          53%       
node-2   53m          5%     1066Mi          61%       
node-3   34m          3%     1002Mi          57%   
```

3、查看pod监控信息,可以看到pod中CPU和内存的使用情况

```js
[root@node-1 1.8+]# kubectl top pods
NAME                                   CPU(cores)   MEMORY(bytes)   
haproxy-1-686c67b997-kw8pp             0m           1Mi             
haproxy-2-689b4f897-7cwmf              0m           1Mi             
haproxy-ingress-demo-5d487d4fc-5pgjt   0m           1Mi             
haproxy-ingress-demo-5d487d4fc-pst2q   0m           1Mi             
haproxy-ingress-demo-5d487d4fc-sr8tm   0m           1Mi             
ingress-demo-d77bdf4df-7kwbj           0m           1Mi             
ingress-demo-d77bdf4df-7x6jn           0m           1Mi             
ingress-demo-d77bdf4df-hr88b           0m           1Mi             
ingress-demo-d77bdf4df-wc22k           0m           1Mi             
service-1-7b66bf758f-xj9jh             0m           2Mi             
service-2-7c7444684d-w9cv9             1m           3Mi   
```

4、除了用命令行连接metricc-server获取监控资源，还可以通过API方式链接方式获取，可用API有

- http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/nodes
- http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/nodes/<node-name>
- http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/pods
- http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/namespace/<namespace-name>/pods/<pod-name

如下测试API接口的使用：

```js
a、创建一个kube proxy代理，用于链接apiserver，默认将监听在127的8001端口
[root@node-1 ~]# kubectl proxy 
Starting to serve on 127.0.0.1:8001

b、查看node列表的监控数据，可以获取到所有node的资源监控数据，usage中包含cpu和memory
[root@node-1 ~]# curl http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/nodes 
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1167  100  1167    0     0   393k      0 --:--:-- --:--:-- --:--:--  569k
{
  "kind": "NodeMetricsList",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes"
  },
  "items": [
    {
      "metadata": {
        "name": "node-3",
        "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes/node-3",
        "creationTimestamp": "2019-12-30T14:23:00Z"
      },
      "timestamp": "2019-12-30T14:22:07Z",
      "window": "30s",
      "usage": {
        "cpu": "32868032n",
        "memory": "1027108Ki"
      }
    },
    {
      "metadata": {
        "name": "node-1",
        "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes/node-1",
        "creationTimestamp": "2019-12-30T14:23:00Z"
      },
      "timestamp": "2019-12-30T14:22:07Z",
      "window": "30s",
      "usage": {
        "cpu": "108639556n",
        "memory": "4305356Ki"
      }
    },
    {
      "metadata": {
        "name": "node-2",
        "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes/node-2",
        "creationTimestamp": "2019-12-30T14:23:00Z"
      },
      "timestamp": "2019-12-30T14:22:12Z",
      "window": "30s",
      "usage": {
        "cpu": "47607386n",
        "memory": "1119960Ki"
      }
    }
  ]
}

c、指定某个具体的node访问到具体node的资源监控数据
[root@node-1 ~]# curl http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/nodes/node-2
{
  "kind": "NodeMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "node-2",
    "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes/node-2",
    "creationTimestamp": "2019-12-30T14:24:39Z"
  },
  "timestamp": "2019-12-30T14:24:12Z",
  "window": "30s",
  "usage": {
    "cpu": "43027609n",
    "memory": "1120168Ki"
  }
}

d、查看所有pod的列表信息
curl http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/pods

e、查看某个具体pod的监控数据
[root@node-1 ~]# curl http://127.0.0.1:8001/apis/metrics.k8s.io/v1beta1/namespaces/default/pods/haproxy-ingress-demo-5d487d4fc-sr8tm
{
  "kind": "PodMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "haproxy-ingress-demo-5d487d4fc-sr8tm",
    "namespace": "default",
    "selfLink": "/apis/metrics.k8s.io/v1beta1/namespaces/default/pods/haproxy-ingress-demo-5d487d4fc-sr8tm",
    "creationTimestamp": "2019-12-30T14:36:30Z"
  },
  "timestamp": "2019-12-30T14:36:13Z",
  "window": "30s",
  "containers": [
    {
      "name": "haproxy-ingress-demo",
      "usage": {
        "cpu": "0",
        "memory": "1428Ki"
      }
    }
  ]
}
```

5、当然也可以通过kubectl -raw的方式访问接口,如调用node-3的数据

```js
[root@node-1 ~]# kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes/node-3 | jq .
{
  "kind": "NodeMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "node-3",
    "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes/node-3",
    "creationTimestamp": "2019-12-30T14:44:46Z"
  },
  "timestamp": "2019-12-30T14:44:09Z",
  "window": "30s",
  "usage": {
    "cpu": "35650151n",
    "memory": "1026820Ki"
  }
}
```

其他近似的接口有：

kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes   获取所有node的数据

kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes/<node_name>  获取特定node数据

kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods    获取所有pod的数据

kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/default/pods/haproxy-ingress-demo-5d487d4fc-sr8tm 获取某个特定pod的数据

# 3. HPA水平横向动态扩展

## 3.1 HPA概述

> The Horizontal Pod Autoscaler automatically scales the number of pods in a replication controller, deployment, replica set or stateful set based on observed CPU utilization (or, with custom metrics support, on some other application-provided metrics). Note that Horizontal Pod Autoscaling does not apply to objects that can’t be scaled, for example, DaemonSets.

![水平横向扩展](http://cdn.agou-ops.cn/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E4%B9%9D)%E4%BD%BF%E7%94%A8metric-server%E8%AE%A9HPA%E5%BC%B9%E6%80%A7%E4%BC%B8%E7%BC%A9%E6%84%89%E5%BF%AB%E8%BF%90%E8%A1%8C/5%20-%201620.jpg)

HPA即Horizontal Pod Autoscaler,Pod水平横向动态扩展，即根据应用分配资源使用情况，动态增加或者减少Pod副本数量，以实现集群资源的扩容，其实现机制为：

- HPA需要依赖于监控组件，调用监控数据实现动态伸缩，如调用Metrics API接口
- HPA是二级的副本控制器，建立在Deployments，ReplicaSet，StatefulSets等副本控制器基础之上
- HPA根据获取资源指标不同支持两个版本：v1和v2alpha1
- HPA V1获取核心资源指标，如CPU和内存利用率，通过调用Metric-server API接口实现
- HPA V2获取自定义监控指标，通过Prometheus获取监控数据实现
- HPA根据资源API周期性调整副本数，检测周期horizontal-pod-autoscaler-sync-period定义的值，默认15s

## 3.2 HPA实现

如下开始延时HPA功能的实现，先创建一个Deployment副本控制器，然后再通过HPA定义资源度量策略，当CPU利用率超过requests分配的80%时即扩容。

1、创建Deployment副本控制器

```js
[root@node-1 ~]# kubectl run hpa-demo --image=nginx:1.7.9 --port=80 --replicas=1 --expose=true --requests="'cpu=200m,memory=64Mi"

[root@node-1 ~]# kubectl get deployments hpa-demo -o yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
  creationTimestamp: "2019-12-31T01:43:24Z"
  generation: 1
  labels:
    run: hpa-demo
  name: hpa-demo
  namespace: default
  resourceVersion: "14451208"
  selfLink: /apis/extensions/v1beta1/namespaces/default/deployments/hpa-demo
  uid: 3b0f29e8-8606-4e52-8f5b-6c960d396136
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      run: hpa-demo
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        run: hpa-demo
    spec:
      containers:
      - image: nginx:1.7.9
        imagePullPolicy: IfNotPresent
        name: hpa-demo
        ports:
        - containerPort: 80
          protocol: TCP
        resources: 
          requests:
            cpu: 200m
            memory: 64Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status:
  availableReplicas: 1
  conditions:
  - lastTransitionTime: "2019-12-31T01:43:25Z"
    lastUpdateTime: "2019-12-31T01:43:25Z"
    message: Deployment has minimum availability.
    reason: MinimumReplicasAvailable
    status: "True"
    type: Available
  - lastTransitionTime: "2019-12-31T01:43:24Z"
    lastUpdateTime: "2019-12-31T01:43:25Z"
    message: ReplicaSet "hpa-demo-755bdd875c" has successfully progressed.
    reason: NewReplicaSetAvailable
    status: "True"
    type: Progressing
  observedGeneration: 1
  readyReplicas: 1
  replicas: 1
  updatedReplicas: 1
```

2、创建HPA控制器，基于CPU实现横向扩展,策略为至少2个Pod，最大5个，targetCPUUtilizationPercentage表示CPU实际使用率占requests百分比

```js
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: hpa-demo
spec:
  maxReplicas: 5
  minReplicas: 2
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hpa-demo
  targetCPUUtilizationPercentage: 80
```

3、应用HPA规则并查看详情，由于策略需确保最小2个副本，Deployment默认不是2个副本，因此需要扩容，在详情日志中看到副本扩展至2个

```js
[root@node-1 ~]# kubectl apply -f hpa-demo.yaml 
horizontalpodautoscaler.autoscaling/hpa-demo created

#查看HPA列表
[root@node-1 ~]# kubectl get horizontalpodautoscalers.autoscaling 
NAME       REFERENCE             TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
hpa-demo   Deployment/hpa-demo   <unknown>/80%   2         5         0          7s

#查看HPA详情
[root@node-1 ~]# kubectl describe horizontalpodautoscalers.autoscaling hpa-demo 
Name:                                                  hpa-demo
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           kubectl.kubernetes.io/last-applied-configuration:
                                                         {"apiVersion":"autoscaling/v1","kind":"HorizontalPodAutoscaler","metadata":{"annotations":{},"name":"hpa-demo","namespace":"default"},"spe...
CreationTimestamp:                                     Tue, 31 Dec 2019 09:52:51 +0800
Reference:                                             Deployment/hpa-demo
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  <unknown> / 80%
Min replicas:                                          2
Max replicas:                                          5
Deployment pods:                                       1 current / 2 desired
Conditions:
  Type         Status  Reason            Message
  ----         ------  ------            -------
  AbleToScale  True    SucceededRescale  the HPA controller was able to update the target scale to 2
Events:
  Type    Reason             Age   From                       Message
  ----    ------             ----  ----                       -------
  Normal  SuccessfulRescale  1s    horizontal-pod-autoscaler  New size: 2; reason: Current number of replicas below Spec.MinReplicas #副本扩容至2个，根据MinReplica的策略
```

4、查看Deployment列表校验确认扩容情况，已达到HPA基础最小化策略

```js
[root@node-1 ~]# kubectl get deployments hpa-demo  --show-labels 
NAME       READY   UP-TO-DATE   AVAILABLE   AGE   LABELS
hpa-demo   2/2     2            2           94m   run=hpa-demo

[root@node-1 ~]# kubectl get pods -l run=hpa-demo
NAME                        READY   STATUS    RESTARTS   AGE
hpa-demo-5fcd9c757d-7q4td   1/1     Running   0          5m10s
hpa-demo-5fcd9c757d-cq6k6   1/1     Running   0          10m
```

5、假如业务增长期间，CPU利用率增高，会自动横向增加Pod来实现，下面开始通过CPU压测来演示Deployment的扩展

```js
[root@node-1 ~]# kubectl exec -it hpa-demo-5fcd9c757d-cq6k6  /bin/bash
root@hpa-demo-5fcd9c757d-cq6k6:/#  dd if=/dev/zero of=/dev/null 

再次查看HPA的日志，提示已扩容，原因是cpu resource utilization (percentage of request) above target，即CPU资源利用率超过requests设置的百分比
[root@node-1 ~]# kubectl describe horizontalpodautoscalers.autoscaling hpa-demo 
Name:                                                  hpa-demo
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           kubectl.kubernetes.io/last-applied-configuration:
                                                         {"apiVersion":"autoscaling/v1","kind":"HorizontalPodAutoscaler","metadata":{"annotations":{},"name":"hpa-demo","namespace":"default"},"spe...
CreationTimestamp:                                     Tue, 31 Dec 2019 09:52:51 +0800
Reference:                                             Deployment/hpa-demo
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  99% (199m) / 80%
Min replicas:                                          2
Max replicas:                                          5
Deployment pods:                                       5 current / 5 desired
Conditions:
  Type            Status  Reason            Message
  ----            ------  ------            -------
  AbleToScale     True    ReadyForNewScale  recommended size matches current size
  ScalingActive   True    ValidMetricFound  the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  ScalingLimited  True    TooManyReplicas   the desired replica count is more than the maximum replica count
Events:
  Type     Reason                   Age                   From                       Message
  ----     ------                   ----                  ----                       -------
  Normal   SuccessfulRescale        8m2s                  horizontal-pod-autoscaler  New size: 4; reason: cpu resource utilization (percentage of request) above target

查看副本的个数，确认扩容情况，已成功扩容至5个
[root@node-1 ~]# kubectl get pods 
NAME                                   READY   STATUS    RESTARTS   AGE
hpa-demo-5fcd9c757d-7q4td              1/1     Running   0          16m
hpa-demo-5fcd9c757d-cq6k6              1/1     Running   0          21m
hpa-demo-5fcd9c757d-jmb6w              1/1     Running   0          16m
hpa-demo-5fcd9c757d-lpxk8              1/1     Running   0          16m
hpa-demo-5fcd9c757d-zs6cg              1/1     Running   0          21m
```

6、停止CPU压测业务，HPA会自定缩减Pod的副本个数，直至满足条件

```js
[root@node-1 ~]# kubectl describe horizontalpodautoscalers.autoscaling hpa-demo
Name:                                                  hpa-demo
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           kubectl.kubernetes.io/last-applied-configuration:
                                                         {"apiVersion":"autoscaling/v1","kind":"HorizontalPodAutoscaler","metadata":{"annotations":{},"name":"hpa-demo","namespace":"default"},"spe...
CreationTimestamp:                                     Tue, 31 Dec 2019 09:52:51 +0800
Reference:                                             Deployment/hpa-demo
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  0% (0) / 80%
Min replicas:                                          2
Max replicas:                                          5
Deployment pods:                                       2 current / 2 desired
Conditions:
  Type            Status  Reason            Message
  ----            ------  ------            -------
  AbleToScale     True    ReadyForNewScale  recommended size matches current size
  ScalingActive   True    ValidMetricFound  the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  ScalingLimited  True    TooFewReplicas    the desired replica count is increasing faster than the maximum scale rate
Events:
  Type     Reason                   Age                   From                       Message
  ----     ------                   ----                  ----                       -------
  Normal   SuccessfulRescale        18m                   horizontal-pod-autoscaler  New size: 4; reason: cpu resource utilization (percentage of request) above target
  Normal   SuccessfulRescale        113s                  horizontal-pod-autoscaler  New size: 2; reason: All metrics below target   #缩减至2个pod副本

确认副本的个数，已缩减至最小数量2个
[root@node-1 ~]# kubectl get pods -l run=hpa-demo
NAME                        READY   STATUS    RESTARTS   AGE
hpa-demo-5fcd9c757d-cq6k6   1/1     Running   0          24m
hpa-demo-5fcd9c757d-zs6cg   1/1     Running   0          24m
```

通过上面的例子可以知道，HPA可以基于metric-server提供的API监控数据实现水平动态弹性扩展的需求，从而可以根据业务CPU使用情况，动态水平横向扩展，保障业务的可用性。当前HPA V1扩展使用指标只能基于CPU分配使用率进行扩展，功能相对有限，更丰富的功能需要由HPA V2版来实现，其由不同的API来实现：

- metrics.k8s.io 资源指标API，通过metric-server提供，提供node和pod的cpu，内存资源查询；
- custom.metrics.k8s.io 自定义指标，通过adapter和kube-apiserver集成，如promethues；
- external.metrics.k8s.io 外部指标，和自定义指标类似，需要通过adapter和k8s集成。

# 参考文献

资源指标说明：https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/

部署官方说明：https://github.com/kubernetes-sigs/metrics-server

(https://github.com/kubernetes-sigs/metrics-server)

> 『 转载 』该文章来源于网络，侵删。 

