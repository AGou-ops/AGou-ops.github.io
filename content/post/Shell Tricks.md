---
title: "Shell Tricks"
date: 2021-11-08T11:25:31+08:00
lastmod: 2021-11-08T11:25:31+08:00
draft: false
description: ""
tags: ["Shell", "tricks"]
categories: ["tricks", "持续更新"]
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

<img src="#" style="zoom:65%;" />

**:triangular_flag_on_post:该文章将持续更新。**

分享和记录个人日常和工作中，学习和实际用到的shell片段以及一些小技巧。

<!--more-->

## shell 前两行

- `#!/usr/bin/env bash`和`#!/bin/bash`区别

```bash
前者无需在意所运行的解释器在何处(bash), 只要存在于你的`$PATH`环境变量中即可, 根据你的环境寻找并运行默认的版本，具有灵活性.
```

Shell `set`常用参数：

- `-x`: 用于调试(debug)；
- `-u`: 如果遇到不存在的变量，Bash 默认忽略它。 使用`-u`选项来避免这种情况。 即遇到未定义的变量。 则异常退出脚本. **等价于`set -o nounset`命令；** 

- `-e`: 脚本只要发生错误，就终止执行。 `set -e`有一个例外情况，就是*不适用于管道命令*。**等价于`set -o errexit`命令；**
- `-o pipefail`：用于解决`-e`选项无法处理管道命令错误的问题，只要一个子命令失败，整个管道命令就失败，脚本就会终止执行。

> **使用场景：**
>
> 一般shell脚本将以下内容放置到前几行：
>
> ```bash
> set -euxo pipefail
> set -o errexit
> ```

## :star:杂项（命令小技巧）

### 命令相关

- `command -v <COMMAND>`: 用于验证某个命令是否存在。 不存在则返回一个非零值，存在则会返回该命令的绝对路径。

> **使用场景:** 
>
> shell脚本中判断一个命令是否存在且可执行。 可以使用以下命令：
>
> ```bash
> if [ -x "$(command -v systemctl)" ];then ...
> ```

- `exec > SOMEFILE`: 将脚本输出内容全部输出到指定文件中(除非单独指定)

> **使用场景:**
>
> ```shell
> # 查找某目录中的占用空间最大的几个文件
> du -S /home/suofeiya/mycharts/ | sort -rn | sed '{11,$D};=' | sed 'N; s/\n/ /' | awk 'BEGIN {print "序号\t大小(k)\t文件夹"}{printf $1 ":" "\t" $2 "\t" $3 "\n"}'
> # 将输出存到指定文件
> exec > result.txt
> ```
>

* `exec`: exec 是 bash 的内置命令, 不启用新的shell进程。就像`source`或者`.`一样, 相反使用`bash`或者`sh`执行命令时, 会另起一个子shell, 子shell会继承父shell的环境变量, 子shell执行完毕之后不影响父shell.
* `trap`: 捕获信号, 通常用途是在shell脚本被中断时完成清理工作

> | 信号名称 | 信号数 | 描述                                                         |
> | :------- | :----: | :----------------------------------------------------------- |
> | SIGINT   |   2    | 程序终止(interrupt)信号, 在用户键入INTR字符(通常是Ctrl+C)时发出。 |
> | SIGQUIT  |   3    | 和SIGINT类似, 但由QUIT字符(通常是Ctrl /)来控制. 进程在因收到SIGQUIT退出时会产生core文件, 在这个意义上类似于一个程序错误信号。 |
> | SIGFPE   |   8    | 在发生致命的算术运算错误时发出. 不仅包括浮点运算错误, 还包括溢出及除数为0等其它所有的算术的错误。 |
> | SIGKILL  |   9    | 用来立即结束程序的运行. 本信号不能被阻塞, 处理和忽略。       |
> | SIGALRM  |   14   | 时钟定时信号, 计算的是实际的时间或时钟时间. alarm函数使用该信号。 SIGTERM |
>
> **使用场景:**
>
> - 脚本退出前执行命令
>
> 脚本在执行时按下`CTRL+c`时，将显示"program exit..."并退出(`CTRL+c`的信号是SIGINT)
>
> ```shell
> trap "echo 'program exit...'; exit 2" SIGINT
> ```
>
> - 忽略信号
>
> 例：脚本运行时忽略 `SIGINT` `SIGQUIT` `SIGFPE`等信号
>
> ```shell
> trap '' 2 3 8
> ```

- `IFS`：换行符

