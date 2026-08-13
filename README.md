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
