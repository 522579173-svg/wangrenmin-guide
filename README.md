# 📖 全国景点讲解 · 手机 App（PWA 形态）

一个"像 App 一样"的手机应用，0 上架成本、0 服务器费用（吃你已有的个人网站）。

## 一、功能清单

| 功能 | 说明 |
|---|---|
| 🎙️ 仿真人导游 | 手绘景区地图 + 定位，进入景点自动开讲（内置故宫/西湖/灵隐寺/雷峰塔）；GPS 讲解带 3 分钟防重触发 |
| ✨ 自动生成景区地图 | **陌生景区也能用**：输入名称 → 高德自动搜景点 + DeepSeek 批量生成讲解 → 自动画地图放讲解点 → 存库，以后直接用 |
| 🧠 智能自由导览 | GPS 定位 → 自动识别地点 → 三级自动补全：内置库 → 我的讲解库 → **DeepSeek AI 当场生成** → 朗读并缓存 |
| 📚 我的讲解库 | AI 生成的讲解自动存档（localStorage），**常去的地方第二次去直接命中、自动开讲** |
| 🔍 景点浏览/搜索 | 5 城 15 景内置数据，可自行扩充 |
| 🗣️ 语音讲解 | 浏览器自带中文 TTS，免费离线可播，支持语速调节、暂停/继续、**上/下一句、进度显示**；数字自动转中文朗读 |
| 🌓 深浅色外观 | 自动跟随手机系统深浅色，可手动切换（设置页） |
| 📲 PWA 安装 | 添加到手机桌面，全屏使用，像原生 App |

## 二、目录结构

```
景点讲解App/
├── index.html          # 主程序（所有功能都在这里）
├── manifest.webmanifest # PWA 清单（图标/名称）
├── sw.js              # 离线缓存
├── vercel.json        # Vercel 配置（CORS 头等）
├── icons/             # App 图标（PNG，手机桌面显示用）
├── api/
│   ├── deepseek.js    # DeepSeek 安全代理（Vercel 函数，Key 藏在服务器）
│   └── geocode.js     # 高德逆地理编码安全代理（Vercel 函数）
└── proxy/
    └── deepseek.php   # DeepSeek 代理（可选，给非 Vercel 的 PHP 主机用）
```

## 三、当前部署：腾讯云 CloudBase（国内直连 · 无需魔法）

> **当前线上版本就部署在这里**（2026-08 迁移完成，Vercel 在国内访问不稳定已弃用）：
> - 网站：`https://guide-d4grybdwde2f9d281-1432633719.tcloudbaseapp.com`
> - DeepSeek 代理：`https://guide-d4grybdwde2f9d281-1432633719.ap-shanghai.app.tcloudbase.com/deepseek`
> - 高德代理：`https://guide-d4grybdwde2f9d281-1432633719.ap-shanghai.app.tcloudbase.com/geocode`

### CloudBase 部署/更新方法（T CB CLI）

```bash
# 登录一次
tcb login

# 更新云函数（deepseek 超时60s / geocode 支持POI搜索，配置见 cloudbaserc.json）
tcb fn deploy deepseek -e guide-d4grybdwde2f9d281
tcb fn deploy geocode -e guide-d4grybdwde2f9d281

# 更新静态文件（index.html 等，改动后执行）
tcb hosting deploy index.html -e guide-d4grybdwde2f9d281 --concurrency 1

# 上传其他静态文件
tcb hosting deploy manifest.webmanifest -e guide-d4grybdwde2f9d281
tcb hosting deploy sw.js -e guide-d4grybdwde2f9d281
tcb hosting deploy icons -e guide-d4grybdwde2f9d281
```

云函数环境变量（已配置在 cloudbaserc.json / 控制台）：
- `DEEPSEEK_KEY`：DeepSeek Key（服务器端，安全）
- `AMAP_KEY`：高德「Web服务」Key（服务器端，安全）

> ⚠️ 免费体验版不支持绑定自定义域名，手机装成 App 后桌面是图标，看不到网址，不影响使用。

## 四、部署到 Vercel（备选 · 国内需魔法）

> 你的 `wangrenmin.com` 已经托管在 Vercel，推荐**新建一个独立 Vercel 项目**部署本 App，不动你现有主站，部署后可用 `https://guide.wangrenmin.com` 这样的子域名访问。

### 方式 A：GitHub 托管 + Vercel 自动部署（推荐，长期维护方便）

1. 把本文件夹推送到一个 GitHub 仓库（例如 `wangrenmin-guide`）；
2. 打开 https://vercel.com → **Add New → Project** → Import 该 GitHub 仓库；
3. Framework Preset 选 **Other**（或自动识别即可），**Build Command / Output Directory 留空**，直接 **Deploy**；
4. 部署完成后，Vercel 会给你一个 `xxxx.vercel.app` 地址；
5. （可选）在项目 **Settings → Domains** 添加 `guide.wangrenmin.com`，然后在你的域名 DNS 里添加一条 CNAME：`guide` → `cname.vercel-dns.com`，几分钟后生效。

### 方式 B：Vercel CLI 命令行部署（不想用 GitHub 时）

```bash
# 安装 Vercel CLI（一次即可）
npm i -g vercel

# 进入项目目录后登录并部署
cd 景点讲解App
vercel login
vercel --prod
```