> **使用场景：**
>
> 修改默认的空格换行符，多用于读取文件内容：
>
> ```bash
> IFS_old=$IFS      # 将原IFS值保存，以便用完后恢复
> IFS=$'\n'					# 指定回车为分隔符
> for LINE in $(cat test.file)
> do
>         echo ${LINE}
> done
> # 读取文件，或
> cat test.file | while read line;do echo "${line}";done
> # 读取文件，再或
> while read line
> do 
>     echo "${line}"
> done < test.file
> 
> IFS=$IFS_old 			# 恢复原IFS值
> ```

### 文件相关

- `/etc/os-release`：查看系统名称、版本、基于版本、版本代号、帮助信息、系统官方主页等；

> **使用场景：**
>
> 对不同的系统使用不同的命令进行处理：
>
> ```bash
> # 检查·sysctl·命令是否存在且可执行，如果不存在则进行下载安装。
> if ! [ -x "$(command -v sysctl)" ]; then
>    echo 'sysctl not installed. Installing it...'
>    distro=$(awk -F= '/^ID=/{print $2}' /etc/os-release | tr -d '"')
>    case $distro in
>      ol | centos)
>        yum install -y procps
>        rm -rf /var/cache/yum;;
>      ubuntu | debian)
>        apt-get update -qq && apt-get install -y --no-install-recommends procps
>        rm -rf /var/lib/apt/lists /var/cache/apt/archives;;
>    esac
>  fi
> ```
>

## 命令成功与否判断

```bash
command && echo "succ" || echo "fail"

command || { echo "command failed"; exit 1; }

if ! command； then echo "command failed"； exit 1； fi

command
if [ "$?" -ne 0 ]； then echo "command failed"； exit 1； fi
```

## 变量/字符串操作大全

### 变量截取

