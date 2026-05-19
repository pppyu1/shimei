# Shi Mei (时寐) - 助眠与冥想体验应用

一个以「夜间疗愈」为主题的前端 MVP，聚焦助眠内容浏览、白噪音混音、4-7-8 呼吸引导与沉浸式播放器体验。

> 当前阶段：MVP 交互验证版（以前端体验与视觉语言验证为主）

## 项目简介

`Shi Mei` 当前基于 `React + TypeScript + Vite + Tailwind CSS v4` 构建，主要用于验证助眠产品的核心交互与视觉风格。

当前实现以 UI/交互演示为主，包含：
- 首页晚间推荐与内容卡片
- 白噪音混音器（多声道开关与音量滑杆）
- 4-7-8 呼吸引导动画与节奏状态机
- 全屏助眠播放器（播放态切换、进度与功能区）
- 个人中心与基础设置入口

## 技术栈

- `React 19`
- `TypeScript`
- `Vite 6`
- `Tailwind CSS 4`（通过 `@tailwindcss/vite`）
- `motion`（动效）
- `lucide-react`（图标）
- `Supabase`（后端服务：数据库、鉴权、存储、可选 Edge Functions）

## 后端架构（Supabase）

后端统一采用 `Supabase`，建议按以下边界组织能力：

- **Auth**：邮箱/短信/第三方登录、会话管理
- **Database (Postgres)**：用户资料、播放历史、收藏、混音配方、梦境日记
- **Storage**：音频资源、封面图、用户上传内容
- **Edge Functions（可选）**：需要服务端校验或聚合逻辑的 API

## Supabase 最小接入（已完成）

当前仓库已完成基础 SDK 接入：

- 依赖：`@supabase/supabase-js`
- 客户端封装：`src/lib/supabase.ts`
- 环境变量类型声明：`src/vite-env.d.ts`

你可以直接在业务代码中使用：

```ts
import { supabase } from './lib/supabase';

const { data, error } = await supabase.from('profiles').select('*').limit(10);
```

如果没有配置 `VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY`，应用会自动回退到本地 mock client，方便先预览 Web 界面与交互。

## Supabase 业务闭环（第 3 阶段已接入）

当前版本已经在“我的”页面接通最小业务流：

- 邮箱 OTP 登录（`supabase.auth.signInWithOtp`）
- 登录态监听与退出登录
- `profiles` 读取与 `display_name` 保存（`upsert`）
- `favorites` 收藏切换、最近播放列表、梦境记录最小表单
- 播放器按 15 秒节流写入 `play_history`

## 第 4 阶段进展（性能与播放）

- 已对主要页面模块启用 `React.lazy` 懒加载，降低首屏包体
- 播放器已接入真实 `<audio>` 播放链路（演示音频 URL）
- 已支持播放进度显示、快退/快进 15 秒
- 已支持 15 / 30 / 45 分钟睡眠定时器
- 已按 15 秒节流写入 `play_history`（需用户登录）
- 首页卡片、精选旅程与播放器已联动
- 白噪音混音器已接入基于 Web Audio 的 3 路环境音播放
- 已支持基于 `#/view` 的可刷新路由与播放器深链
- 已支持当前音频离线缓存回退与播放进度本地恢复
- 已加入本地事件埋点与错误采集基础能力

## 功能一览

| 模块 | 当前状态 | 说明 |
| --- | --- | --- |
| 首页推荐 | 已实现（UI+播放联动） | 晚间卡片、精选旅程、继续播放入口 |
| 白噪音混音器 | 已实现（真实播放） | 3 路环境音混合、独立音量、网页音频解锁 |
| 呼吸引导（4-7-8） | 已实现（交互） | 吸气/屏息/呼气状态切换与计时 |
| 全屏播放器 | 已实现（UI+交互） | 播放切换、进度条、快进快退、睡眠定时、离线缓存 |
| 个人中心 | 已实现（最小数据闭环） | 登录、昵称、收藏、历史、梦境记录 |
| 音频真实播放 | 已接入 | 播放器使用真实 `<audio>`，混音器使用 Web Audio |
| 账户与数据同步 | 已接入（MVP） | 登录、收藏、历史、梦境记录通过 Supabase 实现 |
| 可刷新路由 | 已接入（Hash） | 支持模块切换刷新保留与播放器深链 |
| 基础监控埋点 | 已接入（本地） | 记录视图切换、播放、定时、离线缓存与错误 |

## 快速开始

### 1) 环境要求

- `Node.js` 18+（建议使用 20+）
- `npm` 9+

### 2) 安装依赖

```bash
npm install
```

### 3) 配置环境变量

复制 `.env.example` 为 `.env.local`，并按需填写：

```bash
cp .env.example .env.local
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env.local
```

关键变量说明：
- `KIMI_API_KEY`：Kimi API Key（目前代码中已注入配置，后续可用于 AI 能力接入）
- `APP_URL`：应用部署地址（回调、自引用链接等场景）
- `VITE_SUPABASE_URL`：Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY`：Supabase 前端匿名公钥（Anon Key）

> 注意：`service_role` 密钥只能放在服务端，不能放进前端 `.env.local`。

### 4) 本地运行

```bash
npm run dev
```

默认启动地址：`http://localhost:3000`