### 部署后必须配置环境变量（Key 安全模式）

在 Vercel 项目 **Settings → Environment Variables** 添加：

| Name | Value | 作用 |
|---|---|---|
| `DEEPSEEK_KEY` | `sk-你的DeepSeekKey` | AI 生成讲解（必填，否则没有真 AI） |
| `AMAP_KEY` | 高德「Web服务」Key | 定位识别更准（可选，不填用 OSM 兜底） |

> ⚠️ 添加/修改环境变量后，需要 **重新 Deploy 一次** 才生效。

### 手机端使用步骤

1. 手机浏览器打开 `https://guide.wangrenmin.com/`（或你的 vercel.app 地址）；
2. 首次打开点右上角 ⚙️：
   - **DeepSeek 代理地址** 填：`https://guide.wangrenmin.com/api/deepseek`（Key 留空，用服务器上的环境变量）
   - **高德代理地址** 填：`https://guide.wangrenmin.com/api/geocode`（可选）
   - 保存；
3. 手机浏览器菜单 → **添加到主屏幕**，桌面出现 App 图标，之后像原生 App 一样点开使用；
4. 授权定位 → 点「🧠 智能自由导览」→「📍 开始定位跟随」，走到新地点自动识别并生成讲解；
5. 或点「🎙️ 仿真人导游」进景区，GPS 模式下"走到哪讲到哪"。

> ⚠️ 真 GPS 必须 HTTPS（Vercel 自带免费 HTTPS，无需配置证书）。

### 其他托管方案（非 Vercel）

- **支持 PHP 的主机**：上传 `proxy/deepseek.php` 到 `proxy/` 目录，把 Key 填到第 17 行 `DEEPSEEK_KEY`；设置页代理地址填 `https://你的域名/proxy/deepseek.php`。
- **纯静态托管（GitHub Pages / Cloudflare Pages）**：没有服务器函数，只能用直连模式——设置页填 DeepSeek Key 直连（部分浏览器可能被 CORS 拦截，Chrome/Edge 通常可以）。

## 四、关键配置说明

### 1. DeepSeek API Key（必须，AI 生成讲解用）
- 在平台申请，形如 `sk-xxxxxxxx`。
- **安全模式（推荐，Vercel / PHP）**：
  - Vercel：在项目 Settings → Environment Variables 添加 `DEEPSEEK_KEY`，前端设置页「DeepSeek 代理地址」填 `https://你的域名/api/deepseek`，Key 留空即可，Key 只存在于服务器，任何人看不到；
  - PHP 主机：填进 `proxy/deepseek.php` 第 17 行 `DEEPSEEK_KEY`，代理地址填 `https://你的域名/proxy/deepseek.php`。
- **直连模式（纯静态托管）**：Key 填在 App 设置页，仅保存在本机浏览器 localStorage（他人可通过浏览器 F12 看到，仅限自用）。

### 2. 高德逆地理编码 Key（强烈建议，GPS 识别地点更准）
- 注册 https://lbs.amap.com （个人开发者免费）
- 控制台 → 创建应用 → 添加「**Web服务**」类型的 Key
- **安全模式**：Vercel 环境变量加 `AMAP_KEY`，前端「高德代理地址」填 `https://你的域名/api/geocode`；
- **直连模式**：Key 直接填在 App 设置。
- 不填则用 OpenStreetMap 兜底（免费但国内访问不稳定）。

### 3. 没有配置任何 Key 时
AI 生成会输出「演示讲解」，其余功能（内置景点、仿真人导游、语音）全部正常。

## 五、自动补全机制（核心逻辑）

```
手机GPS → 坐标 → 逆地理编码（高德/OSM）→ 地点名
  → ① 匹配内置库（精品讲解）         → 播放
  → ② 匹配我的讲解库（localStorage） → 播放（距离<120米自动开讲）
  → ③ 都没命中 → DeepSeek AI 生成讲解 → TTS朗读 → 存入讲解库
```

**效果**：第一次到一个陌生景点，AI 当场讲给你听并存档；第二次再去，GPS 一到自动开讲，越用越准、越用越省（不重复调 API，省钱）。

## 六、怎么添加内置景点/讲解点

打开 `index.html`，找到 `/* APP 数据区 */` 和 `GUIDE_AREAS` 数组，照格式添加：

- `APP_DATA`：普通景点（城市 → 景点 → 讲解词），格式见故宫示例；
- `GUIDE_AREAS`：仿真人导游景区（含手绘地图点位 x/y、触发半径 r、讲解词 script）。

## 七、成本

| 项目 | 费用 |
|---|---|
| 托管（个人网站） | 已有，¥0 |
| DeepSeek 生成讲解 | 约 ¥0（新用户赠送额度；一条讲解约 1k token，个人自用每月几分钱量级） |
| 高德逆地理 | ¥0（免费额度内） |
| TTS 语音 | ¥0（浏览器自带） |

## 八、常见问题

- **本地打开没有定位？** 真 GPS 需要 HTTPS，请部署到个人网站后手机访问；本地可用「模拟演示」。
- **AI 生成失败 / 转圈？** 检查 Key 是否正确；浏览器直连被拦截就配代理地址。
- **讲解不准？** AI 生成的内容可能有个别史实偏差，页面上已标注；你可以在讲解库删除后重新生成。
