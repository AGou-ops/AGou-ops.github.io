---
title: "13 一次性任务Job和周期任务"
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





# 1. Jobs让单次任务跑起来

## 1.1 Jobs简介

Windows下可以通过批处理脚本完成批处理任务，脚本运行完毕后任务即可终止，从而实现批处理任务运行工作，类似的任务如何在kubernetes中运行呢？答案是Jobs，Jobs是kubernetes中实现一次性计划任务的Pod控制器—JobController，通过控制Pod来执行任务，其特点为：

- 创建Pod运行特定任务，确保任务运行完成
- 任务运行期间节点异常时会自动重新创建Pod
- 支持并发创建Pod任务数和指定任务数

![jobs](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/1%20-%201620.jpg)

Jobs任务运行方式有如下三种：

- 运行单个Jobs任务，一般运行一个pod，pod运行结束任务运行完成；
- 运行特定数量的任务，通过completion指定总计运行任务；
- 并发运行任务，通过parallelism指定并发数

## 1.2 运行单个Jobs任务

1、 定义一个jobs任务，通过在command中运行特定一个脚本，将当前的时间打印100次

```js
apiVersion: batch/v1
kind: Job
metadata:
  name: jobs-demo
  labels:
    controller: jobs
spec:
  parallelism: 1        #并发数，默认为1，即创建pod副本的数量
  template:
    metadata:
      name: jobs-demo
      labels:
        controller: jobs
    spec:
      containers:
      - name: echo-time
        image: centos:latest
        imagePullPolicy: IfNotPresent
        command:
        - /bin/sh
        - -c
        - "for i in `seq 0 100`;do echo ${date} && sleep 1;done"
      restartPolicy: Never  #设置为Never，jobs任务运行完毕即可完成
```

2、 运行Jobs任务

```js
[root@node-1 happylau]# kubectl apply -f job-demo.yaml 
job.batch/job-demo created
[root@node-1 happylau]# kubectl get jobs job-demo 
NAME       COMPLETIONS   DURATION   AGE
job-demo   0/1           41s        41s
```

3、 此时jobs控制器创建了一个pod容器运行任务,此时处于Running状态，任务处在运行过程中，如果运行完毕则会变为completed状态

```js
[root@node-1 happylau]# kubectl get pods  |grep job
job-demo-ssrk7                         1/1     Running   0          97s
```

4、查看jobs日志日志数据，可以看到当前jobs创建的任务是持续在终端中打印数字，且每次打印暂停1s钟

![jobs任务输出](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/2%20-%201620.jpg)

5、再次查看jobs的任务，可以看到任务已经completions，运行时长为103s,对应的pod状态处于completed状态

```js
[root@node-1 ~]# kubectl get jobs 
NAME       COMPLETIONS   DURATION   AGE
job-demo   1/1           103s       5m12s
```

![jobs之pod状态](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/3%20-%201620.jpg)

## 1.3 Jobs运行多个任务

Jobs控制器提供了两个控制并发数的参数：completions和parallelism，completions表示需要运行任务数的总数，parallelism表示并发运行的个数，如设置为1则会依次运行任务，前面任务运行再运行后面的任务，如下以创建5个任务数为例演示Jobs控制器实现并发数的机制。

1、 定义计算圆周率的Jobs任务

```js
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
      - name: pi
        image: perl
        command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(100)"]
      restartPolicy: Never
  parallelism: 1
  completions: 5
```

2、运行jobs任务，并用kubectl get jobs --watch查看jobs创建过程，可以看到pod任务是依次运行，直至达到completions所定义的数量

![jobs创建并发任务](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/4%20-%201620.jpg)

3、Jobs任务都已运行完毕，查看Jobs列表可以看到任务都处于Completed状态，查看pod日志可以看到Pi圆周率计算的结果

![jobs批量运行并发任务](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/5%20-%201620.jpg)

## 1.4 Jobs运行并发任务

Jobs控制器支持运行并发任务，并发任务即Jobs控制器一次运行多个Pod执行任务处理，如下以一次性运行3个Pod并发数为例演示通过Jobs控制器实现并发任务

1、定义Jobs任务，设置3个并发数任务

```js
apiVersion: batch/v1
kind: Job
metadata:
  name: jobs-demo
  labels:
    controller: jobs
spec:
  parallelism: 3    #运行并发数为3，一次性创建3个pod
  template:
    metadata:
      name: jobs-demo
      labels:
        controller: jobs
    spec:
      containers:
      - name: echo-time
        image: centos:latest
        imagePullPolicy: IfNotPresent
        command: 
        - /bin/sh
        - -c 
        - "for i in `seq 0 10`;do echo `date` && sleep 1;done"
      restartPolicy: Never
```

2、运行Jobs任务并查看,Jobs控制器同时创建了3个并发任务

![Jobs并发运行任务](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/6%20-%201620.jpg)

