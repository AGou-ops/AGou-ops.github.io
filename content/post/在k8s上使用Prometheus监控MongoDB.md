---
title: "在k8s上使用Prometheus监控MongoDB"
date: 2020-10-08T14:04:30+08:00
lastmod: 2020-10-08T14:04:30+08:00
draft: false
description: ""
tags: ['k8s','prometheus','mongodb','grafana']
categories: ['kubernetes','prometheus','database','grafana']
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


## 预先准备

- minikube For Windows(资源充足, 有集群更好不过);
- Helm;
- 科学上网能力.

<!--more-->

## 整体框架

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/prometheus%2Bk8s/arch.png)

~~随手在线画的, 不美观, qwq.~~

## 操作步骤

### 启用`helm-tiller`(helm服务器端)

在`minikube`中启用`helm-tiller`插件, 很简单, 只需要一条命令即可:

```bash
$ minikube addons enable helm-tiller
# 或者在启动 minikube 的时候直接启用 helm-tiller
$ minikube start --addons=["helm-tiller"] <Other_Options>
```

### 安装`Prometheus-operator`

首先添加所需仓库:

```bash
$ helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
# 更新仓库内容
$ helm repo update
```

安装/下载`chart`:

```bash
$ helm install prometheus-community/kube-prometheus-stack --version 9.4.10

# 或者先下载下来更改所需内容之后再进行安装(推荐使用方法)
$ helm pull prometheus-community/kube-prometheus-stack --version 9.4.10 --untar
# 安装
$ helm install prometheus kube-prometheus-stack/
```

安装完成之后, `kubernetes`会自动接管后续工作, 如拉取镜像等:

```bash
# 观察部署进度
$ kubectl get po -w
NAME                                                     READY   STATUS    RESTARTS   AGE
alertmanager-prometheus-kube-prometheus-alertmanager-0   2/2     Running   0          24m
prometheus-grafana-79b677fd4b-t9kr9                      2/2     Running   0          25m
prometheus-kube-prometheus-operator-69cd74c99f-wltf4     2/2     Running   0          25m
prometheus-kube-state-metrics-95d956569-mlfwv            1/1     Running   0          25m
prometheus-prometheus-kube-prometheus-prometheus-0       3/3     Running   1          24m
prometheus-prometheus-node-exporter-tvwf5                1/1     Running   0          25m
# 查看service
$ kubectl get svc
NAME                                      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
alertmanager-operated                     ClusterIP   None            <none>        9093/TCP,9094/TCP,9094/UDP   25m
kubernetes                                ClusterIP   10.96.0.1       <none>        443/TCP                      44h
prometheus-grafana                        ClusterIP   10.108.199.68   <none>        80/TCP                       26m
prometheus-kube-prometheus-alertmanager   ClusterIP   10.96.81.7      <none>        9093/TCP                     26m
prometheus-kube-prometheus-operator       ClusterIP   10.109.9.111    <none>        8080/TCP,443/TCP             26m
prometheus-kube-prometheus-prometheus     ClusterIP   10.98.173.241   <none>        9090/TCP                     26m
prometheus-kube-state-metrics             ClusterIP   10.109.121.40   <none>        8080/TCP                     26m
prometheus-operated                       ClusterIP   None            <none>        9090/TCP                     25m
prometheus-prometheus-node-exporter       ClusterIP   10.107.29.93    <none>        9100/TCP                     26m
```

以上信息无误则表明`prometheus`已成功部署.

使用`minikube`(`kubectl`亦可)的转发功能, 将`svc/prometheus-kube-prometheus-prometheus `的端口映射到本地:

```bash
$ minikube port-forward svc/prometheus-kube-prometheus-prometheus 9090
Forwarding from 127.0.0.1:9090 -> 9090
Forwarding from [::1]:9090 -> 9090
Handling connection for 9090
```

打开浏览器访问`http://127.0.0.1:9090/`查看`prometheus UI`:

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/prometheus%2Bk8s/prometheus%20ui.png)

