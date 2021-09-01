---
title: "Vim Hotkeys and Cheat Sheet"
date: 2020-12-06T11:53:04+08:00
lastmod: 2021-08-25T15:17:04+08:00
draft: false
description: ""
tags: ["vim", "tricks"]
categories: ["vim","技巧"]
keywords: []

author: "AGou-ops"

# weight:
# menu: "main"
# comment: true
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

> 该文章用于记录个人在使用`vim`期间常用的技巧和快捷键。
>
> - 2021-08-20 15:27:56：初始化；
> - 2021年08月20日15:27:18 ： 更新vim分屏快捷键以及`NERDTree`快捷键；

## 通用技巧

- 普通模式快捷键/操作符(直接使用, 无需使用`:`)

<!--more-->

```bash
# :h operator 来查阅完整的列表
>G	下一行到末行缩进, 使用`>+ENTER`能达到相同效果
>>	仅缩进当前行
.	重复执行上一次命令
A	在当前行尾插入内容，相当于`$a`
J	将当前行与下一行连接到一起
f/t(F/T)	向后向前查找字符, 使用`;`进行下一个查找, 使用`,`进行反向查找
s	删除当前字符并进入插入模式
o	添加新行并进入插入模式
*	高亮文本中所有与光标处相同的单词, 使用`n\N`进行下一个
db	反向删除多个字符直至空格或者开头
dw	分多钟情况: 
	1. 当光标位于单词开头时, 删除整个单词, 直至遇到任意符号或者空格字符
	2. 当光标处于单词非开头结尾时, 删除多个字符, 直至遇到任意符号或者空格字符
	3. 当光标位于非单词末尾字母时, 反向删除一个字符
d2w	删除连续两个单词, 使用`2dw`或者`dw.`或者`c2w`能达到相同效果
cw	删除光标直到单词末尾, 并进入`插入`模式	
C	删除光标直到行尾
daw	`delete a word` 删除整个单词, 无论光标处于何处, 并删除单词之前的空格(如果有的话)
dap	删除整个段落, 行前行后都有空格的那种才叫段落
b/B	反向定位到下一个单词开头或者单词结尾(如果单词后面非换行的符号的话)
# 复制与粘贴
yyp	复制整行到下一行
yap	复制整段内容到寄存器
gp	粘贴整段内容到光标之后, 并将光标移动到所粘贴内容下方, 这一点与直接使用`p`光标位置不变所不同
yiw	复制当前单词到无名寄存器
"0p	复制专用寄存器`0`
"ayiw	复制当前单词到名为`a`的寄存器
"ap		粘贴寄存器名为`a`的内容
"_dd	寄存器
"+p	将外部剪切板内容粘贴到光标之后, 或者在插入模式下使用快捷键`<C-r>+`
dl	删除一个字符, 等同于`x`

gU	将字符全部转换为大写, 相对的, `gu`将字符转换为小写, `g~`用于翻转大小写, 可视化选择中可用, 常用组合`gUaw`
gv	重选上次高亮区域
# 光标移动操作
<C-e>	向下翻页
<C-y>	向上翻页
<ESC-.>	新增空行
0/^		移动到实际行首/移动到非空白字符行首
$/g$	移动到实际行尾/移动到屏幕行尾
w/e		正向移动到单词开头/结尾
b/ge	反向移动到当前单词或者上一个单词开头/结尾

mm/`m	标记光标当前位置以及跳转到标记位置
``		来回跳转上次标记位置
`.		上次修改的位置
`^		上次插入的位置
`<		上次高亮选区的起始位置
`>		上次高亮选取的末尾位置

%		在成对符号间进行跳转
<LINE_NUMBER>G		跳转到指定行
(/)		跳转到上一句/下一句开头
{/}		跳转到上一段/下一段的开头
:changes	查看修改