| 变量配置方式                                         | 说明                                                         |
| :--------------------------------------------------- | :----------------------------------------------------------- |
| ${变量#关键词} ${变量##关键词}                       | 若变量内容从头开始的数据符合『关键词』，则将符合的最短数据删除 若变量内容从头开始的数据符合『关键词』，则将符合的最长数据删除 |
| ${变量%关键词} ${变量%%关键词}                       | 若变量内容从尾向前的数据符合『关键词』，则将符合的最短数据删除 若变量内容从尾向前的数据符合『关键词』，则将符合的最长数据删除 |
| ${变量/旧字符串/新字符串} ${变量//旧字符串/新字符串} | 若变量内容符合『旧字符串』则『第一个旧字符串会被新字符串取代』 若变量内容符合『旧字符串』则『全部的旧字符串会被新字符串取代』 |

### 变量默认值

| 变量配置方式     | str 没有配置       | str 为空字符串     | str 已配置非为空字符串 |
| :--------------- | :----------------- | :----------------- | :--------------------- |
| var=${str-expr}  | var=expr           | var=               | var=$str               |
| var=${str:-expr} | var=expr           | var=expr           | var=$str               |
| var=${str+expr}  | var=               | var=expr           | var=expr               |
| var=${str:+expr} | var=               | var=               | var=expr               |
| var=${str=expr}  | str=expr var=expr  | str 不变 var=      | str 不变 var=$str      |
| var=${str:=expr} | str=expr var=expr  | str=expr var=expr  | str 不变 var=$str      |
| var=${str?expr}  | expr 输出至 stderr | var=               | var=$str               |
| var=${str:?expr} | expr 输出至 stderr | expr 输出至 stderr | var=$str               |

### 字符串是否包含子串

```bash
# 通过 ** 匹配
if [[ "${var}" == *"${sub_string}"* ]]; then
    printf '%s\n' "sub_string is in var."
fi

# 通过 bash 内置的 =~ 判断
if [[ "${sub_string}" =~ "${var}" ]]; then
    printf '%s\n' "sub_string is in var."
fi
```

## shell参数处理

```bash
$#	传递到脚本的参数个数
$*	以一个单字符串显示所有向脚本传递的参数。 如"$*"用「"」括起来的情况、以"$1 $2 … $n"的形式输出所有参数。
$$	脚本运行的当前进程ID号
$!	后台运行的最后一个进程的ID号
$@	与$*相同，但是使用时加引号，并在引号中返回每个参数。 如"$@"用「"」括起来的情况、以"$1" "$2" … "$n" 的形式输出所有参数。
$-	显示Shell使用的当前选项，与set命令功能相同。
$?	显示最后命令的退出状态。0表示没有错误，其他任何值表明有错误。
```

## 打印多行信息（多用于jio本帮助信息）

```bash
cat >&1 <<-EOF		# 或者直接使用cat << EOF
	first line
	second line
	third line
EOF
# 或
cat << EOF
111
222
EOF
# 或
echo "11
22
"
# 或（来源于StackOverflow）
__usage="
Usage: $(basename $0) [OPTIONS]

Options:
  -l, --level <n>              Something something something level
  -n, --nnnnn <levels>         Something something something n
  -h, --help                   Something something something help
  -v, --version                Something something something version
"
Then I can simply use it as

echo "$__usage"
```

## 传递数组到函数

```bash
function update() {
    declare -a apps_version=("${!1}")
    echo "${apps_version[@]}"
}

APPS_VERSION=("aaa" "bbb" "ccc")
update APPS_VERSION[@]
```

##  获取选项select case

```bash
PS3="enter option: "		# 使用select时的提示符
select option in "option1" "option2" "option3" "option4" "exit"
do
	case $option in
	"exit")
	break;;
	"option1")
	break;;
	...
	*)
	...
	esca
done
```

## 查看进程占用的文件句柄

```bash
# 用户级
find /proc/*/fd/* -type l -lname 'anon_inode:inotify' -print 2>/dev/null | cut -d/ -f3 |xargs -I '{}' -- ps --no-headers -o '%U' -p '{}' | sort | uniq -c | sort -nr	# 结果: 第一列表示打开的句柄，第二列表示用户
      
# 进程级
find /proc/*/fd/* -type l -lname 'anon_inode:inotify' -print 2>/dev/null | cut -d/ -f3 |xargs -I '{}' -- ps --no-headers -o '%U %p %c' -p '{}' | sort | uniq -c | sort -nr		# 结果: 第一列表示打开的句柄，第二列表示用户，第三列表示用户id，第四列表示进程
```

## 修改crontab内容

```bash
(crontab -l 2>/dev/null; echo '*/2 * * * * <SOME_COMMAND or SOME_SCRIPT> > <SOME_OUTPUT_FILE>.$(date "+\%Y\%m\%d-\%H\%M\%S") 2>&1') | crontab -
```

## 加载kv配置型文件

```bash
cat xx
key1=value1
key2=value2

cat xx.sh
. xx # 这里直接使用. xx即可把xx文件里的key-value引入,后续可直接使用k.
echo $key1, $key2

#注意, 配置文件只能是k=v的形式(多个k=v可以在一行, 使用空格隔开), 其它形式会报错
```

## 循环打印带空格的字符串/数组

```bash
# 需求, 提供个数组，循环数组中的元素， 如果元素存在于某个文件中，则不追加，如果不存在,则追加
K8S_CLUSTER=("172.1.52.250 k8s-master-250" "172.1.52.50 k8s-master-50")
for x in "${K8S_CLUSTER[@]}"; do grep "$x" /etc/hosts > /dev/null || echo "$x" >> /etc/hosts;done
```

## Shell getopts Demo（Shell 参数）

```shell
#!/bin/bash
status=off                 # 定义变量status，初始值设置为off
filename=""              # 定义变量filename，用于保存选项参数（文件）
output=""                 # 定义变量output，用于保存选项参数（目录）
Usage () {                  # 定义函数Usage，输出脚本使用方法
    echo "Usage"
    echo "myscript [-h] [-v] [-f <filename>] [-o <filename>]"
    exit -1
}

while getopts :hvf:o: varname   # 告诉getopts此脚本有-h、-v、-f、-o四个选项，-f和-o后面需要跟参数（没有选项时，getopts会设置一个退出状态FALSE，退出循环）
do
   case $varname in
    h)
      echo "$varname"
      Usage
      exit
      ;;
    v)
      echo "$varname"
      status=on
      echo "$status"
      exit
      ;;
    f)
      echo "$varname"
      echo "$OPTARG"
      filename=$OPTARG                    # 将选项的参数赋值给filename
      if [ ! -f $filename ];then               # 判断选项所跟的参数是否存在且是文件
         echo "the source file $filename not exist!"
         exit
      fi
      ;;
    o)
      echo "$varname"
      echo "$OPTARG"
      output=$OPTARG                      # 将选项参数赋值给output
      if [ ! -d  $output ];then               # 判断选项参数是否存在且是目录
         echo "the output path $output not exist"
         exit
      fi
      ;;
    # 当选项后面没有参数时，varname的值被设置为（：），OPTARG的值被设置为选项本身
    :)                                               
      echo "$varname"
      echo "the option -$OPTARG require an arguement"        # 提示用户此选项后面需要一个参数
      exit 1
      ;;
    ?)                            # 当选项不匹配时，varname的值被设置为（？），OPTARG的值被设置为选项本身
      echo "$varname"
      echo "Invaild option: -$OPTARG"           # 提示用户此选项无效
      Usage
      exit 2
      ;;
    esac
done
```

## 参考链接

大部分都来源于网络，都亲测使用过没啥问题，由于涉及内容太杂太多了，就不一一标注了。
