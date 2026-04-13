const puppeteer = require('puppeteer');
const fs = require("fs");

const emailSelector = '#captcha-form > fieldset > div:nth-child(1) > div > div > input';
const statusSelector = '#get-started > div.row-fluid.get-started > div.left-nav.span3 > ul:nth-child(2) > li:nth-child(1) > a';

const isDebugger = false;

const start = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({ 
        headless: !isDebugger,
        // 【关键修复】：在 GitHub Actions 中必须添加此参数
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      // 【优化 1】：增加全局超时时间到 60秒，防止网络慢导致失败
      page.setDefaultTimeout(60000);
      // 在 goto 之前，先测试一下能不能访问百度
      try {
        await page.goto('https://www.baidu.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
        console.log('✅ 网络测试通过，正在跳转回 cpolar...');
        await page.goto('https://dashboard.cpolar.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
      } catch (e) {
        console.log('GitHub Actions 环境网络不通，无法访问外部网站');
      }
      await page.goto('https://dashboard.cpolar.com/login', {
        waitUntil: 'domcontentloaded', 
        timeout: 60000
      });
      const newPage = page;
      await newPage.setViewport({ width: 1920, height: 1080 });
      // 等待登录页面#captcha-form存在
      await newPage.waitForSelector('#captcha-form');

      /* 进行登录操作 */
      // 邮箱输入框输入，selector错误的话可以重新获取替换
      await newPage.type(emailSelector, '1772591173@qq.com', { delay: 100 });
      // 密码输入框输入，selector错误的话可以重新获取替换
      await newPage.type('#password', 'just1772591173', { delay: 100 });
      // 点击登录按钮
      await newPage.click('#loginBtn');

      // 等待状态页面#get-started存在 意味着首页加载完成
      await newPage.waitForSelector('#get-started');
      // 点击左边状态一栏
      await newPage.click(statusSelector);

      // 等待状态页面#dashboard存在 意味着状态页加载完成
      await newPage.waitForSelector('#dashboard');

      // 【核心修改】：直接在页面上下文中获取表格的完整 HTML 字符串
      // 我们选择 table，这样能获取到包含表头(thead)和表体(tbody)的完整结构
      const rawTableHtml = await page.evaluate(() => {
        const table = document.querySelector('#dashboard table');
        return table ? table.outerHTML : ''; // 返回整个表格标签及其内容
      });

      await browser.close();
      resolve(rawTableHtml);
    } catch (error) {
      await browser.close();
      reject(error);
    }
  })
}

start().then(tableContent => {
  console.log('🦋🦋🦋🦋', tableContent);
  if (!tableContent) {
    console.log('❌ 未找到表格内容');
    return;
  }

  console.log('✅ 表格 HTML 已获取，正在生成文件...');

  // 构建带有样式的完整 HTML 结构
  // 我们将提取到的 tableContent 直接放入 body 中
  let context = `
<html>
 <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>隧道列表数据</title>
  <style>
    /* 基础重置 */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f4f6f9;
      padding: 20px;
      color: #333;
    }

    h2 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 30px;
    }

    /* 表格容器，增加滚动条以防表格过宽 */
    .table-container {
      max-width: 1200px;
      margin: 0 auto;
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      overflow-x: auto; 
    }

    /* 表格样式 */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 14px;
    }

    /* 表头样式 */
    thead th {
      background-color: #34495e;
      color: #fff;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* 单元格样式 */
    tbody td {
      padding: 12px 15px;
      border-bottom: 1px solid #e1e1e1;
      vertical-align: middle;
    }

    /* 斑马纹效果，增加可读性 */
    tbody tr:nth-of-type(even) {
      background-color: #f9f9f9;
    }

    /* 鼠标悬停效果 */
    tbody tr:hover {
      background-color: #f1f1f1;
      cursor: pointer;
    }
    
    /* 最后一行去掉底部边框 */
    tbody tr:last-of-type td {
      border-bottom: 2px solid #34495e;
    }

    /* 链接样式优化 */
    td a {
      color: #3498db;
      text-decoration: none;
      font-weight: bold;
    }

    td a:hover {
      text-decoration: underline;
      color: #1d6fa5;
    }
  </style>
 </head>
 <body>
    <h2>在线隧道列表监控</h2>
    <div class="table-container">
      <!-- 这里直接插入抓取到的原始表格 HTML -->
      ${tableContent}
    </div>
  </body>
</html>
    `;

  // 写入文件
  fs.writeFileSync("index.html", context, "utf8");
  console.log('🎉 成功！请打开 index.html 查看带样式的表格。');
}).catch(err => {
  console.log('start err catch🐰:', err);
  let errorHtml = `
<html>
 <head>
  <meta charset="utf-8">
  <title>脚本执行错误</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffebee;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .error-card {
      background: #fff;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      max-width: 500px;
      text-align: center;
      border-left: 5px solid #e74c3c;
    }
    .icon { font-size: 50px; margin-bottom: 20px; display: block; }
    h1 { color: #e74c3c; margin: 0 0 10px 0; font-size: 24px; }
    p { color: #555; line-height: 1.6; word-break: break-all; }
    .footer { margin-top: 20px; font-size: 12px; color: #999; }
  </style>
 </head>
 <body>
    <div class="error-card">
      <span class="icon">⚠️</span>
      <h1>脚本执行出错</h1>
      <p><strong>错误详情：</strong></p>
      <p>${err.message}</p>
      <div class="footer">请检查账号密码或网络连接</div>
    </div>
  </body>
</html>`;
  fs.writeFileSync("index.html", errorHtml, "utf8");
  console.log('📄 错误文件已生成');
})
