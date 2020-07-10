---
title: "Apache HTTPD使用Let's Encrypt"
date: 2020-07-10T21:15:22+08:00
lastmod: 2020-07-10T21:15:22+08:00
draft: false
description: ""
tags: ["Linux","Apache","httpd","SSL"]
categories: ["Linux"]
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

## `Apache HTTPD`使用`Let's Encrypt`实现安全连接(https)


安装`cerbot`:

```bash
yum update -y 
yum install -y cerbot
```

生成高安全性的`DH`秘钥到`/etc/ssl/certs/`目录当中去:

<!--more-->

```bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

运行以下命令创建目录, 并使它可写为Apache服务器:

```bash
sudo mkdir -p /var/lib/letsencrypt/.well-known
sudo chgrp www-data /var/lib/letsencrypt
sudo chmod g+s /var/lib/letsencrypt
```

为了避免复制代码和配置更易于维护, 创建以下两个配置代码片段:

* 编辑`/etc/apache2/conf-available/letsencrypt.conf`
```bash
Alias /.well-known/acme-challenge/ "/var/lib/letsencrypt/.well-known/acme-challenge/"
<Directory "/var/lib/letsencrypt/">
    AllowOverride None
    Options MultiViews Indexes SymLinksIfOwnerMatch IncludesNoExec
    Require method GET POST OPTIONS
</Directory>
```

* 编辑`/etc/apache2/conf-available/ssl-params.conf`:

```bash
SSLProtocol             all -SSLv3 -TLSv1 -TLSv1.1
SSLCipherSuite          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
SSLHonorCipherOrder     off
SSLSessionTickets       off

SSLUseStapling On
SSLStaplingCache "shmcb:logs/ssl_stapling(32768)"

SSLOpenSSLConfCmd DHParameters "/etc/ssl/certs/dhparam.pem" 

Header always set Strict-Transport-Security "max-age=63072000"

```

进行启用配置文件之前, 确保`mod_ssl `和`mod_headers`已经被启用:

```bash
sudo a2enmod ssl
sudo a2enmod headers
```

然后, 启用`SSL`配置文件, 运行以下命令即可:

```bash
sudo a2enconf letsencrypt
sudo a2enconf ssl-params
```

启用`HTTP/2`模块:

```bash
sudo a2enmod http2
```
重启`httpd`让配置生效:

```bash
systemctl restart httpd
```

现在，我们可以使用`webroot`插件运行`Certbot`工具并获取SSL证书文件：

```bash
sudo certbot certonly --agree-tos --email agou-ops@foxmail.com --webroot -w /var/lib/letsencrypt/ -d agou-ops.top -d www.agou-ops.top
```

如果输出以下信息, 则表已经成功申请到`SSL`证书文件:

```bash
IMPORTANT NOTES:
 - Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/agou-ops.top/fullchain.pem
   Your key file has been saved at:
   /etc/letsencrypt/live/agou-ops.top/privkey.pem
   Your cert will expire on 2020-10-06. To obtain a new or tweaked
   version of this certificate in the future, simply run certbot
   again. To non-interactively renew *all* of your certificates, run
   "certbot renew"
 - Your account credentials have been saved in your Certbot
   configuration directory at /etc/letsencrypt. You should make a
   secure backup of this folder now. This configuration directory will
   also contain certificates and private keys obtained by Certbot so
   making regular backups of this folder is ideal.
 - If you like Certbot, please consider supporting our work by:

   Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
   Donating to EFF:                    https://eff.org/donate-le
```

## 配置虚拟主机

创建一个虚拟主机`conf.d/agou-ops-top.conf`(仅为示例):

```bash
<VirtualHost *:80> 
  ServerName mail.agou-ops.top

  Redirect permanent / https://mail.agou-ops.top/
</VirtualHost>

<VirtualHost *:443>
  ServerName mail.agou-ops.top

  Protocols h2 http:/1.1

  <If "%{HTTP_HOST} == 'www.mail.agou-ops.top'">
    Redirect permanent / https://mail.agou-ops.top/
  </If>

  DocumentRoot /var/www/mail.agou-ops.top/public_html
  ErrorLog ${APACHE_LOG_DIR}/mail.agou-ops.top-error.log
  CustomLog ${APACHE_LOG_DIR}/mail.agou-ops.top-access.log combined

  SSLEngine On
  SSLCertificateFile /etc/letsencrypt/live/mail.agou-ops.top/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/mail.agou-ops.top/privkey.pem

  # Other Apache Configuration

</VirtualHost>

```

重载`httpd`使虚拟主机配置生效:

```bash
systemctl  reload httpd
```

现在, 就可以通过`https`访问你的站点了: https://agou-ops.top

## 自动更新Let’s Encrypt证书

`Let’s Encrypt`的证书有效期为90天, 自动更新证书到期前,certbot包创建一个计划, 一天两次, 并自动更新任何证书到期前30天.

解决方法, 添加定时任务, `/etc/cron.d/cerbot`, 内容如下所示:

```bash
0 */12 * * * root test -x /usr/bin/certbot -a \! -d /run/systemd/system && perl -e 'sleep int(rand(3600))' && certbot -q renew --renew-hook "systemctl reload apache2"
```

测试更新, 使用`certbot`的干跑模式进行测试:

```bash
sudo certbot renew --dry-run
```

## 参考链接

* SSL lab: https://www.ssllabs.com/
* Let's Encrypt: https://letsencrypt.org/
<!--more-->
