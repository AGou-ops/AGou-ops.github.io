---
title: "解决VPS频繁Google人机验证（IP被ban）"
date: 2021-12-02T08:50:05+08:00
lastmod: 2021-12-02T08:50:05+08:00
draft: false
description: ""
tags: ["VPS"]
categories: ["VPS", "GFW"]
keywords: []

author: "AGou-ops"

weight: 1
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

前两天入手了`RackNerd`的一台VPS，选的区域是`华盛顿西雅图`，搭建好magic上网之后，访问Google老是跳人机验证，非常频繁，用起来特别烦人（问tg群里大哥说好像除了`洛杉矶`区域外基本都跳Google人机验证），都有种想换搜索引擎的冲动。但是本着要解决问题和爱折腾的态度，还是尝试解决一下吧。

![避免跳出谷歌人机验证reCAPTCHA界面的解决方法_Tasdily的博客-CSDN博客](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbQAAAB0CAMAAADadTd0AAABjFBMVEX5+fkAAAD////X19dnZ2ezs7NDifIcOqnAwMD7+/v39/e8vLzExMT09PTKysr7+/rPz8/x8/cOMqdvfsGyt9k3g/L48++Zc088Oz2fuuD///gAKqVAPz2w0fC2tLGLe2iDUjhWmPTs4tJxTDr67+Coo57i4eEbOamKos9JT1fI4/o7PU2UZEt1lsKVgm6jdl5lfJDi7/uVj5u0q566zeTVvJ2KsNChsMxWQjrj2MLi9PncyrGPmK10dHQYFxdsou9MSkvUvKjOv7OYl5e1ws3++eqktMbA1OxYWFjO1+msx/IAJqQELpZ6mde8v9je4elHW64hQ6iNqNOJuPBIc7ZBVrIvSKusyvOUns9onPONpc17qvAAE6EjMEetkHKowuE6PURadJ7az8StsL5IbKBqPylmankuKyt8jKO5qZN8gI09VW1MYogVFiInHBZznsJ9RSQwP15qVGBHOTFyZFlvh7Ncd5fCon9qV07v1rluf5K0h2TMqI9/XUNIW41xioawjHZmUT5NNi2RjIp9FtZAAAANAElEQVR4nO2djXsSRxrA11mpvMAyu7lm3eKaKLIbo60VSDQhqMASItoGq3dnP641QptI4531tLa2tXde/vF7Z5ZvSNioS1if+fk8SPZjnrA/3pl3dmcm0jFB4JCO+hcQHB4hLYAIaQFESAsgbWnXzZvHBdPNtesD0kIxVRZMN3aoT9r1kGxHJMFUo9jy9V5p12wb4Kh/KcHBANgxs0facVkRzqYeUOTjfdKO+hcSeEFICyBCWgAR0gKIkBZAhLQAIqQFECEtgAhpAURICyBC2qShozlMEULahKHp04NsLlU1CQ7hTUibNPTWbD9nT92+ffuzzzdrxKs2IW3i0Fsf9HH2BLIwc/vOeZt4e8gipE2exOlhadzbqfNaO9gODDoh7QhI3BolDbWdurNE2AGULmkHaBPSJg+l+0g7cWLmi6uYkAC9+xchbaqg2r3Z/aSdWLj9JaH07ikhbboYmYj0VJEfkrsnZoS0qSJxa/YgaScWvvjrzIKQNlXQ6gcDnF1YWOizNrMgIm2qoNqNIWl3/vb3mZn+cBPSpgl6f3ZQ2g2q1b68c2pBSJtWaF+M3ePS2D1k7cu+YBPSpgh6uhtos1+lE/e5NLaDVO/MCGlTCe1p0b5KU6wtP5i94e4i1c8WhLQphKbPdqVtMC2J021pEtnsZpFvLQ3G8u4/3XtKTxoyey/BNyVu3XAnKlH69RfvShpEbDl+ILIitHmEdjvWs+m2lQtcGtC7M++qegRFjYbHISbbeCTyTady/CbS9xSGSud7nL2dNHSGUqIHwqwJaV7o6VnP3uqTQsndE70dtbeTZofDcZscBLVj4agINS9Q7WxnkMEt0pMPUO38P26f6uH2W1WP8XBYOdAZYotQ8wa66bDJpk+rqvtth9qHA2weNI16nLRYODbOGYlEw6pfn/O9ApS5DiFO+7rBoYbUjZMW9iANhDRvgBLqR32zCkpImyCD0lTpaKWJlSw8MCBNJW9YjpA2QfqlDV5s8Bx3QtoE6Zc20KBBJBb3qC3A0oLXyxioHuXe6hGIih4jnj6UP9IAaOvFR4IX3IOJiNy5aQugqGyLt1jzR5pua5Syl7f/oPuRmv/2gb9finfPUMofsyPufRHFjrbqTC+x5os0/bvjDwh7OeRVxbK8Hgqp+YtXRxVPPM89mTxD0lCbbNu2HI8dqhvgj7STxkdEP7l1SGnkY/Nzr9b2k0bOmPem1toIacPExlvzVdp9ymMfv/xUYq+d3wabO2Anuj8QdxegtCfdOOGbuz+xcmh7syutQjpldss401vGlOFJWkgde/fdV2lpqqhqpO5YVYnKWafcbuOoHU/bltXgzwFBL1lsF+j1gvlQrbUs0CQeUG1/66gaV+pWGQ/G0hp4DI80PKSSY2VQfc4tw66b3TKmDm/SQvZRSvueQPKHre2dHWPrURNfjd9aT2v1+Ys/ruwY5u4GlejqK2Nnx3xcJWv/LBTMfz1pHfLdjoHn/dzynPjJuLaz8whSl0zc/HQJUNriv59hGZfZ8JjVc7iVldF0y3jTWw0+w6WpUuxgZ+NvCfoorblEIXmusNuIPy+YxsP4pS3jo5aRS4Vnv5Wbhvk9QPKVsV0u/Wo8zun1V+aLeM19kFs0n2bkX8yLV9zrnzhTMI/vbZJPt4yK/Nx8ukRS84VnD+OWYf6MX43X5na8dNN4qNn1c50ypg8mDRMNJXqQMw9Zv2/S2CwrCaUtLhGSulnYJSTRNH50A0e/tPUIKFkzCjnyi7GbxiN+Na+QnjZNt65VgG34pC0N3xHy0rh4mhD9kvmblpo3PtEIKZqLF7CMbSwjufLsAcE27e40t2nsfiPAAbF2pNkjv3BM2gUqJebRhkSbz1r1o36JZX6wahQu0JPmefwc5HfzIUl0HEk0EoGIEvnd6Eq7j2f8YT7EEsjyyuM0S0TYt+LV4gP6sXmX8jJ+JtzuW15b/1Dcqg8i8r7tmZfe9WSkfWpgNUeLK5f7pbEoOWOwjgEsG3/2SpNo6XkB6UaacRpt/WE+0Zipm09rrZSfFYWiTjNpy8b3Uy6tfe8Ne9Mjgy3ubdjGUUpbW+lII8U+aaA3zYv/caz5IWmPNGlIGuE7JdI0Hk69tDZs+eghZe9qdQNfI81YvIAXmeUa2Cz1Vo+YWlz8Ogekp3pkXhJ/mC80bptXj2gbUid5pPEyfjemvXrsBRQl3qtMVo720YxXaSs8iXicwySigNedS2ud92p3A9OTc+aTXmnwErN9AuvzxmWUhlGHyczK4gb5zi1j69kVJu381CYiAwAQyZbVeFyWbSCHGPF75NKSr40Xav1Tc7fGAms7xtN1lLb1Ihyax952rzQpcdLYLdv/XdmqYD+tcNGpll6bj3Ow+nrrhYwdht00JSeNy7FpTflH8EYj632SttOW9sMWl7bDpf2vI+1bLm0Hd9Lir4ZhGttLuKFYMHfcznUiu2IYW9vPzT9zvMTETztMGiTnTTx48QpBaVvH8f3WYhU711iGaRjb2FeHZSzjSjAqyDfGF2mRUqjqStPnQuyOBf4MEk3OtW5k0TjbDym+kyQtxwnV+HUuOU7V/dLp+LZRTYY2Nf5johRq3fOaw+1lPFiPRbU5ywml2fGkzspIszIi4U4Z7y0+PQRtNytAWnd5wd1Ke/e3d1Ip0npeCt3n0cDmkXTK6ZTID3YHeBL81zmxUwb0lPG+EsDhBu+7kvEEUJpASAsgQtoEYc9+3Tet5tfN9aH7hu93m2yp+zrIu5qAIaSNB3TbHetEFZ4TK4zWf4oSAUm3axpIEaVzCFVGXtcx0iJepzoJaWOBurXn5FnHf715hT17z+7t7WWqidLensPe0LqD+226mslRKZVlHdfUXnlUSeOkeZ1UKKSNhld8bvWXQiNJNsYCkk4GX1PZsm1nM2kdt+I7LblXUZJORetKoyWnMurCjpPmcfpuREgbCdhqrKyl4tG4BsVMjZI1DDV04WygNGuDkKTF3y0RgGJeowRfutLWs46TG9GsjZXmbaK8cDYaWHP2Kno2g6+JEhvIpKsarFvlbAOAeQEmTUJpzFBFw2ZP5dJg3d0ZZ+6GGJeIoDVbHbMkha2IQNsHlFaFl5laou6kSw2+BbB2rJacNJOm6CWnyqRtgoQq+X666uBFLaFHupaJoN3hUsdKiygeEM72AdbyEUww4upcRxprqSCFLlOWg1RQihtpLWmw6uQty3KWqN68SlD2cKiNX7EnMsZbRMTZ/qA0LVFicpg0zPcxidebTmgOE45UtmK7fYC2NMzydUVazaQVBcOQpBxnznKqbyKNazsQvz95gGHS6Fo+zaq9Uh5TRqwqk04oGs3mUdoGcWcWoTQMwGJFA7Kcz/E2jUkrsgO5ygHEgma+wqTBS6dKkmWs9pYgkW2ki5hAQnKvmuokGVwaNn9LhGUj7ewxYVXcdHKoVRPSfIVLS7DGC+vGIqslXReA7RVGWlcadR8hOui3LS3JakZmd6h+FNJ8BZIqmyyixtU0SLqMqTYk1JrEpjPUFLmdY+gyu08CbL8NLOvnm3R2DvYRhmcmCGn+wtus3jvDvXeLad9Rnf0g9ZwjjRg/IqQFECEtgAhpAURICyBCWgAR0gKIkBZAhLQAIqQFECHNb3z4owVCmi8AHw/K39k1D8e3xkh5LF1I8wNat0JWgy/iAmuV4Qdig6QsPhnU67w6Ic0PEqW8rM5l0mztfTbLh6/PIbVnEFHKV1bsMaTH5WxDVXN8KSloLU4F7qwiIENLhwtpfpAoXSVEb27U5VKtXk2WNUhG06loqAygx0JVqV4FWu99JA1kuaIBpNhEvmS5VGbr0lWToUYOj5srDz4GFdL8gEmDpFVdc0K15cr6Xg1DT882Yk450WyErcpqPrdulaHnAQ0waetOKOZUV50Qnhidc5yo1YBlJ5bND4zoENL8IFFqhMNWQyliwKGNYkVvLulyWimWU5kaSTb07AX+XBrrxbjK44hLW3Vku/lgNa+RNTbuZ4m8bKSLFU0fnCkhpPkBb9NkjaI0ZiOZtzM5vYTJSTmZZ4+rE6VKjI2dg5RlNdylAfAwWnIsi4VhBNbKgLUrk5bKWo3BAQdCmh+gFJaDtKXhhS9D3UmTIkqrUVvFmHKW2qtXuj0DFmlrDUxdCJNWbEvTZE0JZ3L9xQtpfoBtGp/S1JJGS3xOTDnslCPNimxdJevOwCArLi2VCcmhal+k5Zp5uZgX0iYArfM4ovUqhTrLHcNp0OuhML7HBBE3kOZA7w3WqhG+3kM0ZzewdVNBL7FEUlsvhRqDqzUIab7QXXRB6qx2T/l/fOZTJDm0bEZ3BFDnpNYJfT06zoA0MVp4EtDkqHHDXgGlT5oZtsXfZJ0AoChv/ocmAGz7Wo+0Y5ZsK+/ytxPsw1uEhmLLoeu90o6FbFkw5cSut2S1pV2/dlww5ZjHBqQJAoSQFkCEtAAipAUQIS2A/B/PxVzOQ2svXAAAAABJRU5ErkJggg==)

:warning: 以下部分内容来源于网络，仅做个人备份学习使用。

<!--more-->

## 解决方案

网上搜集的解决方案有以下几种：

- 更换IP：频繁跳Google验证意味着你的IP被Google墙了，被识别为恶意IP，`换了IP也不一定管用，到头来折了IP又损了money，亏到裤衩都没了`；

- 使用IPv6：配置IPv6来访问Google，`我这十几刀/yr的VPS就别想IPv6了，xd`；

- 使用IPv6隧道：同上，不同之处就是借用了IPv6隧道，使原来仅有IPv4的机子拥有IPv6的能力，`或许这是个很好的解决方案，值得尝试，事实上这也解决了我的问题`；

- 【附加】：听tg群友说套`warp VPN`也可以解决，但是没试过，具体参考:link: [用 Cloudflare Warp 彻底解决 Google IP 定位中国的问题](https://www.v2ex.com/t/800581)、:link: [安装warp解决Google搜索出现人机验证、解锁Netfix非自制剧最新教程](https://www.4spaces.org/warp-netflix-google-code-solved/)；

    - > 【补充】：感谢[@crazypeace](https://github.com/crazypeace)网友推荐的一键安装`Cloudflare WARP` 并添加` IPv6` 脚本；:heart:
        >
        > ```bash
        > bash <(curl -fsSL git.io/warp.sh) 6
        > ```
        >
        > GitHub仓库地址：[https://github.com/P3TERX/warp.sh](https://github.com/P3TERX/warp.sh)


## 申请免费的IPv6隧道

首先申请一个免费的`IPv6隧道`，这里我使用的是[Tunnelbroker](https://tunnelbroker.net/)，免费简单好用。

申请账号的过程非常简单，输入一些虚拟的个人信息就行，直接胡编乱填就行了，或者在[虚拟外国身份站点](https://www.fakenamegenerator.com/advanced.php?t=country&n%5B%5D=us&c%5B%5D=us&gen=100&age-min=19&age-max=21)上随机一个身份信息，填好邮箱接受邮箱验证就完事了。

![image-20211202092104454](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20211202092104454.png)

 申请完账号之后登录，点击左边的这个`Create Regular Tunnel`创建一般隧道，输入你的IPv4公网IP，选择一个合适的隧道服务器节点，系统会自动选择和你区域相当的节点，所以默认就可以，然后直接点击下方的`Create Tunel`即可.

![image-20211202092502459](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20211202092502459.png)

创建完成之后，点击隧道详情，就可以看到申请好的`IPv6`地址：

![image-20211202092729022](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20211202092729022.png)

要使用的是上图红框中的`IPv6`客户端地址.

## 配置服务器使用IPv6隧道

在[Tunnelbroker](https://tunnelbroker.net/)的隧道详情页中点击`Example Configurations`示例配置，找到匹配自己VPS系统的配置片段，这里我以我的`Ubuntu 20.04`为例（其他发行版类似）：

![image-20211202093034680](https://agou-images.oss-cn-qingdao.aliyuncs.com/others/image-20211202093034680.png)

需要输的命令挺多的，这里我整理为脚本，一条命令傻瓜式运行即可，建议直接使用`root`用户运行，省事：

**:question:不想看脚本？请直接跳到[:smile: 运行在线的jio本](./#-运行在线的jio本)**

```shell
#!/usr/bin/env bash 
set -euo pipefail

#
#**************************************************
# Author:         AGou-ops                        *
# E-mail:         agou-ops@foxmail.com            *
# Date:           2021-12-02                      *
# Description:                              *
# Copyright 2021 by AGou-ops.All Rights Reserved  *
#**************************************************

# ----------------
echoColor(){
  echo -e "\033[36m$1 \033[0m"
}

# 启用ipv6

cat << EOF >> /etc/sysctl.conf
net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.default.disable_ipv6 = 0
net.ipv6.conf.lo.disable_ipv6 = 0
EOF

sysctl -p
echoColor "====== 启用ipv6 ======\n"

# ！！！！！重要！！！！！
# 将下面的重定向内容替换为上面示例的配置片段内容
cat << EOF >>  /etc/network/interfaces

 auto he-ipv6
  iface he-ipv6 inet6 v4tunnel
   address xxxx:xxx:a:10d::2
   netmask 64
   endpoint 216.xx.xx.xx
   local 23.xx.x.xx
   ttl 255
   gateway 2001:xx:a:10d::1
EOF

echoColor "====== 修改网络配置文件成功 ======\n"

apt update -y 2>&1 > /dev/null
apt install ifupdown dnsutils -y 2>&1 > /dev/null

echoColor "====== 安装必要包完成，图个方便，不为啥 ======\n"

sleep 1
# 启动ipv6网络接口，如果没生效可以尝试重启网络
ifup he-ipv6
echoColor "====== 接口内容信息如下 ======\n"
ip a show dev he-ipv6

echoColor "========================\n"
# 备份原来的dns
cp -a /etc/resolv.conf{,.bak}

cat << EOF >> /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF

echoColor "====== 修改dns完成 ======\n"

# 这里用ping查看ipv6地址也可以，这里我图方便使用dig好了
google_ipv6=$(dig www.google.com AAAA | grep -E "^www" | awk '{print $5}')

echo "$google_ipv6 www.google.com" > /etc/hosts

echoColor "====== 修改hosts文件完成 ======\n"

# 默认访问时会使用IPv6线路进行访问，考虑到速度问题，建议优先使用IPv4
sed -i 's@#precedence ::ffff:0:0/96  100@precedence ::ffff:0:0/96  100@g' /etc/gai.conf

echoColor "====== 配置优先IPv4完成 ======\n"

echoColor "\n\nDone."
```

使用`root`用户运行以上jio本：

```bash
chmod +x install_ipv6_tunnel.sh
./install_ipv6_tunnel.sh			# 等待安装完成即可
```

### :smile: 运行在线的jio本

直接在线运行上面的脚本，不用手动复制然后执行了，一条命令完事:

```bash
wget -P /root -N --no-check-certificate "https://gist.githubusercontent.com/AGou-ops/d0c65269da6c77e49a410c6dbe9ce244/raw/e81ed2bcaea9aef80eeda799adbba2bfb63b2f67/install_ipv6_tunnel.sh" && chmod +x /root/install_ipv6_tunnel.sh && /root/install_ipv6_tunnel.sh
```

## 检查VPS的IPv6地址

检查VPS的IPv6地址是否生效，以及VPS的网络是否`IPv4`优先：

```bash
# 查询本机外网IPv6地址
curl 6.ipw.cn
# 备用查询地址
curl ipv6.ip.sb

# 测试网络是IPv4还是IPv6访问优先(访问IPv4/IPv6双栈站点，如果返回IPv6地址，则IPv6访问优先)
curl test.ipw.cn
```

也可以浏览器直接访问[https://ipw.cn/](https://ipw.cn/)进行查看.

Done.

## 参考链接

- 安装warp解决Google搜索出现人机验证、解锁Netfix非自制剧最新教程: https://www.4spaces.org/warp-netflix-google-code-solved/
