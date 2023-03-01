---
title: "钉钉群聊机器人sample"
date: 2021-12-09T08:49:21+08:00
lastmod: 2021-12-09T08:49:21+08:00
draft: false
description: ""
tags: ["钉钉机器人","Golang"]
categories: ["Golang"]
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

最近需要做一个钉钉群聊机器人，需求是：**艾特该机器人并发送相应关键字，机器人会进行相应的自动回复。**

通过`钉钉开放平台·钉钉机器人`的[企业自建机器人](https://open.dingtalk.com/document/robots/enterprise-created-chatbot?spm=ding_open_doc.document.0.0.3d6d24cb7j00JN#topic-2097982)官方文档以及网络上其他语言（Java，Python等）的钉钉机器人的实现，自己瞎编写出来了一个基础版本的小机器人。

奇怪的是用Golang来写的人很少，可能是官方的示例中没有Golang吧，虽然会一些Python，但是现在转学Golang了，故借此机会来巩固一下最近所学的一些东西:smile: 。



`DingTalk_robot`群聊机器人处理流程图：

![DingTalk_robot](https://cdn.agou-ops.cn/others/DingTalk_robot.png)

<!--more-->

## 预先准备

首先需要自己创建一个测试公司（如若你是钉钉企业管理员的话，可忽略该步骤），创建流程很简单，这里我就不再赘述，详情参考：[钉钉创建企业/组织/团队](https://nh.dingtalk.com/admindetail.html?id=cjtd).

接下来进入[钉钉开放平台](https://open.dingtalk.com/developer)，登录并选择自己上面创建的测试公司之后，点击右上角的`开发者控制台`，进入如下页面：



![image-20211209095700036](https://cdn.agou-ops.cn/others/image-20211209095700036.png)

依次点击，创建一个属于自己的机器人🤖，里面的`应用名称`、`应用描述`和`应用图标`随便填。

![image-20211209100434862](https://cdn.agou-ops.cn/others/image-20211209100434862.png)

创建完成之后，记录下`AppSecret`（后面计算sign校验会用到），然后:warning:重点来到`开放管理`页面，如下图所示：

![image-20211209100749557](https://cdn.agou-ops.cn/others/image-20211209100749557.png)

相关解释：

- `服务器出口IP`：~~相当于白名单，也就是允许那些网段或者IP的人使用该机器人，可以限定为公司运营商的公网IP范围（不知道为什么设置了出口IP和没设置出口IP还有随便乱设置出口IP都可以使用）；~~  输入调用钉钉服务端API时使用的IP即企业服务器的公网IP，多个IP请以英文逗号","隔开，支持带一个*号通配符的IP格式;
- `消息接收地址`：钉钉机器人服务器`outgoing回调`给开发者服务器的一个地址，需要特别注意的是，改地址需要`公网IP地址`，当然此处填写域名URL也是可以的。

`权限管理`,这个自己看看需要什么权限就加那些吧，本着最小权限的规则进行选择。

完成上面所有操作之后，在上面的`版本管理与发布`页面对自己创建的机器人进行`调试`或者`发布`，选择调试的话会给你个二维码，你可以直接用移动端钉钉扫码加如钉钉机器人测试群，选择发布的话，就可以在自己的测试公司添加机器人，详情参考：[钉钉添加机器人到钉钉群](https://developers.dingtalk.com/document/robots/use-group-robots)

## 本地测试

在服务器上开发调试可不是一个好的选择，本地写好推送到服务器，如果频繁调试的话，也是非常的麻烦。

所以我推荐使用内网穿透，本地就可以直接进行开发和调试，内网穿透的教程参考我之前写的一篇博客，[内网穿透工具](https://agou-ops.cn/post/%E5%86%85%E7%BD%91%E7%A9%BF%E9%80%8F/)…

直接贴一下我的`fprs`和`frpc`的配置文件好了：

```ini
# frps.ini 文件内容
[common]
bind_port = 5000
token = jSUSpHdC
dashboard_port = 5500
dashboard_user = admin
dashboard_pwd = admin
# frpc.ini 文件内容
[common]
server_addr = 121.36.1.255
server_port = 5000
token = jSUSpHdC

[dingtalk_robot]
type = tcp
local_ip = 127.0.0.1
local_port = 8080
remote_port = 9999
```

使用`ngrok`的话，一条命令`ngrok http 9999`直接启动，然后将生成的URL填入上面的`消息接收地址`。

## 代码编写

代码就没必要在这里大篇幅讲了，了解大概流程就可，虽然代码都是乱写的，但是我是一个讲究代码规范的人:joy: ，代码里面都有很详细的注释，看不懂的可以提个issue。

**所有代码以及[Releases包](https://github.com/AGou-ops/dingtalk_robot_sample/releases)已放到GitHub上，:point_right:[点击此处进行访问](https://github.com/AGou-ops/dingtalk_robot_sample)**。

## 效果示例

程序前台启动界面：

![image-20211209135948692](https://cdn.agou-ops.cn/others/image-20211209135948692.png)

日志文件写到了`/var/log/dingtalk_robot.log`，注意用户权限。

日志文件初步内容如下所示（分屏左边:point_left:）：

![image-20211209142418519](https://cdn.agou-ops.cn/others/image-20211209142418519.png)

钉钉群聊机器人自动回复界面：

- `ip`关键字（消息类型Markdown）：

![image-20211209140912581](https://cdn.agou-ops.cn/others/image-20211209140912581.png)

- `help`关键字（（消息类型Markdown）：

![image-20211209140952071](https://cdn.agou-ops.cn/others/image-20211209140952071.png)

- `about`关键字（消息类型ActionCard）：

![image-20211209141021944](https://cdn.agou-ops.cn/others/image-20211209141021944.png)

- 无关键字（消息类型Markdown）：

![image-20211209141048037](https://cdn.agou-ops.cn/others/image-20211209141048037.png)

## 总结

目前虽只有获取公司公网IPv4这个功能，但**天子驾二已成，未来不是想拉什么货就拉？xd.** :joy: ，后续如果有其他需要的话，可以直接在此基础上进行添加。

Done.

## 参考文档

- 钉钉企业自建机器人：[https://open.dingtalk.com/document/robots/enterprise-created-chatbot?spm=ding_open_doc.document.0.0.3d6d24cb7j00JN#topic-2097982](https://open.dingtalk.com/document/robots/enterprise-created-chatbot?spm=ding_open_doc.document.0.0.3d6d24cb7j00JN#topic-2097982)
- 消息类型和数据格式：[https://open.dingtalk.com/document/robots/message-types-and-data-format?spm=ding_open_doc.document.0.0.eaef2ccbpoeEEg#topic-2098229](https://open.dingtalk.com/document/robots/message-types-and-data-format?spm=ding_open_doc.document.0.0.eaef2ccbpoeEEg#topic-2098229)
