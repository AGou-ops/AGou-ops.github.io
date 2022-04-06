---
title: "迁移博客评论系统从Utteranc.es到Giscus"
date: 2022-03-21T10:16:40+08:00
lastmod: 2022-03-21T10:16:40+08:00
draft: false
description: "迁移博客评论系统从Utteranc.es到Giscus"
tags: []
categories: ["博客"]
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

![img](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/utterances-to-giscus.png)

图片来自：[https://shipit.dev/posts/from-utterances-to-giscus.html](https://shipit.dev/posts/from-utterances-to-giscus.html)
<!--more-->



官方GitHub仓库：[https://github.com/giscus/giscus](https://github.com/giscus/giscus)

>官方简介：
>
>由 [GitHub Discussions](https://docs.github.com/en/discussions) 驱动的评论系统。让访客借助 GitHub 在你的网站上留下评论和反应吧！本项目受 [utterances](https://github.com/utterance/utterances) 强烈启发。
>
>- [开源](https://github.com/giscus/giscus)。🌏
>- 无跟踪，无广告，永久免费。📡 🚫
>- 无需数据库。全部数据均储存在 GitHub Discussions 中。
>- 支持[自定义主题](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md#data-theme)！🌗
>- 支持[多种语言](https://github.com/giscus/giscus/blob/main/CONTRIBUTING.md#adding-localizations)。🌐
>- [高度可配置](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)。🔧
>- 自动从 GitHub 拉取新评论与编辑。🔃
>- [可自建服务](https://github.com/giscus/giscus/blob/main/SELF-HOSTING.md)！🤳

效果图如下所示：

![image-20220321102950127](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321102950127.png)

相比于[Utteranc.es](https://github.com/utterance/utterances)，[Giscus](https://github.com/giscus/giscus)支持对整篇文章进行点赞和其他一些回应，还可以**按照评论新旧进行排序，可支持直接回复，支持懒加载**，自定义主题，可自建服务，高度自定义配置等优点。（前三点比较吸引我）

:smile:介绍到此结束，下面开始快速迁移评论系统到Giscus（仅介绍关键步骤，如需详细步骤及说明请查阅下面的[./参考链接](#参考链接)）

## 正式开始

### 安装Giscus GitHub APP

打开[giscus APP](https://github.com/apps/giscus)，首次打开如下所示：

![image-20220321104037431](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321104037431.png)



点击`Install`，然后：

![image-20220321104053274](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321104053274.png)

### 迁移评论的issues到Discussions

`Giscus`依赖于`Discussions`（顾名思义，专门用来讨论问问题的地方），所以正式启用`Giscus`之前，需要开启`Discussions`，开启的方法在此我就不赘述了，详情参考[GitHub Discussions 快速入门](https://docs.github.com/cn/discussions/quickstart).

相对于在issues里面提交评论（毕竟issues主要用于问问题pr啥的），GitHub Discussions提供更加丰富的评论功能。

![image-20220321104944816](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321104944816.png)

接着打开`Labels`，将issues转换成Discussions（这里我转换过了，所以没有出现，所以我换了个演示账号）

![image-20220321110234121](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321110234121.png)

步骤参考上图，按照顺序点就完了。

### 配置博客使用Discussions

我用的博客系统是`hugo`，主题是`jane`其他博客系统和主题都大同小异，需要修改的配置文件路径为`[YOUR_BLOG_ROOT_DIR]/themes/jane/layouts/partials/comments.html`（没有的话可以新建该文件）

![image-20220321110725975](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321110725975.png)


:information_source:**配置文件内容可自动生成：[https://giscus.app/zh-CN](https://giscus.app/zh-CN)，** 配置非常简单，按照页面提示完成即可，完成之后页面下方会给出相关js代码，直接将代码贴到上面我说的那个位置即可。

![image-20220321110919107](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321110919107.png)

### 关闭Utteranc.es，启用Giscus

这个步骤我不说应该都懂，修改hugo配置文件`config.toml`文件相关配置即可。

![image-20220321111125576](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20220321111125576.png)

## 高级配置项

完整高级配置项参考[高级用法指南](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)（例如允许特定来源）。

个人用简单配置：

```json
{
  "origins": [
    "https://giscus.app",
    "https://giscus.vercel.app",
    "https://agou-ops.cn"
  ],
  "originsRegex": [
    "https://giscus-git-([A-z0-9]|-)*giscus\\.vercel\\.app",
    "http://localhost:[0-9]+",
    "https://agou-ops.cn",
    "https://agou-ops.cn/*"
  ],
  "defaultCommentOrder": "oldest"
}
```

其中`origins`为域名白名单.

:information_source:使用方法，在评论仓库的根目录新建一个`giscus.json`文件，添加上以上配置文件内容即可.

Done.

## 参考链接

- Moving from utterances to giscus: [https://shipit.dev/posts/from-utterances-to-giscus.html](https://shipit.dev/posts/from-utterances-to-giscus.html)
- 博客評論系統從 Utterances 遷移到 Giscus：[https://www.dejavu.moe/posts/utterances-to-giscus/](https://www.dejavu.moe/posts/utterances-to-giscus/)





