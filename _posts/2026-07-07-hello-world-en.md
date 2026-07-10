---
layout: post
title: "Hello, World"
subtitle: "A new blog begins"
date: 2026-07-07 10:00:00 -0400
lang: en
home: false
tags: [meta, notes]
---

Welcome to my new blog. What used to live here was a static portfolio page — I've rewritten it into a personal blog I can actually keep updating. From now on I'll write here about design, technology, and whatever else is on my mind.

## Why the rebuild

The old page was hand-written plain HTML from years ago; adding anything meant editing a wall of markup. It now runs on [Jekyll](https://jekyllrb.com/) + GitHub Pages, so publishing a post is just adding a Markdown file and pushing.

## Writing a post

Create a file in `_posts/` named `YYYY-MM-DD-title.md`, starting with a small config block (front matter):

```yaml
---
layout: post
title: "Your title"
subtitle: "Optional subtitle"
date: 2026-07-07 10:00:00 -0400
lang: en        # en / zh
tags: [tag-one, tag-two]
---
```

Then just write in Markdown:

- **bold**, *italic*, [links](https://shil630.github.io)
- code blocks, blockquotes, tables, images

> That's it. Push, wait a minute, and it's live.

Use the **中 / EN** toggle in the top-right to switch the interface language, and the filter chips on the home page to show posts in a single language.
