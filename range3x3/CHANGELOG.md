# v0.5.3 Range3x3 修改记录

基准：`14cadfb2835da199deedb771c5b51e00aaa36d4d`；该提交仅在已构建代码 `29cd0d9f6d71d4b1290591fe79d9b039dea0f87c` 上增加旧测试报告。

## 产品逻辑

`range3x3/apply_range.py` 在构建期间对原始 `pvzge_web.zip` 作精确补丁。先沿用 v053 工作流验证原始 APK SHA256，再验证五个目标资源 SHA256、模块和函数唯一锚点、对象类别和 aliases、全部原始伤害与效果配置。任一不符就退出，拒绝写入。必须针对全新恢复的原始资源执行；重复对已补丁资源执行会被校验拒绝，防止叠加修改。

| 游戏内资源 | 修改 |
|---|---|
| `assets/resources/import/e8/e8720a22-e52e-45f4-a860-df34a0f1c62e.json`，`ProjectileProps` | `banana`、`banana1`、`banana2`、`missiletoe`、`missiletoe1`、`missiletoe2` 的第一层 `SplashDamage.Range.h` 从 1 改为 3；宽仍为 3。强化变体仍是同两株植物的原始强化路径，伤害分别保持 1200/2200/3200。 |
| `assets/main/index.js` 中 `Projectiles.ts / PrjFunctions.throwOneBananaOnPos` | 仅为上述六种目标弹体标记范围裁剪；位置、初始高度、速度、重力、注册、旋转等原始代码不变。 |
| 同一文件中 `commonShot.ts / dealSplashDamageForEach` | 仅对已标记的目标弹体，将原始矩形与实际棋盘范围求交。沿用原始行池、碰撞框、敌人对象去重及伤害/效果调用。其他弹体走原始分支。 |
| `assets/resources/import/79/7900744c-0325-4680-a641-811617384636.json`，`PlantAlmanac` | 仅两株植物的 `AREA` 中英文 `1x3` 改 `3x3`。 |

槲寄冰仙子原先是 **1×3 伤害层 + 3×3 冰冻/减速层**；本次只扩大伤害层。原有 5 秒冰冻与减速、强化后的 10/15 秒、`IceBlockLevel` 均保留。没有修改攻击伤害或添加距离衰减，也没有修改植物费用、种植冷却、发射休息时间、瞄准、音效、贴图、飞行或爆炸动画资源。

## Android 与构建

- `range3x3/identity.py` 在原 `apply_v053.py` 后只修改测试包后缀和名称：`com.pvzge.gardendless.test0166` / `GE v0.16.6 触控范围3x3测试`。
- `.github/workflows/ge-fullscreen-touch.yml` 只在新分支更新，保留旧 v053 的资源恢复、测试、画质和构建方式，叠加范围补丁、伤害测试和 APK 全资源 SHA256 核验。
- 游戏资源改为作者 `v0.16.6/app-release.apk`；SHA256 `1d2dfeb835be404d39dd80835a5b5c0fc332e5a22efcf14b28209326667849ed`。`assets/main/index.js` 在 v0.16.6 重新压缩，`commonShot.dealSplashDamageForEach` 的棋盘变量从 `I`/`z`/`l` 改为 `F`/`O`/`r`。香蕉发射锚点未变。弹体、图鉴、植物和类型 JSON 的 SHA256 与 v0.16.1 相同。
- `v053/ge-mobile-input.js`、`v053/apply_v053.py`、原回归与运行测试文件保持仓库字节不变。仅在临时 CI 目录复制并扩展运行测试入口，不会写回旧脚本。
- 所有资源文件逐项生成 SHA256 清单；APK 打包后重新读取内嵌资源逐项比对。保留全部离线游戏资源。
- 这是独立 debug 测试 APK；不会替换原 v053 的应用身份，数据目录独立。没有接触用户手机或现有存档。若需要旧进度，使用原版本导出和测试版导入；该增量未重写存档功能。

## 测试文件

- `test-range.cjs` / `game-test-lib.cjs`：直接执行资源里提取的真实转换、矩形相交、范围伤害和状态效果函数；场景服务和记录敌人为受控依赖，明确属于逻辑自动化测试。
- `test_patch.py`：验证修改范围与所有其他对象不变、各资源指纹变动时拒绝修改、重复补丁拒绝、仅两个 JS 模块被改变。
- `runtime-range.cjs`：真实打包 Cocos 应用中建立一次性战斗场景，生成真实植物、弹体和 Zombie 组件，调用真实植物发射与落地伤害入口。为确定性测试手动触发落地；完整飞行和触摸瞄准手感需真机验收。
- `prepare_runtime.py`：仅扩展临时 CI 测试副本。
- `verify_apk.py`：核对签名前提之外的 APK CRC、完整游戏资源 SHA256 和原触控脚本字节。