## 预览与截图

当前仓库未内置截图资源。建议在本地运行后补充以下内容到 `README`：

- 首页（Home）
- 白噪音混音器（Nature）
- 呼吸引导（Zen）
- 全屏播放器（Player）

你可以创建 `docs/screenshots/` 目录后，将图片命名为：
- `home.png`
- `nature-mixer.png`
- `zen-breathing.png`
- `player.png`

### 5) 生产构建与预览

```bash
npm run build
npm run preview
```

### 5.1) 清理构建产物

```bash
npm run clean
```

`clean` 脚本已做跨平台处理（Windows/macOS/Linux 可用）。

### 6) 类型检查

```bash
npm run lint
```

## 项目结构

```text
--main/
  src/
    App.tsx          # 组合层（状态与路由视图切换）
    features/
      layout/        # 顶部栏、底部导航
      home/          # 首页模块
      nature/        # 白噪音混音器模块
      zen/           # 呼吸训练模块
      player/        # 播放器模块
      me/            # 个人中心模块
      shared/        # 跨模块共享类型
    lib/
      supabase.ts    # Supabase 客户端实例
    main.tsx         # 应用入口
    index.css        # 主题变量与全局样式
  index.html         # Vite HTML 模板
  vite.config.ts     # Vite 配置与环境变量注入
  .env.example       # 环境变量示例
  metadata.json      # 应用元信息
```

## 设计与需求参考

仓库内附带了 MVP 产品文档与多份页面原型，便于继续演进产品：

- `../stitch_mvp_prd/mvp_prd.html`：MVP PRD（功能优先级、用户流程、技术要点）
- `../stitch_mvp_prd/stitch_mvp_prd/`：各模块页面原型与设计稿

## 当前状态说明

- 当前版本重点是「视觉与交互验证」，非完整可商用版本
- 推荐算法、健康数据接入、第三方监控平台与更多真机验证仍需后续接入真实能力
- 后端技术路线已确定为 Supabase，当前已完成 Auth、RLS、Edge Function 与核心表结构接入，但仍处于 MVP 阶段
- 文案目前以中文为主，适合先做中文场景验证

## 后续建议

- 补充 Service Worker / PWA 外壳，进一步完善整站离线能力
- 为白噪音混音器增加预设配方保存/分享
- 完善呼吸训练模式（箱式呼吸等）与触觉反馈
- 增加更多 E2E 场景，覆盖登录成功、收藏、历史与梦境记录的真实链路

## Roadmap

- `v0.2` 接入 Supabase Auth + 基础用户表
- `v0.3` 接入收藏、历史记录、混音配方（Supabase Postgres）
- `v0.4` 接入健康数据（睡眠指标）与晨间复盘
- `v1.0` 完成核心闭环（助眠 -> 入睡 -> 记录 -> 反馈）

## Supabase 表结构建议（MVP）

建议优先创建以下表（均包含 `created_at`、`updated_at`）：

- `profiles`：`id (uuid, pk, references auth.users.id)`、`display_name`、`avatar_url`
- `favorites`：`id`、`user_id`、`content_id`、`content_type`
- `play_history`：`id`、`user_id`、`content_id`、`progress_seconds`、`played_at`
- `mixer_presets`：`id`、`user_id`、`name`、`channels (jsonb)`
- `dream_journals`：`id`、`user_id`、`mood`、`content`、`recorded_at`

并为用户私有数据开启 RLS（Row Level Security），至少保证 `user_id = auth.uid()` 的读写策略。

## 开发建议

- 推荐将大型视图组件从 `src/App.tsx` 拆分到 `src/features/*`
- 增加 `eslint` 与格式化配置，统一代码风格
- 为呼吸状态机与播放器状态添加单元测试
- 增加 E2E 用例覆盖核心路径（打开内容、播放、切换模式）

## 贡献指南

欢迎提交 Issue / PR，一起完善「时寐」体验。

1. Fork 项目并创建功能分支
2. 保持改动聚焦，附上必要说明
3. 提交前执行：
   - `npm run lint`
   - `npm run build`
4. 提交 PR 时描述变更目标、验证步骤与影响范围

## FAQ

### 1) 为什么设置了 `KIMI_API_KEY`，但当前页面没有 AI 能力？

当前版本保留了环境变量注入能力，便于后续接入生成式推荐、助眠内容生成等功能；MVP 阶段以交互和视觉验证为主。

### 2) 这是 Web 版还是 App 版？

目前是 Web 前端 MVP，设计与交互偏移动端，可作为后续 React Native/Flutter 实现的参考原型。

### 3) 可以直接用于生产吗？

不建议。当前尚未接入完整后端、鉴权、音频链路和监控体系，更适合产品验证与设计评审阶段使用。

### 4) 后端为什么选 Supabase？

MVP 阶段可快速获得鉴权、数据库、对象存储等核心能力，能更快完成从“交互原型”到“可用产品”的闭环验证。

## License

代码文件头部包含 `Apache-2.0` 标识，若需要开源发布，建议补充完整 `LICENSE` 文件并统一声明。