<C-p>或者<C-n>	触发自动补全
<C-x><C-k>		触发字典自动补全, 前提是开启拼写检查`:set spell`
<C-x><C-l>		触发行模式自动补全, 注意: 只适用于整行补全
<C-x><C-p>		触发单词自动补全
<C-x><C-f>		触发文件名自动补全, linux/Mac下`/home/agou-ops/<C-x><C-f>`, windows下`x:\<C-x><C-f>`
<C-x><C-o>		根据上下文进行自动补全, 多用于编程语言
<C-x>s		在插入模式下使用自动补全功能, 作用和普通模式下的`<C-x><C-k>`相同
```

- 插入模式下

```bash
<C-h>	删除, 相当于delete键
<C-w>	删除前一个单词
<C-u>	删除字符直到行首
<C--o>	插入-普通模式是普通模式的一个特例，它能让我们执行一次普通模式命令
<C-r>=`<算数式子>`	快速计算, 也可以用于赋值, 比如`let i=0`中定义了变量`i`值为`0`, 使用`<C-r>=i`即可将变量i的内容插入到当前光标处
```

- c

```bash
示例文本: 
'<a href="{url}">{title}</a>'
语句				结果
ci" #<Esc>		'<a href="#">{title}</a>'
citclick here<Esc>		'<a href="#">click here</a>'
# ci命令可以理解为修改双引号内容, cit可以理解为修改标签里面的内容
同理使用`yit`或者`dit`可以快速拷贝或者删除标签里面的内容
caw		删除整个单词
```

- 可视化模式下

```bash
o/O	快速跳转到可视化区域的首段和末端
e/b	下一个/上一个单词开头末尾
U/u	将所选区域字母转换为大写或者小写
r<字符>	将所选区域的内容全部替换为<字符>内容
<S-i>	列插入
$	列选择, 选择结尾, 使用场景: 为选中区域的行尾添加指定符号
```

- `Ex` 命令

```bash
:copy	复制当前行, 同义命令`:co`或者`:t`
:reg "0	查看寄存器内容
:3t.	将第三行内容复制到当前行
:t3		把当前行复制到第三行
:t.		复制当前行, 相当于`yyp`
:'<,'>t0	把高亮选中区域复制到文件开头
:m		移动当前行, 使用方法和`:copy`相关用法一致

:'<,'>normal A;		在可视化模式下批量使用普通模式命令, 即在每行末尾添加一个分号
:'<,'>normal i//	在可视化行选择模式下, 批量为每行开头添加注释符

:w | !echo hello	执行多条命令

@:		重复上次ex命令
q:		调出历史命令窗口
q/		打开查找历史命令窗口

:shell	进入shell
:r	!ls		将shell中的内容读入到文件, 或者从将外部文件内容读入到当前文件
:2,$!sort -t',' -k2		将第二列内容按照字母顺序进行重排序
```

- 多文件编辑

```bash
:ls		查看当前缓冲区, 输入数字进入指定
:bn/bp		进入下一个/上一个缓冲区, 分别为`bnext`和`bprevious`简写
:buffer <FILE_NAME>		根据文件名跳转到指定缓冲区, 使用`TAB`键可以补全
:bufdo		在所有缓冲区执行Ex命令
:bdelete <FILE_NAME1> <FILE_NAME2>		删除指定缓冲区

:e!		摒弃当前缓冲区修改, 强制从文件中重新读取文件内容, 通`:edit!`, 用于`回滚操作`
:qall!		摒弃所有缓冲区修改, 强制退出
:wall		保存所有缓存区修改

