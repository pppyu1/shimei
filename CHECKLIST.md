# Shi Mei (时寐) - 发布前检查项

在每次发布生产环境（Production）之前，请确保完成以下检查：

## 1. 代码与构建质量
- [ ] 所有代码已合并至 `main` 分支。
- [ ] CI/CD 工作流（lint、unit test、build）全部通过。
- [ ] 检查无未处理的 `console.log`、`debugger` 等调试代码。
- [ ] `npm run build` 本地构建通过，且包体积在合理范围内。

## 2. 测试覆盖率
- [ ] 核心单元测试（状态机、数据层）通过。
- [ ] E2E 测试至少覆盖：首页进入、Hash 路由恢复、模块切换、播放器打开关闭等当前主链路。
- [ ] 若本次发布包含登录、收藏、历史或梦境记录改动，补充对应的 E2E 用例并验证通过。
- [ ] 边界测试：断网情况、离线缓存回退、非法输入处理（如时长过大）、未登录状态下的限制。

## 3. 环境与配置
- [ ] 生产环境 `.env.production` 变量已配置。
- [ ] Supabase 生产环境：`VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 正确配置。
- [ ] Edge Functions (`sync-play-history`) 已部署到生产环境并测试通过。
- [ ] Supabase Database RLS 策略确认已完整启用，无越权风险。
- [ ] Supabase Database 生产环境数据表已完整迁移（Migrations 运行成功）。

## 4. UI/UX 体验检查
- [ ] 响应式检查：在不同设备（iPhone SE, iPhone 12/13/14 Pro, 桌面浏览器小窗口）下显示正常，无溢出。
- [ ] 字体、图标、动画加载正常。
- [ ] 音频播放链路在真机（iOS Safari, Android Chrome/微信浏览器）上能够正常解锁播放，无自动播放限制问题。
- [ ] 呼吸引导动画在低端机型上无明显卡顿掉帧。

## 5. 运营与监控（阶段 7 准备）
- [ ] 如果已接入埋点与错误监控（如 Sentry、Google Analytics），确认 SDK 初始化与上报正常；若仍使用本地 telemetry，占位事件与错误记录应可回放。
- [ ] 若本次版本进入阶段 7，确认用户核心漏斗（启动 -> 播放 -> 入睡）相关事件埋点就绪。
- [ ] 若本次版本依赖 Edge Functions，确认 Supabase Logs 能正常捕获异常。
