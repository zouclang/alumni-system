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

### 3. 校友连接与隐私保护
- **隐私保护模型**: 只有建立“对接”关系的校友才能查看彼此的完整联系方式（电话、微信等），未对接用户仅能查看公开的姓名和基础资料。
- **双向连接机制**: 申请通过后，双方自动互为可信关系，打破隐私屏蔽，实现资源精准对接。
- **校友自主审批**: 对接申请除了管理员可批复，被申请人也可在个人中心直接点击“通过”或“拒绝”，提升自治效率。
- **实时消息提醒**: 系统内置通知红点（侧边栏及个人中心标签），实时提醒处理新受到的对接申请或查看申请进度。

### 4. 管理员后台与审计
- **全方位审核**: 管理员可处理用户注册、对接申请、以及校友发起的资料纠错申请。
- **多维度审计日志**: 记录每一项审核操作的执行人（区分“管理员审核”或“校友自主审批”），确保流程透明可溯。
- **待办看板**: 侧边栏实时汇总全站待办项，快速触达审核入口。
- **权限控制**: 支持精细化的角色与状态管理。

### 5. 数据导入导出
- 支持 Excel 批量导入校友数据。
- 支持导出当前的搜索结果为 Excel/CSV。
- 导出数据严格遵循当前用户的访问权限，保护校友隐私。

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

### 2. 修改管理员账号密码 (安全方式)
为了防止账号密码上传到 GitHub，请使用环境变量：

1.  在项目根目录下创建一个 `.env` 文件（该文件已被 `.gitignore` 忽略，不会上传）：
    ```bash
    cp .env.example .env
    ```
2.  编辑 `.env` 文件，点击“您的用户名”和“您的新密码”（默认为 `admin`/`admin`）：
    ```text
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=admin
    ```
3.  运行初始化脚本（脚本会优先读取 `.env` 中的配置）：
    ```bash
    # 如果您的 Node.js 版本 >= 20.6.0
    node --env-file=.env scripts/init_admin.js
    
    # 或者手动指定的环境变量运行
    ADMIN_USERNAME=您的用户名 ADMIN_PASSWORD=您的新密码 node scripts/init_admin.js
    ```
    *注意：如果该用户名在数据库中已存在，脚本将更新其密码；如果不存在则新建。*

### 3. 更换登录页背景
替换 `public/login-bg.png` 即可。

## 🐳 Docker 部署 (推荐)

项目已全面支持 Docker 容器化部署，内置了多阶段构建的轻量化 `Dockerfile`，并优化了 Next.js standalone 输出。同时配置了数据持久化挂载，确保 SQLite 数据安全。

### 1. 使用 Docker Compose 一键运行（最简单）
在项目根目录执行：
```bash
docker-compose up -d
```
系统将自动在 `3000` 端口启动，并由 `docker-compose` 守护进程保持运行。所有数据保存在此目录下的 `data/alumni.db` 中。

### 2. 手动构建与运行
如果不使用 docker-compose，可以使用原生 docker 命令：
```bash
# 构建镜像
docker build -t alumni-system .

# 运行容器 (映射 3000 端口，并挂载本地 data 目录)
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name alumni-system alumni-system
```

## 📝 开发备注
- 本系统数据库文件存储在本地，部署方便。
- 生产环境下如果遇到登录 Cookie 失效，请检查 `app/api/auth/login/route.ts` 中的 `secure` 属性配置。

---
*大工苏州校友会 版权所有*