使用以下命令查看`prometheus`的`servicemonitor`(其对应`prometheus UI`中的`target`):

```bash
$ kubectl get servicemonitor
NAME                                                 AGE
prometheus-kube-prometheus-alertmanager              36m
prometheus-kube-prometheus-apiserver                 36m
prometheus-kube-prometheus-coredns                   36m
prometheus-kube-prometheus-grafana                   36m
prometheus-kube-prometheus-kube-controller-manager   36m
prometheus-kube-prometheus-kube-etcd                 36m
prometheus-kube-prometheus-kube-proxy                36m
prometheus-kube-prometheus-kube-scheduler            36m
prometheus-kube-prometheus-kube-state-metrics        36m
prometheus-kube-prometheus-kubelet                   36m
prometheus-kube-prometheus-node-exporter             36m
prometheus-kube-prometheus-operator                  36m
prometheus-kube-prometheus-prometheus                36m
```

查看所有`crd`:

```bash
$ kubectl get crd
NAME                                    CREATED AT
alertmanagers.monitoring.coreos.com     2020-10-08T01:10:04Z
podmonitors.monitoring.coreos.com       2020-10-08T01:10:04Z
prometheuses.monitoring.coreos.com      2020-10-08T01:10:04Z
prometheusrules.monitoring.coreos.com   2020-10-08T01:10:04Z
servicemonitors.monitoring.coreos.com   2020-10-08T01:10:04Z
thanosrulers.monitoring.coreos.com      2020-10-08T01:10:04Z
```

**通过`describe`子命令可以发现`crd`的`matchLabels`都包含`release: prometheus`标签.**

### 部署`MongoDB`及其服务

参考`MongoDB-depl-svc.yaml`文件内容如下:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-deployment
  labels:
    app: mongodb
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo
        ports:
        - containerPort: 27017
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
spec:
  selector:
    app: mongodb
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017        
```

按需进行修改, 修改完成之后应用配置清单:

```bash
$ kubectl apply -f MongoDB-depl-svc.yaml
```

等待`MongoDB`部署完成...

```bash
$ kubectl get deployment/mongodb-deployment -w
NAME                 READY   UP-TO-DATE   AVAILABLE   AGE
mongodb-deployment   2/2     2            0           3m13s
```

### 部署`MongoDB Exporter`

添加`helm repo`:

```bash
$ helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
$ helm repo update
```

下载`chart`:

```bash
$ helm pull prometheus-community/prometheus-mongodb-exporter --untar
```

修改`value.yaml`文件内容:

```yaml
...
# 使用kubectl get svc获取MongoDB的服务及端口
mongodb: 
  uri: "mongodb://mongodb-service:27017"
...
# 从上面可以得知servicemonitor所匹配的标签 release: prometheus
serviceMonitor:
  additionalLabels:
    release: prometheus
...
```

应用`chart`:

```bash
$ helm install mongodb-exporter prometheus-mongodb-exporter/
```

等待`svc`,`pod`部署完成之后, 映射`mongodb-exporter`, 检查`/metrics`:

```bash
$ kubectl port-forward service/mongodb-exporter-prometheus-mongodb-exporter 9216  
```

打开浏览器访问`http://localhost:9216/metrics`进行查看:

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/prometheus%2Bk8s/mongodb%20metrics.png)

此时, 再打开`prometheus UI`查看`target`可以看到`mongodb-exporter`已经处于`UP`状态:

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/prometheus%2Bk8s/mongodb%20target.png)

### 在`Grafana`查看

```bash
$ kubectl port-forward deployment/prometheus-grafana 3000
```

打开浏览器访问`http://localhost:3000`:

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/prometheus%2Bk8s/mongodb%20grafana.png)

:information_source:默认账号`admin`, 默认密码`prom-operator` (从官方文档中即可获取)

## 附录1: chart 地址

上文中所使用的`chart`仓库地址:

- kube-prometheus-stack: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- mongodb-exporter: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-mongodb-exporter

## 附录2: kubectl get all

![](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/prometheus%2Bk8s/kubectl%20get%20all.png)