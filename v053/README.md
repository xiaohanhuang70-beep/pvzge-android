# GE v0.5.3 全界面触控实验分支

基于用户提供的 `GE_v053_花园地图设置全界面触控_实验工程.zip`，同时保留 v0.5 的真实游戏状态检查。不是已完成真机验收的官方手机版。

## 本次修改

- 统一跨场景单指适配：保留 Cocos 原生触摸，补充桌面专属处理函数需要的左键事件。菜单只在完成轻触后发送一次，划动不推进剧情；切场景后丢弃旧点击。
- 世界选择器根据实际 `WorldMapChooser` 激活状态识别，单指横滑发送一次切世界滚轮，取消原生触摸结束以免误进关卡。普通地图仍走原生拖动。菜单保留鼠标悬停位置更新。
- 花园先更新真实鼠标命中位置，再发送单击，避免 `mouseInSlot` 使用上一帧位置。双指用游戏已有中键平移与滚轮缩放；取消原生单指按压，防止手势结束误点。
- 设置窗口优先于战斗场景识别；支持 Node 实际 `_components`。纵向意图明确后取消原生按压并转发滚轮（实际游戏的原生单指拖动未改变偏移），避免触摸与滚轮双重滚动；轻触和水平滑块保持原生触摸，保留双指滚轮。
- 战斗读取 `UIInGame.component.index`、`Mouse.mouseInLnC` 与植物数量，确认卡片选择后允许拖动释放的第二次种植按下；只在确认移除植物后退出原绿色铲子。
- 取消、失焦、页面隐藏、多指切换时释放按键、废弃待执行输入；抑制 WebView 自行合成的重复鼠标事件，保留真实鼠标。
- `MouseGameWebView.kt` 保留原生 WebView 触摸；`GameActivity.kt` 取消全局触摸阻断、加载统一适配层、使用同一 WebView 全屏；布局等比例缩放，保留 Original 渲染选项。
- debug 包名 `com.pvzge.gardendless.nativev053`。与原版、v0.5 分离，存档不自动共享，不卸载任何旧版。

## 可复现构建

`apply_v053.py` 严格核对原作者 Android `v0.16.1` 源码片段，找不到唯一锚点就停止。工作流仅构建个人测试分支，不写入原作者仓库或 master。

上游资源仓库不可用，因此取原作者 `v0.16.1` 已发布 APK 的原始资源 ZIP，并核对 APK SHA256。没有改用其他游戏版本镜像。CI 记录资源脚本摘要、事件审计、测试输出、Android 源码差异、APK 签名与校验和。

工作流 `ge-fullscreen-touch.yml` 在本测试分支上提供 v0.5.3 构建入口，复用默认分支已有 workflow_dispatch ID；`ge-native-mobile-touch-v053.yml` 保存同一工作流。master 不变。

## 测试与限制

运行 `node --test test-all-screens.cjs test-regressions.cjs`：输入适配回归测试。
对实际打包 `assets/main/index.js` 运行 `test-game-contracts.cjs`：真实游戏函数契约测试；依赖受控，不等于完整场景运行。
`runtime-smoke.cjs` 尝试在 Chromium 中启动实际资源和 Cocos，并检查浏览器触摸传入 Cocos。其结果独立记录；Android 真机验证不能由该结果代替。

请查看 TEST_REPORT.md 和对应 Actions 验证产物。未验证项目不能写成已修复。
