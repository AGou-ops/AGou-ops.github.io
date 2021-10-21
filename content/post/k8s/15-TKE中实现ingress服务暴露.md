---
title: "15 TKE中实现ingress服务暴露"
date: 2019-08-04T10:36:48+08:00
lastmod: 2019-08-04T10:36:48+08:00
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

上一篇文章中介绍了基于Nginx实现Ingress Controller的实现，介绍了Nginx Ingress Controller安装、相关功能，TLS，高级特性等介绍，本章开始介绍基于腾讯云[TKE](https://cloud.tencent.com/document/product/457?from=10680)实现ingress服务暴露。

# 1. TKE ingress

## 1.1 TKE ingress架构

[TKE](https://cloud.tencent.com/document/product/457?from=10680)是Tencent Kubernetes Engine即腾讯云基于kubernetes提供的公有云上[容器云服务](https://cloud.tencent.com/document/product/457?from=10680)，[TKE](https://cloud.tencent.com/document/product/457?from=10680)提供了两种暴露服务的方式：service和ingress。

- 内网CLB，四层[负载均衡](https://cloud.tencent.com/document/product/214?from=10680)，提供VPC内访问，通过node节点的NodePort转发至service；
- 外网CLB，四层[负载均衡](https://cloud.tencent.com/document/product/214?from=10680)，提供公网访问，需要node节点具有访问公网的能力；
- ingress， 七层[负载均衡](https://cloud.tencent.com/document/product/214?from=10680)，提供http和https接入，提供ingress控制器的功能，借助NodePort转发

![TKE service和ingress](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/1%20-%201620.jpg)

要使用TKE的ingress功能，需要了解一下相关的组件内容：

- l7-lb-controller      ingress客户端，安装在kube-system，用于解析ingress配置并更新CLB的规则
- CLB       七层负载均衡，提供ingress controller的功能，根据ingress规则创建http/https监听器，配置转发规则，以NodePort端口绑定后端RS
- Service   用于ingress服务发现，通过NodePort方式接入CLB
- 证书        用于提供https接入，配置在CLB负载均衡上，提供CA签名证书，通过Secrets封装给CLB使用

由于nginx ingress controller是直接以Pod的形势部署在kubernetes集群中，借助于service的服务发现可直接实现和pod通讯，而[TKE](https://cloud.tencent.com/document/product/457?from=10680)中ingress controller未直接部署在k8s集群中，网络的接入需借助于service的NodePort实现接入，其数据流如下图：

![TKE ingress数据流走向](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/2%20-%201620.jpg)

## 1.2 ingress虚拟主机

环境说明: 创建两个Deployment并以NodePort方式暴露服务，www1.happylau.cn对应tke-app-1服务，同理www2.happylau.cn对应tke-app-2服务，如下演示操作过程：

1、创建两个Deployments

```js
[root@VM_10_2_centos ingress]# kubectl create deployment tke-app-1 --image=nginx:1.7.9
[root@VM_10_2_centos ingress]# kubectl create deployment tke-app-2 --image=nginx:1.7.9
```

2、 将两个Deployment以NodePort的方式暴露服务

```js
[root@VM_10_2_centos ~]# kubectl expose deployment tke-app-1 --port=80 --type=NodePort
[root@VM_10_2_centos ~]# kubectl expose deployment tke-app-2 --port=80 --type=NodePort

查看服务列表
[root@VM_10_2_centos ~]# kubectl get services 
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   172.16.255.1     <none>        443/TCP        83d
tke-app-1    NodePort    172.16.255.91    <none>        80:30597/TCP   2s
tke-app-2    NodePort    172.16.255.236   <none>        80:31674/TCP   73s
```

3、定义ingress规则，定义两个host将不同主机转发至backend不同的service

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: tke-ingress-demo
  annotations:
    kubernetes.io/ingress.class: qcloud
spec:
  rules:
  - host: www1.happylau.cn 
    http:
      paths:
      - path: /
        backend:
          serviceName: tke-app-1 
          servicePort: 80 
  - host: www2.happylau.cn 
    http:
      paths:
      - path: /
        backend:
          serviceName: tke-app-2 
          servicePort: 80 
```

4、 应用ingress规则，并查看ingress详情，可以看到ingress创建了一个公网CLB实例

```js
#应用ingress规则
[root@VM_10_2_centos ingress]# kubectl apply -f tke-ingress-demo.yaml 
ingress.extensions/tke-ingress-demo created

#查看ingress列表
[root@VM_10_2_centos ingress]# kubectl get ingresses 
NAME               HOSTS                               ADDRESS         PORTS   AGE
tke-ingress-demo   www1.happylau.cn,www2.happylau.cn   140.143.84.xxx   80      67s

#查看 ingress详情
[root@VM_10_2_centos ingress]# kubectl describe ingresses tke-ingress-demo 
Name:             tke-ingress-demo
Namespace:        default
Address:          140.143.84.xxx
Default backend:  default-http-backend:80 (<none>)
Rules:
  Host              Path  Backends
  ----              ----  --------
  www1.happylau.cn  
                    /   tke-app-1:80 (172.16.1.15:80)
  www2.happylau.cn  
                    /   tke-app-2:80 (172.16.2.17:80)
Annotations:
  kubectl.kubernetes.io/last-applied-configuration:  {"apiVersion":"extensions/v1beta1","kind":"Ingress","metadata":{"annotations":{"kubernetes.io/ingress.class":"qcloud"},"name":"tke-ingress-demo","namespace":"default"},"spec":{"rules":[{"host":"www1.happylau.cn","http":{"paths":[{"backend":{"serviceName":"tke-app-1","servicePort":80},"path":"/"}]}},{"host":"www2.happylau.cn","http":{"paths":[{"backend":{"serviceName":"tke-app-2","servicePort":80},"path":"/"}]}}]}}

  kubernetes.io/ingress.class:                  qcloud
  kubernetes.io/ingress.qcloud-loadbalance-id:  lb-a0xwhcx3
Events:
  Type    Reason           Age                From                     Message
  ----    ------           ----               ----                     -------
  Normal  EnsuringIngress  69s (x3 over 89s)  loadbalancer-controller  Ensuring ingress
  Normal  CREATE           69s (x2 over 70s)  loadbalancer-controller  create loadbalancer succ
  Normal  EnsuredIngress   68s (x3 over 70s)  loadbalancer-controller  Ensured ingress
```

5、测试验证，将IP和域名写入到hosts文件中，访问域名测试验证，如下通过curl解析的方式测试验证

![ingress测试验证](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/3%20-%201620.jpg)

6、ingress会创建一个CLB，并在CLB中创建监听器、设置转发规则、绑定后端RS，下图是CLB上自动生成的规则

![CLB规则](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/4%20-%201620.jpg)

通过上面演示可知：

- 自动创建CLB实例
- CLB实例上配置监听器
- 配置转发规则
- 绑定Node节点
- 绑定端口为service创建的NodePort

## 1.3 ingress证书加密

[TKE](https://cloud.tencent.com/document/product/457?from=10680)支持将在CLB中加载证书实现https加密传输，证书是经过第三方认证的CA签名过的证书，需要先购买好证书，通过Secrets对象在kubernetes集群中定义，如下演示https的实现。

1、 通过Secrets创建证书，先获取到证书的id，如果没有则先创建证书，[证书管理](https://console.cloud.tencent.com/clb/cert)，本文以证书id TKPmsWb3 为例，通过stringData能实现base64自动加密

```js
apiVersion: v1
kind: Secret
metadata:
  name: ingress-ssl-key
stringData:
  qcloud_cert_id: TKPmsWb3 
type: Opaque

#生成Secrets对象
[root@VM_10_2_centos ingress]# kubectl apply -f ingress-secret.yaml 
secret/ingress-ssl-key created
[root@VM_10_2_centos ingress]# kubectl get secrets ingress-ssl-key 
NAME              TYPE     DATA   AGE
ingress-ssl-key   Opaque   1      7s

#查看secrets详情，可得知VEtQbXNXYjM= 已自动通过base64加密
[root@VM_10_2_centos ingress]# kubectl get secrets ingress-ssl-key -o yaml
apiVersion: v1
data:
  qcloud_cert_id: VEtQbXNXYjM=  
kind: Secret
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Secret","metadata":{"annotations":{},"name":"ingress-ssl-key","namespace":"default"},"stringData":{"qcloud_cert_id":"TKPmsWb3"},"type":"Opaque"}
  creationTimestamp: "2020-01-03T11:53:33Z"
  name: ingress-ssl-key
  namespace: default
  resourceVersion: "7083702418"
  selfLink: /api/v1/namespaces/default/secrets/ingress-ssl-key
  uid: aaea4a86-2e1f-11ea-a618-ae9224ffad1a
type: Opaque

#可以通过base64查看解密后的内容，和配置文件中定义的id一致
[root@VM_10_2_centos ingress]# echo VEtQbXNXYjM= | base64 -d
TKPmsWb3
```

2、准备环境，创建一个nginx的Deployment

```js
[root@VM_10_2_centos ~]# kubectl create deployment tke-ingress-ssl-demo --image=nginx:1.7.9
deployment.apps/tke-ingress-ssl-demo created
[root@VM_10_2_centos ~]# kubectl get deployments 
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
tke-ingress-ssl-demo   1/1     1            1           6s
```

3、将Deployment暴露以NodePort类型暴露service

```js
[root@VM_10_2_centos ~]# kubectl expose deployment tke-ingress-ssl-demo --port=80 --type=NodePort
service/tke-ingress-ssl-demo exposed
[root@VM_10_2_centos ~]# kubectl get service tke-ingress-ssl-demo -o yaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: "2020-01-03T12:00:05Z"
  labels:
    app: tke-ingress-ssl-demo
  name: tke-ingress-ssl-demo
  namespace: default
  resourceVersion: "7083890283"
  selfLink: /api/v1/namespaces/default/services/tke-ingress-ssl-demo
  uid: 94659f42-2e20-11ea-a618-ae9224ffad1a
spec:
  clusterIP: 172.16.255.64
  externalTrafficPolicy: Cluster
  ports:
  - nodePort: 30324
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: tke-ingress-ssl-demo
  sessionAffinity: None
  type: NodePort    #类型为NodePort
status:
  loadBalancer: {}
```

4、定义ingress规则，加载证书实现https转发

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: tke-ingress-ssl
  annotations:
    kubernetes.io/ingress.class: qcloud
    qcloud_cert_id: TKPmsWb3
spec:
  rules:
  - host: www.happylauliu.cn
    http:
      paths:
      - path: /
        backend:
          serviceName: tke-ingress-ssl-demo 
          servicePort: 80
  tls:
  - hosts:
    - www.happylauliu.cn
    secretName: ingress-ssl-key
```

5、应用ingress规则，并查看详情，此时已正常创建CLB并配置规则

```js
[root@VM_10_2_centos ingress]# kubectl apply -f ingress-demo.yaml 
ingress.extensions/tke-ingress-ssl created

#查看ingress详情
[root@VM_10_2_centos ingress]# kubectl describe ingresses tke-ingress-ssl 
Name:             tke-ingress-ssl
Namespace:        default
Address:          140.143.83.xxx    #CLB的外网IP
Default backend:  default-http-backend:80 (<none>)
TLS:
  ingress-ssl-key terminates www.happylauliu.cn
Rules:
  Host                Path  Backends
  ----                ----  --------
  www.happylauliu.cn  
                      /   tke-ingress-ssl-demo:80 (172.16.0.25:80)
Annotations:
  qcloud_cert_id:                                    TKPmsWb3
  kubectl.kubernetes.io/last-applied-configuration:  {"apiVersion":"extensions/v1beta1","kind":"Ingress","metadata":{"annotations":{"kubernetes.io/ingress.class":"qcloud","qcloud_cert_id":"TKPmsWb3"},"name":"tke-ingress-ssl","namespace":"default"},"spec":{"rules":[{"host":"www.happylauliu.cn","http":{"paths":[{"backend":{"serviceName":"tke-ingress-ssl-demo","servicePort":80},"path":"/"}]}}],"tls":[{"hosts":["www.happylauliu.cn"],"secretName":"ingress-ssl-key"}]}}

  kubernetes.io/ingress.class:                  qcloud
  kubernetes.io/ingress.qcloud-loadbalance-id:  lb-2kcrtwbn  #CLB的实例id
Events:
  Type    Reason           Age                From                     Message
  ----    ------           ----               ----                     -------
  Normal  EnsuringIngress  51s (x3 over 73s)  loadbalancer-controller  Ensuring ingress
  Normal  CREATE           51s (x2 over 52s)  loadbalancer-controller  create loadbalancer succ
  Normal  EnsuredIngress   49s (x3 over 52s)  loadbalancer-controller  Ensured ingress
```

6、测试验证，hosts文件中解析www.happylauliu.cn到CLB的VIP，或者DNS解析，打开浏览器访问站点，由于是经过CA认证签名的证书，因此没有提示告警信息，查看证书的详情信息

![tke ingress ssl验证](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/5%20-%201620.jpg)

7、查看CLB的配置可得知，CLB上配置了443的监听端口，并关联了证书，采用单向认证方式

![tke ingres ssl配置规则](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/6%20-%201620.jpg)

通过CLB的配置规则可知，CLB配置了监听443的监听器，80端口并未设置规则，因此此时无法访问http，如何实现在TKE使用ingress实现http和https共存呢，可以通过定义kubernetes.io/ingress.http-rules和

kubernetes.io/ingress.https-rules实现

```js
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: tke-ingress-ssl
  annotations:
    kubernetes.io/ingress.class: qcloud
    kubernetes.io/ingress.rule-mix: "true"  #开启混合规则配置，kubernetes.io/ingress.http-rules配置规则
    kubernetes.io/ingress.http-rules: '[{"host":"www.happylauliu.cn","path":"/","backend":{"serviceName":"tke-ingress-ssl-demo","servicePort":"80"}}]'
    qcloud_cert_id: TKPmsWb3
spec:
  rules:
  - host: www.happylauliu.cn
    http:
      paths:
      - path: /
        backend:
          serviceName: tke-ingress-ssl-demo 
          servicePort: 80
  tls:
  - hosts:
    - www.happylauliu.cn
    secretName: ingress-ssl-key
```

设置ingress.http-rules和ingress.https-rules注解之后，会在监听器中创建http和https的转发规则，并绑定RS，此时访问http和https均能实现站点访问，[CLB](https://cloud.tencent.com/document/product/214?from=10680)对应的规则内容如下图：

![http和https规则混合使用](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/7%20-%201620.jpg)

通过测试访问http://www.happylauliu.cn/和https://www.happylauliu.cn/均能正常访问，如果要实现访问http自动跳转到https，则可以在控制台开启自动跳转的功能，如下图：

![开启http自动重定向功能](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/8%20-%201620.jpg)

开启重定向功能后再次访问http站点后此时会自动跳转到https，如下图所示location已经跳转至https://www.happylauliu.cn/

![http自动跳转测试](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B(%E5%8D%81%E5%85%AB)TKE%E4%B8%AD%E5%AE%9E%E7%8E%B0ingress%E6%9C%8D%E5%8A%A1%E6%9A%B4%E9%9C%B2/9%20-%201620.jpg)

# 写在最后

通过上述的演示在腾讯云公有云环境下ingress controller的实现，腾讯云[TKE](https://cloud.tencent.com/document/product/457?from=10680)通过使用[CLB](https://cloud.tencent.com/document/product/214?from=10680)实现和kubernetes ingress集成，借助于service的NodePort实现转发，通过公有云专用的[CLB](https://cloud.tencent.com/document/product/214?from=10680)能够最大程度保障ingress接入性能。同时，ingress能够使用腾讯云上的证书实现https加密功能。

# **参考文献**

Ingress配置：https://kubernetes.io/docs/concepts/services-networking/ingress/

Ingress控制器：https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/

ingress基本配置：[https://cloud.tencent.com/document/product/457/31711](https://cloud.tencent.com/document/product/457/31711?from=10680)

ingress证书：[https://cloud.tencent.com/document/product/457/40538](https://cloud.tencent.com/document/product/457/40538?from=10680)

CLB配置http自动跳转：[https://cloud.tencent.com/document/product/214/8839

> 『 转载 』该文章来源于网络，侵删。 

