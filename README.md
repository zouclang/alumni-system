# 大工苏州校友会信息管理系统 (Alumni System)

这是一个基于 Next.js 开发的轻量级校友信息管理系统，旨在方便校友会进行成员登记、审核、搜索以及校友间的对接申请。

## 🌟 核心功能

### 1. 校友自助登记与登录
- **多维度资料填写**：涵盖基本信息、在校经历、工作信息、行业背景等。
- **资料完善度校验**：
    - 引入 **45%** 完善度阈值逻辑。
    - 针对普通校友，必须满足完善度分数并填满必填项（姓名、电话、在校经历、工作信息等）方可申请校友间的对接私信。
    - **理事会员豁免**：理事及以上职务成员享有特权，申请申请对接不受完善度限制。

### 2. 智能搜索与筛选
- **拼音首字母搜索**：支持通过姓名拼音或首字母快速定位校友。
- **多条件过滤**：支持按学院、专业、年级、行业、所在区域等维度进行精准筛选。

### 3. 管理员后台
- **成员审核**：管理员可对新注册成员进行审核，支持查看并对比纠错申请。
- **待办提醒**：侧边栏实时显示待审核人数及未读通知。
- **审计日志**：记录系统关键操作，确保数据安全可追溯。
- **权限管理**：支持管理员对用户权限进行细粒度控制。

### 4. 数据导入导出
- 支持 Excel 批量导入校友数据。
- 支持导出当前的搜索结果为 Excel/CSV。

## 🛠️ 技术栈

- **前端框架**: Next.js 15+, React 19
- **样式方案**: Tailwind CSS 4, CSS Modules
- **数据库**: SQLite (驱动：`better-sqlite3`)
- **中文处理**: `pinyin-pro` (支持拼音首字母匹配)
- **图表展示**: ECharts / Recharts
- **部署工具**: PM2

## 🚀 快速开始

### 1. 环境准备
确保您的机器已安装 Node.js (建议 v18+)。

### 2. 安装依赖
```bash
git clone https://github.com/zouclang/alumni-system.git
cd alumni-system
npm install
```

### 3. 运行开发服务器
```bash
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 即可预览。

### 4. 生产环境部署
在服务器上建议使用 PM2 进行管理：
```bash
# 编译项目
npm run build

# 使用 PM2 启动
npx pm2 start npm --name "alumni-system" -- start
```

## 🎨 个性化定制

### 1. 更换会徽 (Logo)
直接替换 `public/logo.png` 文件即可。建议图片为 PNG 格式，尺寸保持正方形以获得最佳显示效果。

### 2. 修改管理员账号密码
1. 打开 `scripts/init_admin.js` 文件。
2. 修改第 9 行和第 10 行的 `username` 和 `password` 变量：
   ```javascript
   const username = '您的用户名';
   const password = '您的新密码';
   ```
3. 在项目根目录下运行初始化脚本：
   ```bash
   node scripts/init_admin.js
   ```
   *注意：如果账号已存在，运行该脚本将更新其密码。*

### 3. 更换登录页背景
替换 `public/login-bg.png` 即可。

## 📝 开发备注
- 本系统数据库文件存储在本地，部署方便。
- 生产环境下如果遇到登录 Cookie 失效，请检查 `app/api/auth/login/route.ts` 中的 `secure` 属性配置。

---
*大工苏州校友会 版权所有*