:sp[lit] {file}		同`<C-w>s`, 水平切分当前窗口，并在新窗口中载入{file}
:vsp[lit] {file}	同`<C-w>v`, 垂直切分当前窗口，并在新窗口中载入{file}
<C-w><`上下左右`方向键或者`HJKL`键或者`w`键>		切换当前窗口, `w`为循环切换
<C-w>H、J、K、L		左上右下移动当前窗口位置
:clo[se]		同`<C-w>c`, 关闭活动窗口
:on[ly]			同`<C-w>o`, 只保留活动窗口, 关闭其他所有窗口
# 窗口大小调整
<C-w>=		使所有窗口等宽、等高
<C-w>_		最大化活动窗口的高度
<C-w>｜		最大化活动窗口的宽度
<C-w>>		窗口右移
<C-w>>		窗口左移
<C-w>H		将当前窗口移到最左边
<C-w>J		将当前窗口移到最上面
<C-w>K		将当前窗口移到最下面
<C-w>L		将当前窗口移到最右边
[N]<C-w>_		把活动窗口的高度设为[N]行
[N]<C-w>｜		把活动窗口的宽度设为[N]列
<C-w>T		把当前窗口移动到一个新的标签
# 标签
:lcd <LOCAL_PATH>		进入本地指定目录, 仅对当前窗口有用, 如果一个标签中有多个窗口, 想要对所有窗口生效需要使用Ex命令`:windo lcd {path}`
:tabedit {filename}		创建一个新的标签页
:tabc[lose]			关闭当前标签以及标签下属的所有窗口
:tabo[nly]			关闭其他所有标签, 保留当前活动标签
# 标签切换
:tabn[ext] {N}		同`{N}gt`, 切换到编号为 {N} 的标签页
:tabn[ext]			同`gt`, 切换到下一个标签
:tabp[revious]		同`gT`, 切换到上一个标签
:tabmove <NUMBER>		将当前标签移动到指定位置, 开头的序号为`0`

