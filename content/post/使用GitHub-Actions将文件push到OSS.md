---
title: "使用GitHub Actions将文件push到OSS"
date: 2020-08-04T10:23:38+08:00
lastmod: 2020-08-04T10:23:38+08:00
draft: false
description: ""
tags: ["GitHub Action", "OSS"]
categories: ["GitHub"]
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


阿里云对象存储服务（Object Storage Service，简称OSS）为您提供基于网络的数据存取服务。使用OSS，您可以通过网络随时存储和调用包括文本、图片、音频和视频等在内的各种非结构化数据文件。

官方帮助文档：https://help.aliyun.com/document_detail/31883.html


<!-- more -->

1. 首先打开所要使用`Github Actions`的仓库，点击`Actions`，并创建一个新的`workflow`
  ![3zlpwD.png](https://s2.ax1x.com/2020/03/08/3zlpwD.png)
  此时，github将会自动在仓库中创建一个名为`.github/workflows`的文件夹。
  ![3zlN0U.png](https://s2.ax1x.com/2020/03/08/3zlN0U.png)
2. 编辑配置文件`oss.yml`,输入以下内容
```yaml
name: MainWorkflow

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: actions/setup-node@v1
      with:
        node-version: "12.x"
    - name: Build Blog
      run: |
        npm install
        npm install -g hexo-cli
        hexo generate
    - uses: manyuanrong/setup-ossutil@v1.0
      with:
        # endpoint 可以去oss控制台上查看
        endpoint: "oss-cn-hangzhou.aliyuncs.com"
        # 使用我们之前配置在secrets里面的accesskeys来配置ossutil
        access-key-id: ${{ secrets.ACCESS_KEY_ID }}
        access-key-secret: ${{ secrets.ACCESS_KEY_SECRET }}
    - name: Deply To OSS
      run: ossutil cp public oss://agou-ops/ -rf

```
其中，`secrets.ACCESS_KEY_ID`和`secrets.ACCESS_KEY_SECRET`属于github的专用秘钥，比较隐私的变量可以放置在此处，具体位置在Settings>Secrets
![3zlx9s.png](https://s2.ax1x.com/2020/03/08/3zlx9s.png)
3. 提交`commit`，github会自动进行部署，点击`Actions`可以查看部署的详细状态
## 参考链接
> [Github Actions入门教程](http://www.ruanyifeng.com/blog/2019/09/getting-started-with-github-actions.html
),阮一峰
> [GitHub Pages 官方文档](https://help.github.com/en/categories/automating-your-workflow-with-github-actions)
> [Github Actions for web apps](https://lukeboyle.com/blog-posts/2019/08/github-actions-for-web-apps/), Luke Boyle
> [My First Week With GitHub Actions](https://medium.com/@adam.zolyak/my-first-week-with-github-actions-5d92de4c4851), Adam Zolyak
