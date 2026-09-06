# shiliang.me · 石亮正EV

「石亮正EV」Blog，基于 [Jekyll](https://jekyllrb.com/) + GitHub Pages。
Liang Shi · Positive EV, built with Jekyll & GitHub Pages.

在线地址 / Live: <https://shiliang.me>

## 写一篇新文章 / Writing a new post

1. 在 `_posts/` 下新建文件,命名 `YYYY-MM-DD-标题.md`(英文文件名,日期用发布日期)。
2. 文件顶部写 front matter:

   ```yaml
   ---
   layout: post
   title: "文章标题"
   subtitle: "副标题(可选)"
   date: 2026-07-08 10:00:00 -0400
   lang: zh          # zh = 中文，en = 英文
   tags: [标签一, 标签二]
   ---
   ```

3. 正文用 Markdown 编写。图片放 `assets/images/`,用 `![说明](/assets/images/xxx.jpg)` 引用。
4. `git add . && git commit -m "new post" && git push`。约 1–2 分钟后自动发布。

## 目录结构 / Structure

```
_config.yml          站点配置(标题、社交链接等)
index.html           品牌首页(定位 + 文章列表)
_pages/              关于、归档等独立页面
_pages/about.html    关于我与经历
_pages/work.html     UX 作品
_pages/archive.html  归档
_posts/              所有文章
_layouts/            页面模板
_includes/           头部/底部等片段
assets/css/main.css  样式
assets/js/main.js    语言切换 + 文章筛选
```

## 本地预览 / Local preview

```bash
./setup     # 每台电脑首次使用时运行
./preview   # 打开 http://localhost:4000
```

## 发布前检查 / Pre-publish check

发布前只使用这一个自动检查命令：

```bash
./check
```

`./check` 会在临时目录执行生产环境构建，并核对首页、文章、作品、归档、工具、关于、404、RSS、sitemap 和 robots 产物；同时检查双语界面、中文内容语义、canonical、Open Graph 以及首页内容顺序。

涉及模板、样式或脚本时，在本地预览中按固定矩阵做一次视觉与键盘复核：

| 视口 | 页面 | 检查点 |
|---|---|---|
| 桌面 1440px | `/`、任一 `/posts/.../`、`/work/`、`/archive/` | 内容顺序、字号/行宽、图片、导航、订阅与页脚 |
| 移动 375px | 同上 | 无横向溢出、文字不截断、导航可达、卡片和表单正常 |
| 键盘 + 浅/深色 | 同上，另加 `/tools/` 和 `/about/` | Tab 顺序连续，每个可操作元素都有清晰焦点环，次要文字可读 |

当前保留全局中英界面切换。现有内容仍以中文为主；未来新增英文内容时，应补充独立 URL/collection 与 canonical、hreflang 策略，避免混淆搜索引擎的内容语言判断。

## 工具基础设施 / BLOG-012

三个工具通过 front matter 声明 `title`、`description`、`tool_id`，共享 `_includes/tool-head.html` 和 `_includes/tool-scripts.html`。保留独立工具布局、URL 和现有本地数据；分享图暂复用站点图，可用 `image` 字段覆盖。`./check` 同时检查三页的唯一元数据、GTM、事件脚本、静态资源与 sitemap。

工具事件复用 GTM 加载的 Google 标签，通过标准 `gtag` 命令队列和 `send_to` 指向现有 GA4；不新增第二份 gtag.js，也不再同时发送同名 GTM 自定义事件。普通 `./preview` 不发送工具事件。原清单的 `tool_copy` 已被下表统一口径替代，`tool_start` 参数改用 `tool_id`。

实现依据：[Google 标签事件 API](https://developers.google.com/tag-platform/gtagjs/reference)、[事件路由与 send_to](https://developers.google.com/tag-platform/gtagjs/routing)。

| 事件 | 口径 |
|---|---|
| `tool_view` | 工具埋点脚本载入，每次页面加载一次；不等同于已使用工具 |
| `tool_start` | 第一次被记录的操作，每次页面加载一次 |
| `tool_action` | 每种核心动作每次页面加载一次，避免逐字输入或逐格编辑产生大量事件 |
| `tool_complete` | 每次确认保存／复制成功，或已发起 HTML 下载；不代表内容质量、文件最终落盘或公众号发布成功 |

| `tool_id` | `action` | 可记为完成的动作 |
|---|---|---|
| `investment-checklist` | `edit`, `save`, `copy_text`, `print` | `save`, `copy_text` |
| `wechat-formatter` | `edit`, `insert`, `theme`, `copy_rich`, `copy_text`, `download_html` | `copy_rich`, `copy_text`, `download_html` |
| `preflop-range` | `select_position`, `edit_range`, `clear_range`, `restore_range`, `copy_range` | `copy_range` |

自动恢复草稿、示例初始化、悬停和焦点移动不算操作。打印只记录发起动作；复制失败／手动选中文本不算完成。用户直接复制或保存时，会先补齐 start/action，因此不能用事件总数直接计算人数转化率；应按用户或会话并按 `tool_id` 分组观察。

自定义参数仅允许固定的 `tool_id` 和 `action`；工具事件的页面地址移除查询参数和片段，referrer 设为空。不发送输入正文、投资标的、表单字段、牌局范围或 localStorage 内容。现有 Google 标签的自动页面访问／增强型衡量和同意设置仍由 GTM/GA4 管理，不能由上述工具参数白名单推断它们也已通过隐私审计。

### 验证与上线验收

- `node --test tests/tool-analytics.test.cjs`：检查事件顺序、去重、动作白名单、预览禁发、延迟加载队列与失败隔离；不发出网络请求。
- `./check`：生产构建及工具产物检查。
- 可选浏览器回归：在测试环境提供 Playwright 和 Chrome 后，执行 `node tests/tool-browser.cjs <生产构建目录> [Chrome可执行文件]`。脚本用隔离上下文加载构建产物，检查实际操作，并下载公开 GTM/Google 标签脚本验证四类事件的请求生成；所有 collect 请求均本地拦截，绝不写入生产统计。Playwright 不属于站点运行依赖。
- 发布前实际操作三个工具，覆盖输入/位置选择、复制成功和失败、本地保存及下载；确认工具原有结果不变。
- **PR 合并部署后才能完成生产验收**：在生产页面触发真实操作，用 Tag Assistant／网络面板确认 GA4 collect 请求的 `tid=G-MQH963M94G`、`en` 和 `ep.tool_id`；随后由有权限的 GA4 账号在 Realtime/DebugView 确认接收。队列中存在事件或本地模拟请求均不能代替 GA4 接收确认。
- 若需要在 GA4 报表中按工具和动作筛选，注册事件级自定义维度 `tool_id`、`action`；不需要搭建新仪表盘。
- 回滚：通过回滚本 PR 的新 PR 恢复模板和事件接入；既有工具 URL、输入数据与存储键未迁移。
