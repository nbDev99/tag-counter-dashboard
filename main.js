/*
Tag Counter Dashboard Plugin for Obsidian
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TagCounterPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  trackedTags: "Urgent,High,Medium,Low",
  showStatusBar: true,
  countOnlyIncompleteTasks: false,
  urgentColour: "#e74c3c",
  highColour: "#e67e22",
  mediumColour: "#f1c40f",
  lowColour: "#3498db",
  tagColours: {}
};
function countTagsInContent(content, trackedTags, settings) {
  const results = [];
  let linesToSearch = content;
  if (settings.countOnlyIncompleteTasks) {
    const lines = content.split("\n");
    linesToSearch = lines.filter((line) => line.match(/^\s*-\s*\[\s*\]/)).join("\n");
  }
  for (const tag of trackedTags) {
    const trimmedTag = tag.trim();
    if (!trimmedTag)
      continue;
    const regex = new RegExp(`#${trimmedTag}\\b`, "gi");
    const matches = linesToSearch.match(regex);
    const count = matches ? matches.length : 0;
    const colour = getTagColour(trimmedTag, settings);
    results.push({
      tag: trimmedTag,
      count,
      colour
    });
  }
  return results;
}
function getTagColour(tag, settings) {
  if (settings.tagColours[tag.toLowerCase()]) {
    return settings.tagColours[tag.toLowerCase()];
  }
  const tagLower = tag.toLowerCase();
  if (tagLower === "urgent" || tagLower === "critical") {
    return settings.urgentColour;
  } else if (tagLower === "high" || tagLower === "important") {
    return settings.highColour;
  } else if (tagLower === "medium" || tagLower === "normal") {
    return settings.mediumColour;
  } else if (tagLower === "low" || tagLower === "minor") {
    return settings.lowColour;
  }
  return "#95a5a6";
}
var TagDashboardRenderer = class extends import_obsidian.MarkdownRenderChild {
  constructor(containerEl, plugin, sourcePath, options) {
    super(containerEl);
    this.plugin = plugin;
    this.sourcePath = sourcePath;
    this.options = options;
  }
  async onload() {
    await this.render();
    this.registerEvent(
      this.plugin.app.vault.on("modify", async (file) => {
        if (file instanceof import_obsidian.TFile && file.path === this.sourcePath) {
          await this.render();
        }
      })
    );
  }
  async render() {
    const container = this.containerEl;
    container.empty();
    container.addClass("tag-counter-dashboard");
    const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
    if (!(file instanceof import_obsidian.TFile)) {
      container.createEl("div", {
        text: "Unable to read file",
        cls: "tag-counter-error"
      });
      return;
    }
    const content = await this.plugin.app.vault.read(file);
    const tagsToTrack = this.options.tags.length > 0 ? this.options.tags : this.plugin.settings.trackedTags.split(",").map((t) => t.trim());
    const tagCounts = countTagsInContent(content, tagsToTrack, this.plugin.settings);
    if (this.options.title) {
      container.createEl("div", {
        text: this.options.title,
        cls: "tag-counter-title"
      });
    }
    const cardsContainer = container.createEl("div", {
      cls: "tag-counter-cards"
    });
    for (const tagCount of tagCounts) {
      const card = cardsContainer.createEl("div", {
        cls: "tag-counter-card"
      });
      card.style.borderLeftColor = tagCount.colour;
      card.style.setProperty("--tag-colour", tagCount.colour);
      const countEl = card.createEl("div", {
        text: tagCount.count.toString(),
        cls: "tag-counter-count"
      });
      countEl.style.color = tagCount.colour;
      card.createEl("div", {
        text: tagCount.tag,
        cls: "tag-counter-label"
      });
    }
    if (tagCounts.length > 1) {
      const total = tagCounts.reduce((sum, tc) => sum + tc.count, 0);
      const totalCard = cardsContainer.createEl("div", {
        cls: "tag-counter-card tag-counter-total"
      });
      totalCard.createEl("div", {
        text: total.toString(),
        cls: "tag-counter-count"
      });
      totalCard.createEl("div", {
        text: "Total",
        cls: "tag-counter-label"
      });
    }
  }
};
function parseDashboardOptions(source) {
  const options = {
    tags: [],
    title: ""
  };
  const lines = source.trim().split("\n");
  for (const line of lines) {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (key.trim().toLowerCase() === "tags") {
      options.tags = value.split(",").map((t) => t.trim()).filter((t) => t);
    } else if (key.trim().toLowerCase() === "title") {
      options.title = value;
    }
  }
  return options;
}
var StatusBarManager = class {
  constructor(plugin) {
    this.statusBarEl = null;
    this.plugin = plugin;
  }
  enable() {
    if (this.statusBarEl)
      return;
    this.statusBarEl = this.plugin.addStatusBarItem();
    this.statusBarEl.addClass("tag-counter-status-bar");
    this.update();
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.update();
      })
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("modify", (file) => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile && file.path === activeFile.path) {
          this.update();
        }
      })
    );
  }
  async update() {
    if (!this.statusBarEl)
      return;
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      this.statusBarEl.empty();
      return;
    }
    const content = await this.plugin.app.vault.read(activeFile);
    const tagsToTrack = this.plugin.settings.trackedTags.split(",").map((t) => t.trim());
    const tagCounts = countTagsInContent(content, tagsToTrack, this.plugin.settings);
    this.statusBarEl.empty();
    for (const tc of tagCounts) {
      if (tc.count === 0)
        continue;
      const badge = this.statusBarEl.createEl("span", {
        cls: "tag-counter-status-badge"
      });
      badge.style.backgroundColor = tc.colour;
      badge.createEl("span", { text: `${tc.count} ${tc.tag}` });
    }
  }
  disable() {
    if (this.statusBarEl) {
      this.statusBarEl.remove();
      this.statusBarEl = null;
    }
  }
};
var TagCounterSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Tag Counter Dashboard Settings" });
    new import_obsidian.Setting(containerEl).setName("Tracked Tags").setDesc("Comma-separated list of tags to track (without the # symbol)").addText((text) => text.setPlaceholder("Urgent,High,Medium,Low").setValue(this.plugin.settings.trackedTags).onChange(async (value) => {
      this.plugin.settings.trackedTags = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Count Only Incomplete Tasks").setDesc("Only count tags on lines with unchecked checkboxes (- [ ])").addToggle((toggle) => toggle.setValue(this.plugin.settings.countOnlyIncompleteTasks).onChange(async (value) => {
      this.plugin.settings.countOnlyIncompleteTasks = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Show Status Bar").setDesc("Display tag counts in the status bar at the bottom").addToggle((toggle) => toggle.setValue(this.plugin.settings.showStatusBar).onChange(async (value) => {
      this.plugin.settings.showStatusBar = value;
      await this.plugin.saveSettings();
      if (value) {
        this.plugin.statusBar.enable();
      } else {
        this.plugin.statusBar.disable();
      }
    }));
    containerEl.createEl("h3", { text: "Tag Colours" });
    new import_obsidian.Setting(containerEl).setName("Urgent/Critical Colour").addColorPicker((picker) => picker.setValue(this.plugin.settings.urgentColour).onChange(async (value) => {
      this.plugin.settings.urgentColour = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("High/Important Colour").addColorPicker((picker) => picker.setValue(this.plugin.settings.highColour).onChange(async (value) => {
      this.plugin.settings.highColour = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Medium/Normal Colour").addColorPicker((picker) => picker.setValue(this.plugin.settings.mediumColour).onChange(async (value) => {
      this.plugin.settings.mediumColour = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Low/Minor Colour").addColorPicker((picker) => picker.setValue(this.plugin.settings.lowColour).onChange(async (value) => {
      this.plugin.settings.lowColour = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Usage" });
    const usageEl = containerEl.createEl("div", { cls: "tag-counter-usage" });
    usageEl.createEl("p", {
      text: "Add a dashboard to any note by inserting a code block:"
    });
    const codeExample = usageEl.createEl("pre");
    codeExample.createEl("code", {
      text: "```tag-counter\ntitle: My Tasks\ntags: Urgent,High,Medium,Low\n```"
    });
    usageEl.createEl("p", {
      text: "Options are optional. Without them, it uses your default tracked tags."
    });
    containerEl.createEl("h3", { text: "Support This Plugin" });
    const supportEl = containerEl.createEl("div", { cls: "tag-counter-support" });
    supportEl.createEl("p", {
      text: "If this plugin has helped you stay organised or saved you time, consider buying me a coffee! Your support helps me maintain this plugin and build more useful tools."
    });
    const coffeeLink = supportEl.createEl("a", {
      href: "https://buymeacoffee.com/maframpton",
      cls: "tag-counter-coffee-button"
    });
    coffeeLink.createEl("span", { text: "\u2615 Buy Me a Coffee" });
    coffeeLink.setAttr("target", "_blank");
    supportEl.createEl("p", {
      text: "Thank you for your support!",
      cls: "tag-counter-thanks"
    });
  }
};
var TagCounterPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("Loading Tag Counter Dashboard plugin");
    await this.loadSettings();
    this.statusBar = new StatusBarManager(this);
    if (this.settings.showStatusBar) {
      this.statusBar.enable();
    }
    this.registerMarkdownCodeBlockProcessor(
      "tag-counter",
      (source, el, ctx) => {
        const options = parseDashboardOptions(source);
        const renderer = new TagDashboardRenderer(
          el,
          this,
          ctx.sourcePath,
          options
        );
        ctx.addChild(renderer);
      }
    );
    this.addCommand({
      id: "insert-tag-counter",
      name: "Insert Tag Counter Dashboard",
      editorCallback: (editor) => {
        const dashboardBlock = "```tag-counter\ntitle: Task Overview\n```\n";
        editor.replaceSelection(dashboardBlock);
      }
    });
    this.addSettingTab(new TagCounterSettingTab(this.app, this));
  }
  onunload() {
    console.log("Unloading Tag Counter Dashboard plugin");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
