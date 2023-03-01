---
title: "Windows服务检测与重启（Golang）"
date: 2022-04-06T11:29:42+08:00
lastmod: 2022-04-06T11:29:42+08:00
draft: false
description: "Golang 实现检测Windows服务存活性以及就绪性，当失败时尝试重启该服务。"
tags: ["Windows", "Service", "Golang"]
categories: ["Windows", "Golang"]
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


## 检测和处理逻辑

![image-20220406085729985](https://cdn.agou-ops.cn/others/image-20220406085729985.png)

<!--more-->

## 代码编写与交叉编译

代码内容如下（~~Golang学习过程中写的，比较水，随便看看就得了，:joy:~~ ）：

```go
package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"

	colorable "github.com/mattn/go-colorable"
	"github.com/sirupsen/logrus"
)

var (
	ch          = make(chan int)
	IDocViewUrl = "https://view.xbongbong.com/"
	// 探活时间间隔
	interval = time.Second * 30
	Sum      int
	pidSlice = []int{}
	ticker   = time.NewTicker(interval)
)

func init() {
	logrus.SetFormatter(&logrus.TextFormatter{ForceColors: true})
	logrus.SetOutput(colorable.NewColorableStdout())
}

func main() {
	// 启动延时。。×
	/* tick := time.Tick(1 * time.Second)
	for countdown := 10; countdown > 0; countdown-- {
		fmt.Printf("\r%2d", countdown)
		<-tick
	} */

	fileWriter, err := os.OpenFile("log.txt", os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0755)
	defer fileWriter.Close()
	if err != nil {
		log.Fatalln("Can't open log.txt...", err)
	}
	logger := log.New(io.Writer(fileWriter), "", log.Lshortfile|log.Ldate|log.LstdFlags)

	// 每60s探测一次
	go func() {
		for t := range ticker.C {
			fmt.Println("Tick at", t)
			// resp, err := http.Get(IDocViewUrl)
			resp, err := http.Get(IDocViewUrl)
			if err != nil {
				log.Println(err)
				log.Println(pidSlice)
				log.Printf("正在进行第【%v/3】次探测。。。\n", len(pidSlice))
				HandleReturnResp(strings.NewReader(""), 0, logger)
				continue
			}
			HandleReturnResp(resp.Body, resp.StatusCode, logger)
		}
		ch <- 1
	}()
	<-ch
}

// HandleReturnResp: 处理body返回内容以及返回响应码
func HandleReturnResp(r io.Reader, respCode int, logger *log.Logger) {

	if len(pidSlice) >= 3 {
		pidSlice = nil
	}
	body, err := ioutil.ReadAll(r)
	if err != nil {
		logger.Println(err)
	}

	respStr := string(body)
	matchStr, _ := regexp.MatchString(".*10.6.1_20200807.*", respStr)
	// 满足正则表达要求，且返回值为200
	if respCode == 0 {

		// *** 存活性探测失败：0
		pidSlice = append(pidSlice, 0)
		GetPorcessPid(logger)

	} else if matchStr && respCode == 200 {

		// *** 通过存活性探测，且通过就绪性探测: 1
		pidSlice = append(pidSlice, 1)

		logger.SetPrefix("【SUCCESS】")
		logger.Println("服务正常，状态码", respCode, "\r\n")
		logrus.Info("服务正常!")
	} else {

		// *** 通过存活性探测，但就绪性探测失败：0
		pidSlice = append(pidSlice, 0)

		GetPorcessPid(logger)
	}
}

// GetPorcessPid: 重启iDocView服务
func GetPorcessPid(logger *log.Logger) {

	cmd := exec.Command("tasklist.exe", "/fo", "csv", "/nh")
	out, err := cmd.Output()
	if err != nil {
		log.Println(err)
	}

	// 使用正则匹配iiDocView运行之后的Java进程
	re := regexp.MustCompile(".*java.*")
	text := strings.Join(re.FindAllString(string(out), -1), ",")
	pid := strings.Split(text, ",")
	// if len(pidSlice) >= 3 {
	// 	pidSlice = nil
	// }
	logger.SetPrefix("【FAILED】 ")
	logger.Printf("探活失败--%v--\r\n", len(pidSlice))

	// 当进程不存在时，会抛出超索引panic，在此使用recover进行捕获
	// 标志0为进程不存在
	defer func() {
		if err := recover(); err != nil {
			// pidSlice = append(pidSlice, 0)
			HandleProcessCondition(pidSlice, "")
		}
	}()
	fmt.Println("the Java process pid is: ", pid[1])
	// 标志1为进程存在
	// pidSlice = append(pidSlice, 1)
	HandleProcessCondition(pidSlice, pid[1])
}

// 当满足条件时杀死该进程，一分钟内探活三次，
// 三次有两次失败则杀死进程，然后尝试重启进程.
func HandleProcessCondition(signal []int, pid string) {
	logrus.Warn(signal)
	if len(signal) == 3 {
		log.Printf("正在进行第【%v/3】次探测。。。\r\n", len(signal))
		Sum = signal[0] + signal[1] + signal[2]
		if Sum >= 2 {
			logrus.Info("iDocView存活")
		} else {
			ticker.Stop()
			// signal = nil
			log.Printf("iDocView挂了，即将进行重启...【%v】\r\n", pid)
			HandleProcess(pid)
			ticker.Reset(interval)
		}
	} else {
		log.Printf("正在进行第【%v/3】次探测。。。\r\n", len(signal))
	}

}

// 没有通过存活检验的pid将会传到这里
// 根据pid，杀死进程，然后重新启动该进程
func HandleProcess(pid string) {
	if pid != "" {
		killCMD := exec.Command("taskkill.exe", "/F", "/im", "java.exe", "/T")
		output, err := killCMD.Output()
		if err != nil {
			log.Println(err)
		}
		logrus.Error("Killing iDocView Process: ", output)
	}
	time.Sleep(time.Second * 1)
	// 重新启动程序，执行启动命令
	log.Println("正在启动服务。。")
	startCMD := exec.Command("cmd.exe", "/C", "start", "D:\\idocv\\start.bat")
	startCMD.Start()

	time.Sleep(time.Second * 2)
	log.Println("启动成功，数秒后将打开测试页面。。。")
	time.Sleep(time.Second * 12)

	openURLCMD := exec.Command("rundll32", "url.dll,FileProtocolHandler", IDocViewUrl)
	openURLCMD.Start()
}

// Log2fileAndStdout: 同时将标准输出到终端和日志文件中.
// 保留，暂不启用
func Log2fileAndS1tdout(f *os.File, logText string) {
	// 设置日志输出到文件
	// 定义多个写入器
	writers := []io.Writer{
		f,
		os.Stdout}
	fileAndStdoutWriter := io.MultiWriter(writers...)
	// 创建新的log对象
	logger := log.New(fileAndStdoutWriter, "", log.Ldate|log.Ltime|log.Lshortfile)
	// 使用新的log对象，写入日志内容
	logger.Println(logText)
}
```

MacOS系统交叉编译成Windows程序：

```bash
$ CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -v -o iDoc_prd_v1.1.exe main.go
```

## Windows 服务

使用[nssm](https://nssm.cc/download)将程序注册成服务，很简单，在此不再赘述，以下仅列出相关命令：

- 新建服务：nssm install <servicename>
- 启动服务：nssm start <servicename>
- 停止服务：nssm stop <servicename>
- 重启服务：nssm restart <servicename>

- 修改服务：nssm edit <servicename>



“高可用”服务，当服务挂掉的时候，自动进行重启操作：

![image-20220406090535863](https://cdn.agou-ops.cn/others/image-20220406090535863.png)

Done.


