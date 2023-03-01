---
title: "NGINX LOGS & GEO MAP(Grafana)详细部署"
date: 2022-04-24T10:57:38+08:00
lastmod: 2022-04-24T10:57:38+08:00
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

![image-20220424105947609](https://cdn.agou-ops.cn/others/image-20220424105947609.png)

以上是`Grafana Template`的页面截图，🔗 [https://grafana.com/grafana/dashboards/12268](https://grafana.com/grafana/dashboards/12268)

<!--more-->

## 重新编译nginx添加geoip2模块

### 准备编译环境

以下以Debian系为例：

```bash
sudo apt install -y build-essential 
sudo apt install -y git libpcre3 libpcre3-dev openssl libssl-dev zlib1g-dev openssl libssl-dev

# 编译ngx_http_geoip2_module之前需要安装libmaxminddb
sudo add-apt-repository ppa:maxmind/ppa

sudo apt update
sudo apt install libmaxminddb0 libmaxminddb-dev mmdb-bin
```

### 编译nginx with ngx_http_geoip2_module

`ngx_http_geoip2_module`模块地址：[https://github.com/leev/ngx_http_geoip2_module](https://github.com/leev/ngx_http_geoip2_module)

```bash
# 下载nginx源码包
wget http://nginx.org/download/nginx-1.20.1.tar.gz
tar xf nginx-1.20.1.tar.gz

# 从github下载ngx_http_geoip2_module源码包
git clone https://github.com/leev/ngx_http_geoip2_module

# 开始编译
cd nginx-1.20.1
./configure -add-dynamic-module=/root/ngx_http_geoip2_module		# 后面这个是ngx_http_geoip2_module源码包的绝对路径
make -j 2
make install
```

> :warning:注意：
>
> 如果编译安装完发现没有生成`objs/ngx_http_geoip2_module.so`文件，只有`objs/ngx_http_geoip2_module.o`，那么你可能就需要重新编译安装了；
>
> 编译安装时带上之前的那些参数，直接复制，然后行尾追加ngx_http_geoip2_module动态模块即可。
>
> 如：（PS：其他参数是通过`nginx -V`获得的）
>
> ```bash
> ./configure --with-cc-opt='-g -O2 -fdebug-prefix-map=/build/nginx-7KvRN5/nginx-1.18.0=. -fstack-protector-strong -Wformat -Werror=format-security -fPIC -Wdate-time -D_FORTIFY_SOURCE=2' --with-ld-opt='-Wl,-Bsymbolic-functions -Wl,-z,relro -Wl,-z,now -fPIC' --prefix=/usr/share/nginx --conf-path=/etc/nginx/nginx.conf --http-log-path=/var/log/nginx/access.log --error-log-path=/var/log/nginx/error.log --lock-path=/var/lock/nginx.lock --pid-path=/run/nginx.pid --modules-path=/usr/lib/nginx/modules --http-client-body-temp-path=/var/lib/nginx/body --http-fastcgi-temp-path=/var/lib/nginx/fastcgi --http-proxy-temp-path=/var/lib/nginx/proxy --http-scgi-temp-path=/var/lib/nginx/scgi --http-uwsgi-temp-path=/var/lib/nginx/uwsgi --with-debug --with-compat --with-pcre-jit --with-http_ssl_module --with-http_stub_status_module --with-http_realip_module --with-http_auth_request_module --with-http_v2_module --with-http_dav_module --with-http_slice_module --with-threads --with-http_addition_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_image_filter_module=dynamic --with-http_sub_module --with-http_xslt_module=dynamic --with-stream=dynamic --with-stream_ssl_module --with-mail=dynamic --with-mail_ssl_module --add-dynamic-module=/root/ngx_http_geoip2_module
> ```

以下为编译安装之后的相关文件路径：

```bash
  nginx path prefix: "/usr/local/nginx"
  nginx binary file: "/usr/local/nginx/sbin/nginx"
  nginx modules path: "/usr/local/nginx/modules"
  nginx configuration prefix: "/usr/local/nginx/conf"
  nginx configuration file: "/usr/local/nginx/conf/nginx.conf"
  nginx pid file: "/usr/local/nginx/logs/nginx.pid"
  nginx error log file: "/usr/local/nginx/logs/error.log"
  nginx http access log file: "/usr/local/nginx/logs/access.log"
  nginx http client request body temporary files: "client_body_temp"
  nginx http proxy temporary files: "proxy_temp"
  nginx http fastcgi temporary files: "fastcgi_temp"
  nginx http uwsgi temporary files: "uwsgi_temp"
  nginx http scgi temporary files: "scgi_temp"
```

### 修改nginx配置文件

```shell
$ vim /usr/local/nginx/conf/nginx.conf
# 在http里面添加以下内容
geoip2 /config/geoip2db/GeoLite2-City.mmdb {
auto_reload 5m;
$geoip2_data_country_iso_code country iso_code;
$geoip2_data_city_name city names en;
}
# 自定义日志文件格式
log_format custom '$remote_addr - $remote_user [$time_local]'
           '"$request" $status $body_bytes_sent'
           '"$http_referer" $host "$http_user_agent"'
           '"$request_time" "$upstream_connect_time"'
           '"$geoip2_data_city_name" "$geoip2_data_country_iso_code"';
           
access_log /config/log/nginx/access.log custom;
```

:information_source:`GeoLite2-City.mmdb`文件可以从[GitHub下载](https://github.com/search?q=GeoLite2-City.mmdb)或者自己注册一个账号下载：[https://www.maxmind.com/en/geolite2/signup](https://www.maxmind.com/en/geolite2/signup)

修改完成之后重启nginx，`systemctl restart nginx`

## 使用脚本将日志写入influxDB

运行脚本之前，安装一下`influxDB`，注意安装版本要使用`1.8x`版本，新版`2.x`版本不可以，github releases地址：[https://github.com/influxdata/influxdb/releases](https://github.com/influxdata/influxdb/releases)

```bash
# 安装influxdb
wget https://dl.influxdata.com/influxdb/releases/influxdb_1.8.10_amd64.deb
sudo dpkg -i influxdb_1.8.10_amd64.deb
systemctl start influxdb
```

Python脚本`geoip2influx.py`内容如下：

```python
#! /usr/bin/env python3

from os.path import exists, isfile
from os import environ as env, stat
from platform import uname
from re import compile, match, search, IGNORECASE
from sys import path, exit
from time import sleep, time
from datetime import datetime
import logging

from geoip2.database import Reader
from geohash2 import encode
from influxdb import InfluxDBClient
from requests.exceptions import ConnectionError
from influxdb.exceptions import InfluxDBServerError, InfluxDBClientError
from IPy import IP as ipadd


# Getting params from envs
geoip_db_path = '/config/geoip2db/GeoLite2-City.mmdb'
log_path = env.get('NGINX_LOG_PATH', '/config/log/nginx/access.log')
influxdb_host = env.get('INFLUX_HOST', 'localhost')
influxdb_port = env.get('INFLUX_HOST_PORT', '8086')
influxdb_database = env.get('INFLUX_DATABASE', 'geoip2influx')
influxdb_user = env.get('INFLUX_USER', 'root')
influxdb_user_pass = env.get('INFLUX_PASS', 'root')
influxdb_retention = env.get('INFLUX_RETENTION','7d')
influxdb_shard = env.get('INFLUX_SHARD', '1d')
geo_measurement = env.get('GEO_MEASUREMENT', 'geoip2influx')
log_measurement = env.get('LOG_MEASUREMENT', 'nginx_access_logs')
send_nginx_logs = env.get('SEND_NGINX_LOGS','true')
log_level = env.get('GEOIP2INFLUX_LOG_LEVEL', 'info').upper()
g2i_log_path = env.get('GEOIP2INFLUX_LOG_PATH','/config/log/geoip2influx/geoip2influx.log')

# Logging
logging.basicConfig(level=log_level,format='GEOIP2INFLUX %(asctime)s :: %(levelname)s :: %(message)s',datefmt='%d/%b/%Y %H:%M:%S',handlers=[logging.StreamHandler(),logging.FileHandler(g2i_log_path)])

# global variables
monitored_ip_types = ['PUBLIC', 'ALLOCATED APNIC', 'ALLOCATED ARIN', 'ALLOCATED RIPE NCC', 'ALLOCATED LACNIC', 'ALLOCATED AFRINIC']


def regex_tester(log_path, N):
    time_out = time() + 60
    re_ipv4 = compile(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})')
    re_ipv6 = compile(r'(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))') # NOQA
    while True:
        assert N >= 0
        pos = N + 1
        lines = []
        with open(log_path) as f:
            while len(lines) <= N:
                try:
                    f.seek(-pos, 2)
                except IOError:
                    f.seek(0)
                    break
                finally:
                    lines = list(f)
                pos *= 2
        log_lines = lines[-N:]
        for line in log_lines:
            if re_ipv4.match(line):
                regex = compile(r'(?P<ipaddress>\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) - (?P<remote_user>.+) \[(?P<dateandtime>\d{2}\/[A-Z]{1}[a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2} ((\+|\-)\d{4}))\](["](?P<method>.+)) (?P<referrer>.+) ((?P<http_version>HTTP\/[1-3]\.[0-9])["]) (?P<status_code>\d{3}) (?P<bytes_sent>\d{1,99})(["](?P<url>(\-)|(.+))["]) (?P<host>.+) (["](?P<user_agent>.+)["])(["](?P<request_time>.+)["]) (["](?P<connect_time>.+)["])(["](?P<city>.+)["]) (["](?P<country_code>.+)["])', IGNORECASE) # NOQA
                if regex.match(line):
                    logging.debug(f'Regex is matching {log_path} continuing...')
                    return True
            if re_ipv6.match(line):
                regex = compile(r'(?P<ipaddress>(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))) - (?P<remote_user>.+) \[(?P<dateandtime>\d{2}\/[A-Z]{1}[a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2} ((\+|\-)\d{4}))\](["](?P<method>.+)) (?P<referrer>.+) ((?P<http_version>HTTP\/[1-3]\.[0-9])["]) (?P<status_code>\d{3}) (?P<bytes_sent>\d{1,99})(["](?P<url>(\-)|(.+))["]) (?P<host>.+) (["](?P<user_agent>.+)["])(["](?P<request_time>.+)["]) (["](?P<connect_time>.+)["])(["](?P<city>.+)["]) (["](?P<country_code>.+)["])', IGNORECASE) # NOQA
                if regex.match(line):
                    logging.debug(f'Regex is matching {log_path} continuing...')
                    return True
            else:
                logging.debug(f'Testing regex on: {log_path}')
                sleep(2)
        if time() > time_out:
            logging.warning(f'Failed to match regex on: {log_path}')
            break


def file_exists(log_path,geoip_db_path):
    time_out = time() + 30
    while True:
        file_list = [log_path, geoip_db_path]
        if not exists(log_path):
            logging.warning((f'File: {log_path} not found...'))
            sleep(1)
        if not exists(geoip_db_path):
            logging.warning((f'File: {geoip_db_path} not found...'))
            sleep(1)
        if all([isfile(f) for f in file_list]):
            for f in file_list:
                logging.debug(f'Found: {f}')
            return True
        if time() > time_out:
            if not exists(geoip_db_path) and not exists(log_path):
                logging.critical(f"Can't find: {geoip_db_path} or {log_path} exiting!")
                break
            elif not exists(geoip_db_path):
                logging.critical(f"Can't find: {geoip_db_path}, exiting!")
                break
            elif not exists(log_path):
                logging.critical(f"Can't find: {log_path}, exiting!")
                break


def logparse(
        log_path, influxdb_host, influxdb_port, influxdb_database, influxdb_user, influxdb_user_pass, influxdb_retention,
        influxdb_shard, geo_measurement, log_measurement, send_nginx_logs, geoip_db_path, inode):
    # Preparing variables and params
    ips = {}
    geohash_fields = {}
    geohash_tags = {}
    log_data_fields = {}
    log_data_tags = {}
    nginx_log = {}
    hostname = uname()[1]
    client = InfluxDBClient(
        host=influxdb_host, port=influxdb_port, username=influxdb_user, password=influxdb_user_pass, database=influxdb_database)

    try:
        logging.debug('Testing InfluxDB connection')
        version = client.request('ping', expected_response_code=204).headers['X-Influxdb-Version']
        logging.debug(f'Influxdb version: {version}')
    except ConnectionError as e:
        logging.critical('Error testing connection to InfluxDB. Please check your url/hostname.\n'
                         f'Error: {e}'
                        )
        exit(1)

    try:
        databases = [db['name'] for db in client.get_list_database()]
        if influxdb_database in databases:    
            logging.debug(f'Found database: {influxdb_database}')
    except InfluxDBClientError as e:
        logging.critical('Error getting database list! Please check your InfluxDB configuration.\n'
                         f'Error: {e}'
                        )
        exit(1)

    if influxdb_database not in databases:
        logging.info(f'Creating database: {influxdb_database}')
        client.create_database(influxdb_database)

        retention_policies = [policy['name'] for policy in client.get_list_retention_policies(database=influxdb_database)]
        if f'{influxdb_database} {influxdb_retention}-{influxdb_shard}' not in retention_policies:
            logging.info(f'Creating {influxdb_database} retention policy ({influxdb_retention}-{influxdb_shard})')
            client.create_retention_policy(name=f'{influxdb_database} {influxdb_retention}-{influxdb_shard}', duration=influxdb_retention, replication='1',
                                                database=influxdb_database, default=True, shard_duration=influxdb_shard)

    re_ipv4 = compile(r'(?P<ipaddress>\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) - (?P<remote_user>.+) \[(?P<dateandtime>\d{2}\/[A-Z]{1}[a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2} ((\+|\-)\d{4}))\](["](?P<method>.+)) (?P<referrer>.+) ((?P<http_version>HTTP\/[1-3]\.[0-9])["]) (?P<status_code>\d{3}) (?P<bytes_sent>\d{1,99})(["](?P<url>(\-)|(.+))["]) (?P<host>.+) (["](?P<user_agent>.+)["])(["](?P<request_time>.+)["]) (["](?P<connect_time>.+)["])(["](?P<city>.+)["]) (["](?P<country_code>.+)["])', IGNORECASE) # NOQA
    re_ipv6 = compile(r'(?P<ipaddress>(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))) - (?P<remote_user>.+) \[(?P<dateandtime>\d{2}\/[A-Z]{1}[a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2} ((\+|\-)\d{4}))\](["](?P<method>.+)) (?P<referrer>.+) ((?P<http_version>HTTP\/[1-3]\.[0-9])["]) (?P<status_code>\d{3}) (?P<bytes_sent>\d{1,99})(["](?P<url>(\-)|(.+))["]) (?P<host>.+) (["](?P<user_agent>.+)["])(["](?P<request_time>.+)["]) (["](?P<connect_time>.+)["])(["](?P<city>.+)["]) (["](?P<country_code>.+)["])', IGNORECASE) # NOQA

    gi = Reader(geoip_db_path)

    if send_nginx_logs in ('true', 'True'):
        send_logs = True
    else:
        send_logs = False
        re_ipv4 = compile(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})')
        re_ipv6 = compile(r'(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))') # NOQA
        logging.info('SEND_NGINX_LOGS set to false')
        pass
    if not regex_tester(log_path,3):
        if send_logs:
            re_ipv4 = compile(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})')
            re_ipv6 = compile(r'(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))') # NOQA
            send_logs = False
            logging.warning('NGINX log metrics disabled! Double check your NGINX custom log format..')

    # Main loop to parse access.log file in tailf style with sending metrics.
    with open(log_path, 'r') as log_file:
        logging.info('Starting log parsing')
        str_results = stat(log_path)
        st_size = str_results[6]
        log_file.seek(st_size)
        while True:
            geo_metrics = []
            log_metrics = []
            where = log_file.tell()
            line = log_file.readline()
            inodenew = stat(log_path).st_ino
            if inode != inodenew:
                break
            if not line:
                sleep(1)
                log_file.seek(where)
            else:
                if re_ipv4.match(line):
                    m = re_ipv4.match(line)
                    ip = m.group(1)
                    log = re_ipv4
                elif re_ipv6.match(line):
                    m = re_ipv6.match(line)
                    ip = m.group(1)
                    log = re_ipv6
                else:
                    logging.warning('Failed to match regex that previously matched!? Skipping this line!\n'
                                    'If you think the regex should have mathed the line, please share the log line below on https://discord.gg/HSPa4cz or Github: https://github.com/gilbN/geoip2influx\n' 
                                    f'Line: {line}'
                                   )
                    continue
                ip_type = ipadd(ip).iptype()
                if ip_type in monitored_ip_types and ip:
                    info = gi.city(ip)
                    if info:
                        geohash = encode(info.location.latitude, info.location.longitude)
                        geohash_fields['count'] = 1
                        geohash_tags['geohash'] = geohash
                        geohash_tags['ip'] = ip
                        geohash_tags['host'] = hostname
                        geohash_tags['country_code'] = info.country.iso_code
                        geohash_tags['country_name'] = info.country.name
                        geohash_tags['state'] = info.subdivisions.most_specific.name if info.subdivisions.most_specific.name else "-"
                        geohash_tags['state_code'] = info.subdivisions.most_specific.iso_code if info.subdivisions.most_specific.iso_code else "-"
                        geohash_tags['city'] = info.city.name if info.city.name else "-"
                        geohash_tags['postal_code'] = info.postal.code if info.postal.code else "-"
                        geohash_tags['latitude'] = info.location.latitude if info.location.latitude else "-"
                        geohash_tags['longitude'] = info.location.longitude if info.location.longitude else "-"
                        ips['tags'] = geohash_tags
                        ips['fields'] = geohash_fields
                        ips['measurement'] = geo_measurement
                        geo_metrics.append(ips)
                        logging.debug(f'Geo metrics: {geo_metrics}')
                        try:
                            client.write_points(geo_metrics)
                        except (InfluxDBServerError, ConnectionError) as e:
                            logging.error('Error writing data to InfluxDB! Check your database!\n'
                                          f'Error: {e}'
                                         )
                else:
                    logging.debug(f"Incorrect IP type: {ip_type}")
                if send_logs:
                    data = search(log, line)
                    if ip_type in monitored_ip_types and ip:
                        info = gi.city(ip)
                        if info:
                            datadict = data.groupdict()
                            log_data_fields['count'] = 1
                            log_data_fields['bytes_sent'] = int(datadict['bytes_sent'])
                            log_data_fields['request_time'] = float(datadict['request_time'])
                            try:
                                log_data_fields['connect_time'] = float(datadict['connect_time']) if datadict['connect_time'] != '-' else 0.0
                            except ValueError:
                                log_data_fields['connect_time'] = str(datadict['connect_time'])
                            log_data_tags['ip'] = datadict['ipaddress']
                            log_data_tags['datetime'] = datetime.strptime(datadict['dateandtime'], '%d/%b/%Y:%H:%M:%S %z')
                            log_data_tags['remote_user'] = datadict['remote_user']
                            log_data_tags['method'] = datadict['method']
                            log_data_tags['referrer'] = datadict['referrer']
                            log_data_tags['host'] = datadict['host']
                            log_data_tags['http_version'] = datadict['http_version']
                            log_data_tags['status_code'] = datadict['status_code']
                            log_data_tags['bytes_sent'] = datadict['bytes_sent']
                            log_data_tags['url'] = datadict['url']
                            log_data_tags['user_agent'] = datadict['user_agent']
                            log_data_tags['request_time'] = datadict['request_time']
                            log_data_tags['connect_time'] = datadict['connect_time']
                            log_data_tags['city'] = datadict['city']
                            log_data_tags['country_code'] = datadict['country_code']
                            log_data_tags['country_name'] = info.country.name
                            nginx_log['tags'] = log_data_tags
                            nginx_log['fields'] = log_data_fields
                            nginx_log['measurement'] = log_measurement
                            log_metrics.append(nginx_log)
                            logging.debug(f'NGINX log metrics: {log_metrics}')
                            try:
                                client.write_points(log_metrics)
                            except (InfluxDBServerError, InfluxDBClientError, ConnectionError) as e:
                                logging.error('Error writing data to InfluxDB! Check your database!\n'
                                            f'Error: {e}'
                                            )


def main():
    logging.info('Starting geoip2influx..')

    logging.debug('Variables set:' +
    f'\n geoip_db_path             :: {geoip_db_path}' +
    f'\n -e LOG_PATH               :: {log_path}' +
    f'\n -e INFLUX_HOST            :: {influxdb_host}' +
    f'\n -e INFLUX_HOST_PORT       :: {influxdb_port}' +
    f'\n -e INFLUX_DATABASE        :: {influxdb_database}' +
    f'\n -e INFLUX_RETENTION       :: {influxdb_retention}' +
    f'\n -e INFLUX_SHARD           :: {influxdb_shard}' +
    f'\n -e INFLUX_USER            :: {influxdb_user}' +
    f'\n -e INFLUX_PASS            :: {influxdb_user_pass}' +
    f'\n -e GEO_MEASUREMENT        :: {geo_measurement}' +
    f'\n -e LOG_MEASUREMENT        :: {log_measurement}' +
    f'\n -e SEND_NGINX_LOGS        :: {send_nginx_logs}' +
    f'\n -e GEOIP2INFLUX_LOG_LEVEL :: {log_level}' 
    )
    # Parsing log file and sending metrics to Influxdb
    while file_exists(log_path,geoip_db_path):
        # Get inode from log file
        inode = stat(log_path).st_ino
        # Run main loop and grep a log file
        logparse(
            log_path, influxdb_host, influxdb_port, influxdb_database, influxdb_user, influxdb_user_pass,
            influxdb_retention, influxdb_shard, geo_measurement, log_measurement, send_nginx_logs, geoip_db_path, inode) # NOQA

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        exit(0)
```

`requirements.txt`文件内容如下：

```
geoip2==3.0.0
geohash2==1.1
influxdb==5.3.0
IPy==1.0
```

> 以上来自：https://github.com/GilbN/geoip2influx/blob/master/geoip2influx.py

运行脚本：

```bash
pip install -r requirements.txt
python3 geoip2influx.py
```

### 检查生成的influxDB数据

```bash
# 打开influxdb的客户端cli工具
root@localhost:/usr/local/nginx/conf\# influx
Connected to http://localhost:8086 version 1.8.10
InfluxDB shell version: 1.8.10
> show databases
name: databases
name
----
_internal
telegraf
geoip2influx
> use geoip2influx
Using database geoip2influx
> show measurements
name: measurements
name
----
geoip2influx
nginx_access_logs
> select * from geoip2influx
name: geoip2influx
time                city          count country_code country_name         geohash      host           ip              latitude longitude postal_code state                        state_code
----                ----          ----- ------------ ------------         -------      ----           --              -------- --------- ----------- -----                        ----------
1650704346070671041 Central       1     HK           Hong Kong            wecnv9ct6479 KeyFlawless-VM 103.149.249.71  22.2908  114.1501  -           Central and Western District HCW
1650704349127071114 Central       1     HK           Hong Kong            wecnv9ct6479 KeyFlawless-VM 103.149.249.71  22.2908  114.1501  -           Central and Western District HCW
1650704349136628924 Central       1     HK           Hong Kong            wecnv9ct6479 KeyFlawless-VM 103.149.249.71  22.2908  114.1501  -           Central and Western District HCW
1650704350147606699 Central       1     HK           Hong Kong            wecnv9ct6479 KeyFlawless-VM 103.149.249.71  22.2908  114.1501  -           Central and Western District HCW
```

## Grafana中添加influxDB数据源

简单两步骤：

![image-20220424121739974](https://cdn.agou-ops.cn/others/image-20220424121739974.png)

添加模板：

![image-20220424121822160](https://cdn.agou-ops.cn/others/image-20220424121822160.png)

## 最终结果

![image-20220424105850934](https://cdn.agou-ops.cn/others/image-20220424105850934.png)

Done.

## 参考链接

- https://github.com/GilbN/geoip2influx
- https://github.com/leev/ngx_http_geoip2_module
- https://github.com/maxmind/libmaxminddb
