---
layout: post
title: "你好，世界"
subtitle: "新博客上线了"
date: 2026-07-08 06:00:00 -0400
lang: zh
home: false
tags: [随笔, 建站]
---

欢迎来到我的新博客。过去这里是一个静态的作品集页面，现在我把它重写成了一个可以持续更新的个人博客 —— 以后我会在这里记录设计、技术和生活中的一些思考。

## 为什么要重做

原来的页面是几年前用纯 HTML 手写的，加一篇新内容要手动改一大堆代码，很不方便。现在改用 [Jekyll](https://jekyllrb.com/) + GitHub Pages，写文章只需要新建一个 Markdown 文件，push 上去就会自动发布。

## 怎么写新文章

在 `_posts/` 目录下新建一个文件，命名格式为 `年-月-日-标题.md`，文件开头写上这样一段配置（叫 front matter）：

```yaml
---
layout: post
title: "文章标题"
subtitle: "副标题（可选）"
date: 2026-07-08 10:00:00 -0400
lang: zh        # zh 中文 / en 英文
tags: [标签一, 标签二]
---
```

下面就可以用 Markdown 正常写正文了：

- 支持**加粗**、*斜体*、[链接](https://shil630.github.io)
- 支持代码块、引用、表格、图片
- 图片放在 `assets/images/` 里，用 `![说明](/assets/images/文件名.jpg)` 引用

> 就这么简单。写完 `git push`，一两分钟后文章就在线了。

## 草稿箱

还没写完的文章，先放进 `_drafts/` 目录。文件名不需要日期前缀，例如 `_drafts/my-next-post.md`。草稿**不会**被部署到线上。

本地预览草稿：

```bash
bundle exec jekyll serve --draft
```

然后打开导航栏的「草稿箱」页面查看。觉得可以发了，把文件移到 `_posts/` 并按 `年-月-日-标题.md` 重命名即可。

接下来慢慢把这里填满吧。