:find <FILENAME>		在`path`中查找文件并打开
:set path+=app/*		**通配符会匹配 app/ 目录下的所有子目录
:e.			打开文件管理器，并显示当前工作目录
<C-^> 		调出文件管理器, 发现只是打开玩玩? 使用该快捷键可以返回文件编辑
:E			打开文件管理器，并显示活动缓冲区所在的目录

<C-g>		显示当前文件状态
:!mkdir -p %:h		如果一个新创建的文件所属的文件夹不存在, 则可以使用该命令进行创建, 然后使用 `:w`进行保存
:w !sudo tee % > /dev/null		提权保存文件

:args *.html	创建文件列表, 不带任何参数则显示列表内容`:args`
:first、:last、:prev、:next	浏览文件列表
:argdo	normal dd	在文件列表中同时执行普通模式的命令
```

- 宏

```bash
qa	开始宏录制, 并记录到`a`寄存器
<ESC>q	结束宏录制
:reg a	查看`a`寄存器宏录制内容
:let @a=''	清除`a`宏记录
@@	重复调用最近使用过的宏
@a	执行名为`a`的宏
100@a	执行`a`宏100次
# 并行执行宏, 方法之一就是使用块选择完成之后执行宏命令
:'<,'>normal @a
:argdo normal @a	在文件列表中并行执行`a`宏
# 编辑, 附加宏内容
:put a	将宏内容粘贴到光标处, 修改完毕之后, 使用一下命令将修改后的内容重新传入到宏中去
:d a
qA	附加宏, 将内容附加到`a`宏中, 用于更正宏而无需重新录制
# 手动写宏
:let @a=substitute(@a, '\~', 'vU', 'g')
```

- vim 简单jio本示例

```bash
给出示例文本内容如下所示:
Normal mode  |  15
Insert mode  |  31
Visual mode  |  44
Visual mode  |  44
Chapter      |  Page
Normal mode  |  15
Insert mode  |  31
Visual mode  |  44
想要结果为:
1) Normal mode  |  15
2) Insert mode  |  31
...
录制宏如下步骤:
:let i=1
qq
0i<C-r>=i) <ESC>
let i+=1
j
q
使用块选择并行执行宏, `<C-v>7j@q`
```

- 查找与替换相关

```bash
# 使用very magic正则模式查找
/\v#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})
/\V<搜索含有特殊字符的字符串>
/\v<the>	精确匹配`the`字符串
:v/agou/d	只保留匹配行
:g/<agou>	将搜索到的内容罗列出来, 如若加上`/d`则表示将匹配结果全部删除掉
:g/agou/yank A	将所匹配行复制到`A`寄存器以供复制使用, 使用`ap`命令进行黏贴`a`寄存器内容
/agou/e		查找`agou`字符串, 并将光标移动到行尾
:%s/<agou>//gn	统计字符串`agou`出现的次数
:%s/<agou>/agou-ops/gc	将`agou`字符串替换为`agou-ops`字符串, 并且每一次替换操作需要手动确认
:vimgrep /<agou>/g %	使用该命令可以达到和上述命令相同的效果, 使用`:cnext`或者`:cprevious`进行遍历列表

:%s//<C-r><C-w>/g		<C-r><C-w>获取当前光标所在单词并插入到Ex语句当中去
:%s//<C-r>0/g		粘贴寄存器里面的内容

:set spell	开启拼写检查, 在普通模式下使用`[s`或者`]s`快速向前或者向后跳转
	z=	为当前单词提供更正建议, 输入数字进行确认;
	zg	将当前单词加入拼写文件当中去, (取消当前单词"错误"红色波浪线显示)
	zw	从拼写文件中删除该单词
	zug	撤销针对当前单词的`zg`或`zw`命令
```

- 配置相关

```bash
:noh	取消高亮
:set shiftwidth=4 softtabstop=4 expandtab	设置tab宽度
# 将tab转换为四个空格
:set ts=4 expandtab
%retab!
# 文件编码相关
set fileencoding		查看现在文本的编码
:set fenc=编码		转换当前文本的编码为指定的编码
:set enc=编码		以指定的编码显示文本，但不保存到文件中。这里的“编码”常见为gbk utf-8 big5 cp936
:set ff?		查看当前文本的模式类型，一般为dos,unix
:set ff=dos		设置为dos模式, 也可以用一下方式转换为unix模式
:%s/^M//g		等同于:set ff=unix

:set ignorecase		设置vim查找不区分大小写, `:set ignorecase?`获取当前状态
:set smartcase		设置智能大小写
:set hlsearch		设置搜索高亮, 简写为`:set hls`
:set nohlsearch		简写为`:set nohls`
:set incsearch		查找, 光标不跳转
```

## 不常用小技巧

- 快速加减

```bash
<C-a> 和 <C-x> 命令分别对数字执行加和减操作
使用方法: 将光标移动到数字字符上, 按下所要加或者减的数字, 按下<C-a>或者<C-x>即可进行快速加减

需要注意的一点是, 加或者减无法使用小数点, 因为小数点有特殊用途

另, 需要注意的一点是: 
如果数字是以`007`这样以`0`开头的话, vim会自动将其识别为八进制数, 加减时也会按照八进制进行运算, 要禁止该行为, 将一切数字视为十进制数字的话, 需要设置以下参数:
set nrformats=
```

## 小技巧

- 快速缩进指定

`Ctrl+v`开启任意选择, 使用上下键选中多行行首, 然后按下`shift+i`键进入插入模式, 连续输入四个空格之后(此时并不会缩进所有, 只会缩进第一行内容), 然后按下`ESC`键就可以啦. 

- 重排字段

```bash
# 给出示例文本内容如下所示:
last name,first name,email
neil,drew,drew@vimcasts.org
doe,john,john@example.com
# 目标是: 将邮箱放置于最前方, 然后是first name, 最后是last name
/\v^([^,]*),([^,]*),([^,]*)$
:%s//\3,\2,\1
```

## 附录：NERDTree 快捷键

{{< gist "https://gist.github.com/geekontheway/2667442.js" >}}

<script src="https://gist.github.com/geekontheway/2667442.js"></script>

## 参考链接

- Vim实用技巧(第2版): https://agou-images.oss-cn-qingdao.aliyuncs.com/pdfs/Vim%E5%AE%9E%E7%94%A8%E6%8A%80%E5%B7%A7%EF%BC%88%E7%AC%AC2%E7%89%88%EF%BC%89.pdf
- Vim cheatsheet: https://devhints.io/vim
- Vim Cheat Sheet: https://vim.rtorr.com/

