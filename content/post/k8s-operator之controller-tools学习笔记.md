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
controller-gen -h
type-scaffold -h
helpgen -h
```
## 快速开始及示例

1.  初始化示例项目：
```bash
mkdir controller-tools-study 
cd controller-tools-study 
go mod init controller-tools-study
mkdir -pv pkg/apis/appcontroller/v1alpha1
```
2. 使用`type-scaffold`工具生成`types.go`：
```bash
type-scaffold --kind=Application > pkg/apis/appcontroller/v1alpha1/types.go

cat pkg/apis/appcontroller/v1alpha1/types.go
# 输出内容如下：
// ApplicationSpec defines the desired state of Application
type ApplicationSpec struct {
        // INSERT ADDITIONAL SPEC FIELDS -- desired state of cluster
}

// ApplicationStatus defines the observed state of Application.
// It should always be reconstructable from the state of the cluster and/or outside world.
type ApplicationStatus struct {
        // INSERT ADDITIONAL STATUS FIELDS -- observed state of cluster
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Application is the Schema for the applications API
// +k8s:openapi-gen=true
type Application struct {
        metav1.TypeMeta   `json:",inline"`
        metav1.ObjectMeta `json:"metadata,omitempty"`

        Spec   ApplicationSpec   `json:"spec,omitempty"`
        Status ApplicationStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// ApplicationList contains a list of Application
type ApplicationList struct {
        metav1.TypeMeta `json:",inline"`
        metav1.ListMeta `json:"metadata,omitempty"`
        Items           []Application `json:"items"`
}
```
可以发现生成之后的代码，是没有包名和引用依赖包的，所以需要手动在文件头添加一下：
```
vim pkg/apis/appcontroller/v1alpha1/types.go
package v1alpha1 

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

... 后面省略。。。
```
导入完成之后运行`go mod tidy`获取一下依赖。
3. 使用controller-gen生成deepcopy和crd文件
在此之前，首先在`pkg/apis/appcontroller/v1alpha1` 下创建一个 `doc.go` 文件，并使用注释标记`groupName`，不然生成crd的时候文件名会变成下划线，空的.
```bash
vim pkg/apis/appcontroller/v1alpha1/doc.go

// +groupName=appcontroller.k8s.io
package v1alpha1
```
使用`controller-gen`生成`deepcopy`相关代码：
```bash
controller-gen object paths=pkg/apis/appcontroller/v1alpha1/types.go

# 执行完成之后，发现多了个deepcopy文件。
❯ tree
.
├── go.mod
├── go.sum
└── pkg
    └── apis
        └── appcontroller
            └── v1alpha1
                ├── doc.go
                ├── types.go
                └── zz_generated.deepcopy.go

5 directories, 5 files
```
使用`controller-gen`生成`crd`：
```bash
controller-gen crd paths=./... output:crd:dir=config/crd

# 再次查看目录结构
❯ tree
.
├── config
│   └── crd
│       └── appcontroller.k8s.io_applications.yaml
├── go.mod
├── go.sum
└── pkg
    └── apis
        └── appcontroller
            └── v1alpha1
                ├── doc.go
                ├── types.go
                └── zz_generated.deepcopy.go

7 directories, 6 files
```
查看生成之后的`crd`资源清单文件：
```yaml
cat config/crd/appcontroller.k8s.io_applications.yaml

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: (devel)
  name: applications.appcontroller.k8s.io
spec:
  group: appcontroller.k8s.io
  names:
    kind: Application
    listKind: ApplicationList
    plural: applications
    singular: application
  scope: Namespaced
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        description: Application is the Schema for the applications API
        properties:
          apiVersion:
            description: |-
              APIVersion defines the versioned schema of this representation of an object.
              Servers should convert recognized schemas to the latest internal value, and
              may reject unrecognized values.
              More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
            type: string
          kind:
            description: |-
              Kind is a string value representing the REST resource this object represents.
              Servers may infer this from the endpoint the client submits requests to.
              Cannot be updated.
              In CamelCase.
              More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
            type: string
          metadata:
            type: object
          spec:
            description: ApplicationSpec defines the desired state of Application
            type: object
          status:
            description: |-
              ApplicationStatus defines the observed state of Application.
              It should always be reconstructable from the state of the cluster and/or outside world.
            type: object
        type: object
    served: true
    storage: true
```
可以看到`properties.spec`下面除了`type`没有任何字段，所以接下来我们为其添加两个字段，然后重新生成一下`crd`：
```bash
vim pkg/apis/appcontroller/v1alpha1/types.go

...
type ApplicationSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS -- desired state of cluster
    // 添加两个测试字段，分别是名字和副本数
	Name string `json:"name"`
    Replicas int32 `json:"replicas"`
}
...
```
使用`controller-gen`重新生成`crd`：
```bash
controller-gen crd paths=./... output:crd:dir=config/crd

# 再次查看crd文件内容，可以发现spec里面已经有上面代码中指定的字段了
...
          spec:
            description: ApplicationSpec defines the desired state of Application
            properties:
              name:
                description: INSERT ADDITIONAL SPEC FIELDS -- desired state of cluster
                type: string
              replicas:
                format: int32
                type: integer
            required:
            - name
            - replicas
            type: object
...

```
4. 注册`crd`资源
编辑`pkg/apis/appcontroller/register.go`文件，添加`GroupName`：
```go
package appcontroller

const (
	GroupName = "appcontroller.k8s.io"
)
```
编辑`pkg/apis/appcontroller/v1alpha1/register.go`文件，添加以下代码来注册client：
```go
package v1alpha1

import (
	"controller-tools-study/pkg/apis/appcontroller"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// SchemeGroupVersion is group version used to register these objects
var SchemeGroupVersion = schema.GroupVersion{Group: appcontroller.GroupName, Version: "v1alpha1"}

// Kind takes an unqualified kind and returns back a Group qualified GroupKind
func Kind(kind string) schema.GroupKind {
	return SchemeGroupVersion.WithKind(kind).GroupKind()
}

// Resource takes an unqualified resource and returns a Group qualified GroupResource
func Resource(resource string) schema.GroupResource {
	return SchemeGroupVersion.WithResource(resource).GroupResource()
}

var (
	// SchemeBuilder initializes a scheme builder
	SchemeBuilder = runtime.NewSchemeBuilder(addKnownTypes)
	// AddToScheme is a global function that registers this API group & version to a scheme
	AddToScheme = SchemeBuilder.AddToScheme
)

// Adds the list of known types to Scheme.
func addKnownTypes(scheme *runtime.Scheme) error {
	scheme.AddKnownTypes(SchemeGroupVersion,
		&Application{},
		&ApplicationList{},
	)
	metav1.AddToGroupVersion(scheme, SchemeGroupVersion)
	return nil
}
```
5. 应用`crd`文件
```bash
kubectl apply -f config/crd/appcontroller.k8s.io_applications.yaml

# 报错
The CustomResourceDefinition "applications.appcontroller.k8s.io" is invalid: metadata.annotations[api-approved.kubernetes.io]: Required value: protected groups must have approval annotation "api-approved.kubernetes.io", see https://github.com/kubernetes/enhancements/pull/1111
```
可以发现直接报错了，crd也没有成功创建，根据报错信息，[protect kubernetes community owned API groups in CRDs by deads2k · Pull Request #1111 · kubernetes/enhancements · GitHub](https://github.com/kubernetes/enhancements/pull/1111)，简单来说就是crd的一个保护机制，不允许外部随意创建crd，要解决这个问题，添加一个`annotations`即可：
编辑`config/crd/appcontroller.k8s.io_applications.yaml`添加`annotations`：
```bash
  annotations:
    controller-gen.kubebuilder.io/version: (devel)
    # 添加以下内容
    api-approved.kubernetes.io: https://github.com/kubernetes/kubernetes/pull/78458
```
重新应用crd文件：
```bash
kubectl apply -f config/crd/appcontroller.k8s.io_applications.yaml
customresourcedefinition.apiextensions.k8s.io/applications.appcontroller.k8s.io created
```
成功创建。
5. 编写crd测试的资源：
创建`config/examples`文件夹，用于测试，并在改目录添加以下测试文件`test.yaml`：
```
apiVersion: appcontroller.k8s.io/v1alpha1
kind: Application
metadata:
  name: test-crd
spec:
  name: test-crd
  replicas: 3
```
应用资源清单文件：
```bash
$ kubectl apply -f config/examples/test.yaml
application.appcontroller.k8s.io/test-crd created
```
查看创建结果：
```bash
$ kubectl get applications.appcontroller.k8s.io
NAME       AGE
test-crd   43s

$ kubectl describe applications.appcontroller.k8s.io test-crd
Name:         test-crd
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  appcontroller.k8s.io/v1alpha1
Kind:         Application
Metadata:
  Creation Timestamp:  2024-09-13T08:37:49Z
  Generation:          1
  Resource Version:    34589
  UID:                 f5d18812-b6bd-476f-b794-85f33a9e6fb5
Spec:
  Name:      test-crd
  Replicas:  3
Events:      <none>
```
6. 测试cr的获取
在项目根目录，创建一个cmd目录，并在该目录中创建程序入口文件`main.go`，内容如下：
```go
package main

import (
	"context"
	"controller-tools-study/pkg/apis/appcontroller/v1alpha1"
	"fmt"
	"log"
	"strings"

	"k8s.io/client-go/kubernetes/scheme"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

func main() {
	config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
	if err != nil {
		log.Fatalln(err)
	}

	config.APIPath = "/apis/"
	config.GroupVersion = &v1alpha1.SchemeGroupVersion
	config.NegotiatedSerializer = scheme.Codecs

	client, err := rest.RESTClientFor(config)
	if err != nil {
		log.Fatalln(err)
	}

	app := v1alpha1.Application{}
	err = client.Get().Namespace("default").Resource("applications").Name("test-crd").Do(context.TODO()).Into(&app)
	if err != nil {
		log.Fatalln(err)
	}

	// 测试深拷贝
	newObj := app.DeepCopy()
	newObj.Spec.Name = "test-crd"

	fmt.Println("ori：", app.Spec)
	fmt.Println(strings.Repeat("=", 50))
	fmt.Println("deepcopy：", newObj.Spec)
}
```
运行：
```bash
go run cmd/main.go
# 输出
ori： {test-crd 3}
==================================================
deepcopy： {test-crd 3}

```
## 参考链接
-  [GitHub - kubernetes-sigs/controller-tools: Tools to use with the controller-runtime libraries](https://github.com/kubernetes-sigs/controller-tools)
- [protect kubernetes community owned API groups in CRDs by deads2k · Pull Request #1111 · kubernetes/enhancements · GitHub](https://github.com/kubernetes/enhancements/pull/1111)