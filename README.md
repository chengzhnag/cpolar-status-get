# cpolar-status-get
用于cpolar内网穿透后定时获取状态通过邮件发送自己

### 树莓派公网ssh远程访问家中树莓派  
https://zhuanlan.zhihu.com/p/386691793

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

    strategy:
      matrix:
        # 指定nodejs版本
        node-version: [12.7.0]
        # See supported Node.js release schedule at https://nodejs.org/en/about/releases/

    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js ${{ matrix.node-version }}
      # 安装nodejs环境
      uses: actions/setup-node@v2
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
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