3、通过上面的演示可知，通过parallelism指定并发数量，Jobs控制器会创建出多个Pod副本并运行直至任务completed，同时parallelism可以配合completions一起使用，通过并发创建特定数量的任务，如下以单次运行3个并发任务实现9个任务的Jobs任务

```js
apiVersion: batch/v1
kind: Job
metadata:
  name: jobs-demo
  labels:
    controller: jobs
spec:
  parallelism: 3    #并发任务为3
  completions: 9    #任务数为9
  template:
    metadata:
      name: jobs-demo
      labels:
        controller: jobs
    spec:
      containers:
      - name: echo-time
        image: centos:latest
        imagePullPolicy: IfNotPresent
        command: 
        - /bin/sh
        - -c 
        - "for i in `seq 0 10`;do echo `date` && sleep 1;done"
      restartPolicy: Never
```

4、运行Jobs任务并观察创建过程,在describe jobs的详情events日志中可以看到一共创建了9个任务，每3个任务创建时间一样，即并发创建的任务

![并发运行多任务](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/7%20-%201620.jpg)

**总结**：通过前面的例子解析可得知，Jobs能在kubernetes中实现类似Windows下批处理或Linux下shell任务的功能，通过运行特定任务数+并发数控制创建Pod任务。需要注意一点的是，Jobs控制器和Deployments副本控制器不一样，其不支持修改Jobs的yaml文件，如果有需要修改则需要提前将Jobs任务删除，然后再将修改后的yaml提交任务。

# 2. CronJobs周期性运转

## 2.1 CronJobs简介

CronJobs用于实现类似Linux下的cronjob周期性计划任务，CronJobs控制器通过时间线创建Jobs任务，从而完成任务的执行处理，其具有如下特点：

- 实现周期性计划任务
- 调用Jobs控制器创建任务
- CronJobs任务名称小于52个字符
- 应用场景如：定期备份，周期性发送邮件

![Cronjob](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/8%20-%201620.jpg)

CronJobs可通过schedule指定任务运行的周期，其使用参数和cronjob类似，分别使用：分时日月星5个参数表示周期性，其中*表示任意时间点，/表示每隔多久，-表示范围

- 分钟  范围为0-59
- 小时  范围为0-23
- 日期  范围为1-31
- 月份  范围为1-12
- 星期  范围为0-7，其中0和7表示星期日

举例子说明：

1、 */1*  * * *      表示每隔1分钟运行任务

2、 1 0 * * 6-7    表示每周六日的0点01分运行任务

## 2.2 运行Cronjobs任务

CronJobs任务是编写和Deployments类似，需啊哟一个schedule定期任务调度周期，通过jobTemplate定义生成Jobs任务的模版，定义一个任务为例：

1、 定义一个CronJobs任务，每隔5分钟运行一个任务

```js
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: cronjob-demo
  labels:
    jobgroup: cronjob-demo
spec:
  schedule: "*/5 * * * *"       #调度任务周期
  jobTemplate:                    #创建Jobs任务模版
    spec:
      template:
        spec:
          containers:
          - name: cronjob-demo
            image: busybox:latest
            imagePullPolicy: IfNotPresent
            command:
            - /bin/sh
            - -c
            - "for i in `seq 0 100`;do echo ${i} && sleep 1;done"
          restartPolicy: Never
```

2、 运行CronJobs并查看任务列表

![运行cronjobs任务](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/9%20-%201620.jpg)

3、校验CronJobs任务运行的情况，可以看到CronJobs任务调用Jobs控制器创建Pod，Pod创建周期和schedule中定义的周期一致

![校验cronjobs](https://agou-images.oss-cn-qingdao.aliyuncs.com/blog-images/k8s%E5%9F%BA%E7%A1%80/kubernetes%E7%B3%BB%E5%88%97%E6%95%99%E7%A8%8B%EF%BC%88%E5%8D%81%E4%B8%89%EF%BC%89%E4%B8%80%E6%AC%A1%E6%80%A7%E4%BB%BB%E5%8A%A1Job%E5%92%8C%E5%91%A8%E6%9C%9F%E4%BB%BB%E5%8A%A1/10%20-%201620.jpg)

当然，CronJobs中通过Jobs的模版也可以定义运行任务的数量和并发数，实现计划时间范围内并发运行多个任务的需求。

# 写在最后

文章总结了在kubernetes集群中运行Jobs批处理任务和CronJobs两种控制器的功能使用，适用于特定场景下任务，Jobs任务执行完毕即completed，CronJobs周期性调用Jobs控制器完成任务的创建执行。

# 参考文章

不错的博客：https://draveness.me/kubernetes-job-cronjob

运行Jobs任务：https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/

计划任务ConJobs:https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

自动运行任务：https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/

TKE创建Jobs任务：[https://cloud.tencent.com/document/product/457/31708](https://cloud.tencent.com/document/product/457/31708?from=10680)

TKE创建CronJobs：[https://cloud.tencent.com/document/product/457/31709

> 『 转载 』该文章来源于网络，侵删。 

