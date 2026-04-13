# cpolar-status-get
用于cpolar内网穿透后定时获取状态通过邮件发送自己

---
**📅 更新日志：2026年4月13日 - 最新可用版本**
> 本仓库代码已更新至 **2026年最新维护版**，Puppeteer 兼容性问题及邮件样式渲染 Bug。以下为最新运行效果截图：

**✅ Github Actions 执行日志**
![最新运行效果截图1](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.8vni7al6ky.webp)


**📮 邮箱接收效果 (手机端)**  

<img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/Screenshot_2026-04-13-13-51-53-206_com.tencent.mm.77e5a3zl1p.webp" style="width: 300px;" />

---

### 💡 项目背景
在使用 [cpolar](https://www.cpolar.com/) 实现树莓派或本地服务器的内网穿透时，免费版的隧道地址（URL）和端口通常会在 **24小时内** 发生变化。

每次远程访问前都需要登录官网查看最新的地址非常繁琐。本项目利用 **GitHub Actions** 的定时能力，每天自动抓取你的 cpolar 账户隧道状态，并通过邮件发送给你，让你随时掌握公网入口。

### ⚙️ 核心逻辑解析

本项目通过以下步骤实现自动化：

1.  **状态获取**：使用 Puppeteer 无头浏览器自动登录 cpolar 官网，抓取当前账户的在线隧道列表。
2.  **页面生成**：将抓取到的 JSON 数据渲染生成漂亮的 `index.html` 报表。
3.  **邮件发送**：读取生成的 HTML 文件，将其作为邮件正文发送至指定邮箱。

### 树莓派公网ssh远程访问家中树莓派
https://cpolar.com/docs#linux-system-installation-cpolar

> 通过上面教程可以实现树莓派公网ssh远程访问，教程中使用的是[cpolar](https://www.cpolar.com/)实现内网穿透，ssh访问的端口经常会改变，需要登陆进去查看状态。
所以通过Github Actions能力实现每天定时发送邮件告知自己cpolar的状态。

大体步骤如下：
1. 通过puppeteer实现获取cpolar状态  

2. 将获取的状态生成index.html

3. 把index.html当作内容发送邮件

4. 配置本仓库Secrets  
需要配置4个[Secrets](https://docs.github.com/cn/codespaces/managing-codespaces-for-your-organization/managing-encrypted-secrets-for-your-repository-and-organization-for-codespaces#adding-secrets-for-a-repository)  
```
CPOLAR_EMAIL // cpolar登录邮箱  
CPOLAR_PASSWORD // cpolar登录密码  
MAIL_USERNAME // 邮箱登录账号
MAIL_PASSWORD // 邮箱开启smtp密钥
```

### 解读Github Actions配置
```
name: Node.js CI

on:
  push:
  # 定时器 可以指定时间触发工作流
  # https://crontab.guru/examples.html 有一些例子可供参考
  schedule: 
    - cron: '0 9 * * *'

jobs:
  build:

    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v2

    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '20'

    - name: npm install
      # 安装依赖包
      run: npm install
    
    - name: Get Status
      # 执行根目录index.js文件生成index.html
      run: npm start
      env:
          CPOLAR_EMAIL: ${{ secrets.CPOLAR_EMAIL }}
          CPOLAR_PASSWORD: ${{ secrets.CPOLAR_PASSWORD }}

    - name: Send mail ✉️
      uses: dawidd6/action-send-mail@v2
      with:
        # smtp 服务器地址
        server_address: smtp.163.com
        # smtp 服务器端口
        server_port: 465
        username: ${{secrets.MAIL_USERNAME}}
        password: ${{secrets.MAIL_PASSWORD}}
        subject: cpolar今日状态
        body: file://index.html
        to: 1772591173@qq.com
        from: GitHub Actions
        content_type: text/html
        convert_markdown: true
```
发送邮件的用法可见 [dawidd6/action-send-mail](https://github.com/dawidd6/action-send-mail)

注： 开启 163 邮箱的 POP3/SMTP 服务，原来的密码处应填写为授权码。

### 如何使用  
star、fork本仓库，修改Actions配置，添加Secrets。
