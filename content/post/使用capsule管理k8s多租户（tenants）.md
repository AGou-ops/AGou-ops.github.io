---
title: "使用capsule管理k8s多租户（tenants）"
date: 2024-12-24T14:49:39+08:00
lastmod: 2024-12-24T14:49:39+08:00
draft: false
description: ""
tags: ["k8s","capsule", "tenants"]
categories: ["k8s"]
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

![capsule-operator](https://cdn.agou-ops.cn/blog-images/capsule-operator.d853076.ce76636fce3e3130134a6f768700f6f7.svg)

> **Capsule** implements a multi-tenant and policy-based environment in your Kubernetes cluster. It is designed as a micro-services-based ecosystem with the minimalist approach, leveraging only on upstream Kubernetes.
>
> 官方文档地址：[https://capsule.clastix.io/](https://capsule.clastix.io/)

<!--more-->

## helm快速安装

```bash
helm repo add projectcapsule https://projectcapsule.github.io/charts

helm install capsule projectcapsule/capsule -n capsule-system --create-namespace
```

## 快速开始

```bash
# 创建一个租户，租户里面有用户suofeiya
kubectl create -f - << EOF
apiVersion: capsule.clastix.io/v1beta2
kind: Tenant
metadata:
  name: tenant
spec:
  owners:
  - name: suofeiya
    kind: User
EOF

# 创建完成之后
kubectl get tenants
# 示例输出
NAME     STATE    NAMESPACE QUOTA   NAMESPACE COUNT   NODE SELECTOR   AGE
suofeiya Active                     0                                 10s
```

然后使用[hack/create-user.sh](https://github.com/projectcapsule/capsule/blob/master/hack/create-user.sh)脚本配置用户证书以及`kubeconfig`等：

```bash
# 第一个参数为用户，第二个为租户名称
./create-user.sh suofeiya tenant

# 使用创建出来用户的Context
export KUBECONFIG=suofeiya-tenant.kubeconfig
```

使用该context创建命名空间，推荐以租户名称为前缀，中间以空格分割：

```bash
kubectl create ns tenant-demo

kubectl run nginx --image=nginx -n tenant-demo
```

## 附录：tenant配置

```yaml
apiVersion: capsule.clastix.io/v1beta1
kind: Tenant
metadata:
  name: tenants-sample
spec:
  apiVersion: <string>
  kind: <string>
  metadata: {}
  spec:
    additionalRoleBindings:
    - clusterRoleName: <string>
      subjects:
      - apiGroup: <string>
        kind: <string>
        name: <string>
        namespace: <string>
    containerRegistries:
      allowed:
      - <string>
      allowedRegex: <string>
    imagePullPolicies:
    - <string>
    ingressOptions:
      allowedClasses:
        allowed:
        - <string>
        allowedRegex: <string>
      allowedHostnames:
        allowed:
        - <string>
        allowedRegex: <string>
      hostnameCollisionScope: <string>
    limitRanges:
      items:
      - limits:
        - default: {}
          defaultRequest: {}
          max: {}
          maxLimitRequestRatio: {}
          min: {}
          type: <string>
    namespaceOptions:
      additionalMetadata:
        annotations: {}
        labels: {}
      quota: 0
    networkPolicies:
      items:
      - egress:
        - ports:
          - endPort: 0
            port: <nil>
            protocol: <string>
          to:
          - ipBlock:
              cidr: <string>
              except:
              - <string>
            namespaceSelector:
              matchExpressions:
              - key: <string>
                operator: <string>
                values:
                - <string>
              matchLabels: {}
            podSelector:
              matchExpressions:
              - key: <string>
                operator: <string>
                values:
                - <string>
              matchLabels: {}
        ingress:
        - from:
          - ipBlock:
              cidr: <string>
              except:
              - <string>
            namespaceSelector:
              matchExpressions:
              - key: <string>
                operator: <string>
                values:
                - <string>
              matchLabels: {}
            podSelector:
              matchExpressions:
              - key: <string>
                operator: <string>
                values:
                - <string>
              matchLabels: {}
          ports:
          - endPort: 0
            port: <nil>
            protocol: <string>
        podSelector:
          matchExpressions:
          - key: <string>
            operator: <string>
            values:
            - <string>
          matchLabels: {}
        policyTypes:
        - <string>
    nodeSelector: {}
    owners:
    - kind: <string>
      name: <string>
      proxySettings:
      - kind: <string>
        operations:
        - <string>
    priorityClasses:
      allowed:
      - <string>
      allowedRegex: <string>
    resourceQuotas:
      items:
      - hard: {}
        scopeSelector:
          matchExpressions:
          - operator: <string>
            scopeName: <string>
            values:
            - <string>
        scopes:
        - <string>
      scope: <string>
    serviceOptions:
      additionalMetadata:
        annotations: {}
        labels: {}
      allowedServices:
        externalName: true
        loadBalancer: true
        nodePort: true
      externalIPs:
        allowed:
        - <string>
      forbiddenAnnotations:
        denied:
        - <string>
        deniedRegex: <string>
      forbiddenLabels:
        denied:
        - <string>
        deniedRegex: <string>
    storageClasses:
      allowed:
      - <string>
      allowedRegex: <string>
  status:
    namespaces:
    - <string>
    size: 0
    state: <string>
```

## 参考链接

- [Capsule Documentaion](https://capsule.clastix.io/docs/)
