---
title: "自定义 shortcode"
date: 2020-10-06T16:06:48+08:00
lastmod: 2020-10-06T16:06:48+08:00
draft: false
description: ""
tags: []
categories: ['hugo','shortcode']
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

# shortcode ???

什么是`shortcode`以及`hugo内置shortcode`参考： [shortcodes-preview](https://agou-ops.top/post/shortcodes-preview/)



## github shortcode

在指定目录添加以下文件：

<!--more-->

```html
<!-- 文件位置：~/layouts/shortcodes/github.html -->

<div class="github">
    <div class="logo">
        {{ replace $.Site.Data.SVG.repository "icon" "icon github-icon" | safeHTML }}
        <a class="name" href={{ .Get "link" }} target="_blank">{{ .Get "name" }}</a>
    </div>
    <div class="description">{{ .Get "description" }}</div> 
    <div class="language">
        <span class="language-color" style="background-color: {{ .Get "color" }}"></span>
        <span class="language-name">{{ .Get "language" }}</span>
    </div>
</div>

// 文件位置：~/assets/scss/custom/_custom.scss


// github shortcode
.github {
    border: 1px solid var(--color-contrast-low);
    border-color: #b3b4ac;
    border-style: dotted;
    border-radius: 12px !important;
    margin: 0 auto;
    margin-bottom: 1em;
    padding: 1em;
    background-color: #fcfdf8;
    .github-icon {
        width: 1.2em;
        height: 1.2em;
        margin-right: 0.5em;
        margin-bottom: 0.2em;
        fill: var(--color-contrast-high);
        transition: all .5s;
    }
    .name {
        font-weight: bold;
        color: #0366d6 !important;
        text-decoration: none;
    }
    .description {
        margin-top: 0.5em;
        margin-bottom: 1em;
        color: #586069;
        text-align: justify;
        font-size: 90%;
        transition: all .5s;
    }
    .language-color {
        position: relative;
        top: 1px;
        display: inline-block;
        width: 0.75em;
        height: 0.75em;
        border-radius: 50%;
    }
    .language-name {
        color: var(--color-contrast-high);
        font-size: 90%;
        color: #586069;
        margin-left: 0.5em;
        transition: all .5s;
    }
}

```

`markdown`代码如下（去掉注释符号`/*`和`*/`）：

```markdown
{{/*< github name="kubernetes/kubernetes" link="https://github.com/kubernetes/kubernetes" description="Production-Grade Container Scheduling and Management" color="#00ADD8" language="Go" >*/}}
```

{{< github name="kubernetes/kubernetes" link="https://github.com/kubernetes/kubernetes" description="Production-Grade Container Scheduling and Management" color="#00ADD8" language="Go" >}}


## bilibili shortcode

```markdown
{{/*< bilibili BV1YK4y1C7CU >*/}}
```

{{< bilibili BV1YK4y1C7CU >}}

## video shortcode

```markdown
{{/*<  video link="#" pic="http://cdn.agou-ops.cn/Wallpapers/violet.png" time=10 text="高能部分" time1=20 text1="高能结束" >*/}}
```

{{<  video link="#" pic="http://cdn.agou-ops.cn/Wallpapers/violet.png" time=10 text="高能部分" time1=20 text1="高能结束" >}}