const puppeteer = require("puppeteer");
const fs = require("fs");

const emailSelector =
  "#captcha-form > fieldset > div:nth-child(1) > div > div > input";

// --- 配置区 ---
const isDebugger = false; // 开启调试模式
const LOGIN_EMAIL = process.env.CPOLAR_EMAIL;
const LOGIN_PASS = process.env.CPOLAR_PASSWORD;

const start = () => {
  return new Promise(async (resolve, reject) => {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: !isDebugger,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: null,
      });

      const page = await browser.newPage();

      // ================== 新增：模拟慢速网络 ==================
      // 这里模拟 "Slow 3G" 网络
      // await page.emulateNetworkConditions({
      //   download: (500 * 1024) / 8, // 下载速度: 500 KB/s (注意单位是 bits/s，所以要除以8)
      //   upload: (500 * 1024) / 8,   // 上传速度: 500 KB/s
      //   latency: 2000,              // 延迟: 2000ms (2秒)
      // });
      // console.log('🐢 已开启慢速网络模拟 (下载: 500KB/s, 延迟: 2000ms)');
      // 增加超时时间，防止网络波动
      await page.setDefaultNavigationTimeout(60000);

      console.log("🚀 正在启动浏览器，测试网络连接...");

      // 尝试访问百度测试网络
      try {
        await page.goto("https://www.baidu.com", {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        console.log("✅ 网络通畅，正在访问 Cpolar...");
      } catch (netErr) {
        console.log("🌐 网络测试较慢，直接尝试访问目标...");
      }

      // 访问登录页
      await page.goto("https://dashboard.cpolar.com/login", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      await page.waitForSelector("#captcha-form", { timeout: 5000 });
      console.log("📝 检测到登录表单，正在输入账号...");

      // 执行登录操作
      await page.type(emailSelector, LOGIN_EMAIL, { delay: 100 });
      await page.type("#password", LOGIN_PASS, { delay: 100 });

      // 点击登录（这里建议用文本点击更稳定，或者确认按钮ID）
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
        page.click("#loginBtn"), // 触发点击并等待跳转
      ]);

      // 导航到状态页面
      console.log("🧭 正在跳转到隧道状态页面...");
      await page.goto("https://dashboard.cpolar.com/status", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      console.log('⏳ 正在提取表格数据');

      // 【核心】提取表格数据
      // 注意：这里我们提取整个 <table> 的 outerHTML，包括 thead 和 tbody
      const rawTableHtml = await page.evaluate(() => {
        const table = document.querySelector("#dashboard table");
        return table ? table.outerHTML : '<p class="not-found">未找到隧道表格</p>';
      });

      await browser.close();
      resolve(rawTableHtml);
    } catch (error) {
      console.error("❌ 主流程错误:", error);
      if (browser) await browser.close();
      reject(error);
    }
  });
};

// --- 邮件生成与渲染 ---
start()
  .then((tableContent) => {
    console.log("✅ 数据抓取成功，正在生成响应式邮件...");

    // 【核心修改】移除 tbody 标签 + 反转义 HTML 实体
    // 1. 先把 &lt; 变回 < (防止邮件客户端把代码当文本显示)
    let cleanTable = tableContent;

    // 1. 反转义 HTML 实体 (把 &lt; 变回 <)
    cleanTable = cleanTable
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');

    // 2. 移除干扰标签 (tbody, thead)
    // 邮件客户端不喜欢这些标签，直接删掉，让 tr 直接位于 table 下
    cleanTable = cleanTable.replace(/<tbody[^>]*>/g, '').replace(/<\/tbody>/g, '');
    cleanTable = cleanTable.replace(/<thead[^>]*>/g, '').replace(/<\/thead>/g, '');

    // 3. 移除原有的 width 和 style 属性
    cleanTable = cleanTable.replace(/width\s*=\s*["'][^"']*["']/gi, '');
    cleanTable = cleanTable.replace(/style\s*=\s*["'][^"']*["']/gi, '');

    // 4. 重新注入内联样式
    cleanTable = cleanTable.replace(/<table/, '<table style="width: 100%; border-collapse: collapse; min-width: 400px;"');
    cleanTable = cleanTable.replace(/<th/g, '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;"');
    cleanTable = cleanTable.replace(/<td/g, '<td style="padding: 10px; border: 1px solid #ddd; color: #333;"');
    cleanTable = cleanTable.replace(/<tr/g, '<tr style="background-color: #ffffff;">');
    cleanTable = cleanTable.replace(/<a/g, '<a style="color: #3498db; text-decoration: none; font-weight: bold;"');

    // 5. 【关键修复】清理标签末尾多余的 ">" 符号
    // 正则解释：查找 ">" 或 ">>"，替换为 ">"
    // 这一步是为了修复你看到的 "<tr>..." 问题
    cleanTable = cleanTable.replace(/>>/g, '>');

    // 2. 构建响应式 HTML 邮件
    // 这个模板使用了 "Responsive Table" 技巧：在手机上，表格会变成块级元素堆叠
    const emailHtml = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>🚀 Cpolar 隧道状态监控日报</title>
  <style type="text/css">
    /* --- 基础 CSS Reset --- */
    body, table, td, div, p, a { 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
      margin: 0; 
      padding: 0; 
      border: 0; 
    }
    img { 
      border: 0; 
      height: auto; 
      line-height: 100%; 
      outline: none; 
      text-decoration: none; 
      -ms-interpolation-mode: bicubic; 
    }
    table { 
      border-collapse: collapse; 
      mso-table-lspace: 0pt; 
      mso-table-rspace: 0pt; 
    }
    /* Outlook 2013 Fix */
    body {
      height: 100% !important;
      width: 100% !important;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      box-sizing: border-box;
    }
    .not-found {
      font-size: 14px;
      corlor: red;
      text-align: center;
      padding: 20px 0;
    }
    /* --- 响应式样式 --- */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
      }

      /* 强制表格在小屏幕上可横向滚动 */
      .responsive-table {
        overflow-x: auto;
        display: block;
        width: 100%;
      }
    }
  </style>
</head>
<body style="background-color: #f4f5f7; margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- 主容器 -->
  <div style="width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- 标题栏 -->
    <div style="background: #2c3e50; padding: 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🚀 隧道状态监控日报</h1>
      <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.8;">当前时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
    </div>

    <!-- 内容区 -->
    <div style="padding: 30px;">
      <p style="margin-bottom: 12px;">您好，这是当前在线的隧道列表：</p>
      
      <!-- 响应式表格容器 -->
      <div class="responsive-table">
        ${cleanTable}
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #7f8c8d; font-size: 12px; text-align: center;">
        这是一封自动发送的邮件，请勿直接回复。<br>
        © ${new Date().getFullYear()} Cpolar 监控系统
      </p>
    </div>
  </div>

</body>
</html>`;

    // 写入文件
    fs.writeFileSync("index.html", emailHtml, "utf8");
    console.log("🎉 成功！邮件已生成 index.html");
    console.log("📧 接下来你可以通过 Nodemailer 或 GitHub Action 发送此 HTML");
  })
  .catch((err) => {
    console.error("❌ 脚本执行失败:", err);
    const errorHtml = `
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: sans-serif; background: #fff3f3; padding: 40px; color: #d63333;">
    <h2>❌ 脚本运行出错</h2>
    <p><strong>错误信息:</strong> ${err.message}</p>
    <p>请检查日志并重试。</p>
  </body>
</html>`;
    fs.writeFileSync("index.html", errorHtml, "utf8");
  });
