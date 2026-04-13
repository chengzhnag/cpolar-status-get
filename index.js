const puppeteer = require('puppeteer');
const fs = require("fs");

const emailSelector = '#captcha-form > fieldset > div:nth-child(1) > div > div > input';
const statusSelector = '#get-started > div.row-fluid.get-started > div.left-nav.span3 > ul:nth-child(2) > li:nth-child(1) > a';

const isDebugger = false;

const start = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({ headless: !isDebugger });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto('https://dashboard.cpolar.com/login');
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
})
