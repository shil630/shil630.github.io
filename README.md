# shil630.github.io

「石亮正EV」Blog，基于 [Jekyll](https://jekyllrb.com/) + GitHub Pages。
Liang Shi · Positive EV, built with Jekyll & GitHub Pages.

在线地址 / Live: <https://shil630.github.io>

## 写一篇新文章 / Writing a new post

1. 在 `_posts/` 下新建文件,命名 `YYYY-MM-DD-标题.md`(英文文件名,日期用发布日期)。
2. 文件顶部写 front matter:

   ```yaml
   ---
   layout: post
   title: "文章标题"
   subtitle: "副标题(可选)"
   date: 2026-07-08 10:00:00 -0400
   lang: zh          # zh = 中文, en = 英文
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
_pages/about.html    关于我(作品集 + 经历)
_pages/archive.html  归档
_posts/              所有文章
_layouts/            页面模板
_includes/           头部/底部等片段
assets/css/main.css  样式
assets/js/main.js    语言切换 + 文章筛选
```

## 本地预览 / Local preview (可选)

```bash
bundle install
bundle exec jekyll serve
# 打开 http://localhost:4000
```

不预览也没关系 —— GitHub Pages 会在服务端自动构建。
