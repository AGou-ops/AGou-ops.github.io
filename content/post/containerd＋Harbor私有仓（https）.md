---
title: "Containerd＋Harbor私有仓（https）"
date: 2023-06-17T08:31:02+08:00
lastmod: 2023-06-17T08:31:02+08:00
draft: false
description: ""
tags: []
categories: []
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

看似简单，其实中间有很多坑，有时候一个小小的错误就会导致一连串的问题，故在此记录一下。

## 预先准备

### 配置Harbor https

生成CA自签证书、私钥、habor证书私钥（`harbor.xxx.local`换成你自己的域名）：

```bash
# CA私钥
openssl genrsa -out ca.key 4096
# CA证书
openssl req -x509 -new -nodes -sha512 -days 3650 \
 -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=harbor.xxx.local" \
 -key ca.key \
 -out ca.crt
# 生成habor私钥
openssl genrsa -out harbor.key 4096
# 生成证书请求文件
openssl req -sha512 -new \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=yourdomain.com" \
    -key harbor.key \
    -out harbor.csr
# 生成x509 v3格式的文件
cat > v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1=harbor.xxx.local
DNS.2=harbor.xxx
EOF
# 使用上面的文件来签署证书
openssl x509 -req -sha512 -days 3650 \
    -extfile v3.ext \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -in harbor.csr \
    -out harbor.crt
```

<!--more-->

### 安装Harbor

下载harbor，拷贝证书私钥：

```bash
wget https://github.com/goharbor/harbor/releases/download/v2.8.2/harbor-offline-installer-v2.8.2.tgz
tar xf harbor-offline-installer-v2.8.2.tgz
cd harbor
cp harbor.yml.tmpl harbor.yml
# 拷贝上面生成的ca和Harbor证书私钥文件到该目录下的certs文件夹，如下所示
$ ls certs/
ca.crt  ca.key  harbor.crt  harbor.csr  harbor.key  v3.ext
```

编辑harbor.yml配置文件，主要修改内容如下：

```bash
# Configuration file of Harbor

# The IP address or hostname to access admin UI and registry service.
# DO NOT use localhost or 127.0.0.1, because Harbor needs to be accessed by external clients.
hostname: harbor.xxx.local

# http related config
http:
  # port for http, default is 80. If https enabled, this port will redirect to https port
  port: 80

# https related config
https:
  # https port for harbor, default is 443
  port: 443
  # The path of cert and key files for nginx
  certificate: /root/harbor/certs/harbor.crt
  private_key: /root/harbor/certs/harbor.key
 
# 这里特别注意，如果用了haproxy或者nginx等反向代理工具的话，需要额外设置external_url，并且协议头必须是https
#external_url: https://harbor.xxx.local
```

运行脚本自动生成`docker-compose.yml`:

```bash
./prepare
```

完成之后，启动：

```bash
docker compose up -d
```

使用`docker ps `查看harbor容器状态，全为`healthy`即为正常。

最后，打开浏览器访问 https://your_IP_or_your_FQDN_addr 即可。

### 安装containerd，runC

```bash
wget https://github.com/containerd/containerd/releases/download/v1.7.2/containerd-1.7.2-linux-amd64.tar.gz
tar Cxzvf /usr/local containerd-1.7.2-linux-amd64.tar.gz

wget https://raw.githubusercontent.com/containerd/containerd/main/containerd.service -O /usr/lib/systemd/system/containerd.service

systemctl daemon-reload
systemctl enable --now containerd

wget https://github.com/opencontainers/runc/releases/download/v1.1.7/runc.amd64
install -m 755 runc.amd64 /usr/local/sbin/runc
```

## 允许不安全的私有仓

也就是上面我们配置好的harbor私有仓。

### containerd

containerd配置起来比较麻烦，而且要求一定要https，http不行，搞得我重新部署了一下harbor，6。stackoverflow上逛了好几圈才知道。

生成默认配置文件：

```bash
containerd config default > /etc/containerd/config.toml
```

编辑该配置文件（~~~吐槽：toml配置文件是真的反人类~~~）：

```bash
vim /etc/containerd/config.toml
# 大概126行，不一定，配置使用cgroup，k8s需要
           [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
			...
			SystemdCgroup = true
# 在大概162行，不一定，配置私有仓，在这里，你还可以配置其他镜像源，比如阿里云镜像源等等
    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = ""
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."harbor.xxx.local"]
      endpoint = ["https://harbor.xxx.local"]
      insecure = true
      # 这里配置一份ca和harbor证书私钥，从上面harbor主机复制过来一份
      ca_file = "/etc/containerd/harbor/certs/ca.crt"
      cert_file = "/etc/containerd/harbor/certs/harbor.crt"
      key_file = "/etc/containerd/harbor/certs/harbor.key"
      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]
        [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.xxx.local".auth]
        username = "al-admin"
        password = "52PXZ2IDNWzk"
    [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.xxx.local".tls]
      ca_file = "/etc/containerd/harbor/certs/ca.crt"	# 这个地方卵用没用，试了好几次，一直x509证书报错
	  cert_file = "/etc/containerd/harbor/certs/harbor.crt"
      key_file = "/etc/containerd/harbor/certs/harbor.key"
      insecure_skip_verify = true	# 这个地方卵用没用，试了好几次

```

**如果这时你重启containerd，然后拉取harbor私有仓的镜像，会发现类似以下错误：**

```bash
INFO[0000] trying next host                              error="failed to do request: Head \"https://xxx.local/v2/library/docker/getting-started/manifests/sha256:f26ee7c110d3591616e7d8dcbd2af90babc9e10abd86e13f77a5800d861fef79\": tls: failed to verify certificate: x509: certificate signed by unknown authority" host=xxx.local
INFO[0000] trying next host                              error="failed to do request: Head \"https://xxx.local/v2/library/docker/getting-started/blobs/sha256:f26ee7c110d3591616e7d8dcbd2af90babc9e10abd86e13f77a5800d861fef79\": tls: failed to verify certificate: x509: certificate signed by unknown authority" host=xxx.local
ctr: failed to resolve reference "xxx.local/library/docker/getting-started@sha256:f26ee7c110d3591616e7d8dcbd2af90babc9e10abd86e13f77a5800d861fef79": failed to do request: Head "https://xxx.local/v2/library/docker/getting-started/manifests/sha256:f26ee7c110d3591616e7d8dcbd2af90babc9e10abd86e13f77a5800d861fef79": tls: failed to verify certificate: x509: certificate signed by unknown authority
```

这时候就需要拷贝一份上面harbor的ca到系统ca目录并更新（也是stackoverflow上找了好久，醉了）：

```bash
cp ca.crt /usr/local/share/ca-certificates/
/usr/sbin/update-ca-certificates
```

然后就可以愉快的拉取harbor私有仓了😎：

```bash
 ctr images pull harbor.xxx.local/library/docker/getting-started@sha256:f26ee7c110d3591616e7d8dcbd2af90babc9e10abd86e13f77a5800d861fef79
```

### docker

docker的话就比较简单了，如下：

```bash
cat > /etc/docker/daemon.json <<EOF
{
  "insecure-registries" : ["http://harbor.xxxx.local"]
}
EOF
systemctl daemon-realod
systemctl restart docker
```

测试登录私有仓：

```bash
$ docker login harbor.xxx.local
Authenticating with existing credentials...
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
```

## 参考资料

- https://github.com/k3s-io/k3s/issues/1148

