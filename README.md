# Tag Counter Dashboard

An Obsidian plugin that embeds a **live dashboard** directly within your notes, showing counts of priority tags. Perfect for task lists using tags like `#Urgent`, `#Medium`, `#Low`.

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22tag-counter-dashboard%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

## Features

- **Embedded Dashboard** - Insert a tag counter anywhere in your notes using a simple code block
- **Live Updates** - Counts automatically refresh when you edit the file
- **Status Bar** - Optional compact view at the bottom of Obsidian
- **Configurable Tags** - Track any tags you want, not just priorities
- **Customisable Colours** - Change colours for each priority level via settings
- **Task-Only Mode** - Option to count only tags on incomplete checkboxes (`- [ ]`)

## Usage

Add a dashboard to any note by inserting a code block:

~~~markdown
```tag-counter
title: Task Overview
```
~~~

This renders as a styled dashboard with coloured boxes:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│    9     │ │    5     │ │   15     │ │   32     │ │   61     │
│  Urgent  │ │   High   │ │  Medium  │ │   Low    │ │  Total   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Options

You can customise each dashboard:

~~~markdown
```tag-counter
title: Sprint Tasks
tags: Todo,InProgress,Done,Blocked
```
~~~

| Option | Description |
|--------|-------------|
| `title` | Optional heading above the dashboard |
| `tags` | Comma-separated list of tags to count (overrides default settings) |

### Example: Task List with Dashboard

~~~markdown
# Weekly Tasks

```tag-counter
title: Task Status
```

## Monday
- [ ] Review PR for auth module #Urgent
- [ ] Update documentation #Low
- [x] Fix login bug #High

## Tuesday
- [ ] Team standup #Medium
- [ ] Deploy to staging #High
- [ ] Write unit tests #Medium
~~~

## Installation

### From Obsidian Community Plugins

1. Open **Settings** → **Community Plugins**
2. Click **Browse** and search for "Tag Counter Dashboard"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest)
2. Create a folder called `tag-counter-dashboard` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

## Configuration

Access settings via **Settings** → **Community Plugins** → **Tag Counter Dashboard** (gear icon)

| Setting | Description | Default |
|---------|-------------|---------|
| **Tracked Tags** | Comma-separated list of tags to track | Urgent,High,Medium,Low |
| **Count Only Incomplete** | Only count tags on unchecked tasks | Off |
| **Show Status Bar** | Display counts in the status bar | On |
| **Tag Colours** | Customise colours for each priority level | Red, Orange, Yellow, Blue |

## Commands

Open the command palette (`Ctrl/Cmd + P`) and search for:

| Command | Action |
|---------|--------|
| **Insert Tag Counter Dashboard** | Inserts a dashboard code block at cursor position |

## Support

If this plugin has helped you stay organised, consider supporting its development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/maframpton)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Licence

MIT Licence - see [LICENSE](LICENSE) for details.
