---
title: "MacOS偏门解决vim/Neovim光标跳转（j/k键）卡顿的问题。【使用karabiner】"
date: 2022-08-05T17:02:21+08:00
lastmod: 2022-08-05T17:02:21+08:00
draft: false
description: ""
tags: []
categories: ["MacOS", "neovim"]
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

问题详情参考：[https://blog.deskangel.com/2021/04/03/vim-j-k-speed-issue/](https://blog.deskangel.com/2021/04/03/vim-j-k-speed-issue/)

在iterm2中强制让英文输入法切换为内置的`ABC输入法`而不使用搜狗或者其他输入法的英文状态.

在使用iterm2的时候，将`左shift`键重新映射为`command+space`键（在系统快捷键中设置切换输入法的快捷键，这里你可以自定义）。
使用以下命令将上面这个键盘映射json文件导入到karabiner里面（浏览器打开就可以，会自动拉起karabiner，路径自定义。）

```bash
karabiner://karabiner/assets/complex_modifications/import?url=file:///Users/agou-ops/Desktop/iterm2.json
# 或者直接使用我上传好的在线gist文件.
karabiner://karabiner/assets/complex_modifications/import?url=https://gist.githubusercontent.com/AGou-ops/cb8659d99ff47f32eeb14a81ad47a2a9/raw/85b9ecce462330c57de0930d9495d257ed903ac1/iterm2_key.json
```

<!--more-->

<script src="https://gist.github.com/AGou-ops/cb8659d99ff47f32eeb14a81ad47a2a9.js"></script>
