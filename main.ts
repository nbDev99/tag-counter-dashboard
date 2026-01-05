import {
    Plugin,
    MarkdownRenderChild,
    PluginSettingTab,
    App,
    Setting,
    TFile
} from 'obsidian';

// ============================================================================
// Settings Interface
// ============================================================================

interface TagCounterSettings {
    // Tags to track (comma-separated)
    trackedTags: string;
    // Show status bar
    showStatusBar: boolean;
    // Colour scheme for tags
    tagColours: Record<string, string>;
    // Show only incomplete tasks
    countOnlyIncompleteTasks: boolean;
    // Default colours for common priorities
    urgentColour: string;
    highColour: string;
    mediumColour: string;
    lowColour: string;
}

const DEFAULT_SETTINGS: TagCounterSettings = {
    trackedTags: 'Urgent,High,Medium,Low',
    showStatusBar: true,
    countOnlyIncompleteTasks: false,
    urgentColour: '#e74c3c',
    highColour: '#e67e22',
    mediumColour: '#f1c40f',
    lowColour: '#3498db',
    tagColours: {}
};

// ============================================================================
// Tag Counter Logic
// ============================================================================

interface TagCount {
    tag: string;
    count: number;
    colour: string;
}

function countTagsInContent(
    content: string,
    trackedTags: string[],
    settings: TagCounterSettings
): TagCount[] {
    const results: TagCount[] = [];

    // Determine which lines to search
    let linesToSearch = content;

    if (settings.countOnlyIncompleteTasks) {
        // Only count tags on lines with incomplete checkboxes
        const lines = content.split('\n');
        linesToSearch = lines
            .filter(line => line.match(/^\s*-\s*\[\s*\]/))
            .join('\n');
    }

    for (const tag of trackedTags) {
        const trimmedTag = tag.trim();
        if (!trimmedTag) continue;

        // Match #Tag (case-insensitive)
        const regex = new RegExp(`#${trimmedTag}\\b`, 'gi');
        const matches = linesToSearch.match(regex);
        const count = matches ? matches.length : 0;

        // Get colour for this tag
        const colour = getTagColour(trimmedTag, settings);

        results.push({
            tag: trimmedTag,
            count,
            colour
        });
    }

    return results;
}

function getTagColour(tag: string, settings: TagCounterSettings): string {
    // Check custom colours first
    if (settings.tagColours[tag.toLowerCase()]) {
        return settings.tagColours[tag.toLowerCase()];
    }

    // Fall back to default colours based on tag name
    const tagLower = tag.toLowerCase();
    if (tagLower === 'urgent' || tagLower === 'critical') {
        return settings.urgentColour;
    } else if (tagLower === 'high' || tagLower === 'important') {
        return settings.highColour;
    } else if (tagLower === 'medium' || tagLower === 'normal') {
        return settings.mediumColour;
    } else if (tagLower === 'low' || tagLower === 'minor') {
        return settings.lowColour;
    }

    // Default colour for unknown tags
    return '#95a5a6';
}

// ============================================================================
// Dashboard Renderer
// ============================================================================

class TagDashboardRenderer extends MarkdownRenderChild {
    private plugin: TagCounterPlugin;
    private sourcePath: string;
    private options: DashboardOptions;

    constructor(
        containerEl: HTMLElement,
        plugin: TagCounterPlugin,
        sourcePath: string,
        options: DashboardOptions
    ) {
        super(containerEl);
        this.plugin = plugin;
        this.sourcePath = sourcePath;
        this.options = options;
    }

    onload() {
        void this.render();

        // Re-render when file changes
        this.registerEvent(
            this.plugin.app.vault.on('modify', (file) => {
                if (file instanceof TFile && file.path === this.sourcePath) {
                    void this.render();
                }
            })
        );
    }

    async render() {
        const container = this.containerEl;
        container.empty();
        container.addClass('tag-counter-dashboard');

        // Get the current file content
        const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
        if (!(file instanceof TFile)) {
            container.createEl('div', {
                text: 'Unable to read file',
                cls: 'tag-counter-error'
            });
            return;
        }

        const content = await this.plugin.app.vault.read(file);

        // Determine which tags to track
        const tagsToTrack = this.options.tags.length > 0
            ? this.options.tags
            : this.plugin.settings.trackedTags.split(',').map(t => t.trim());

        // Count the tags
        const tagCounts = countTagsInContent(content, tagsToTrack, this.plugin.settings);

        // Create dashboard title if specified
        if (this.options.title) {
            container.createEl('div', {
                text: this.options.title,
                cls: 'tag-counter-title'
            });
        }

        // Create the cards container
        const cardsContainer = container.createEl('div', {
            cls: 'tag-counter-cards'
        });

        // Create a card for each tag
        for (const tagCount of tagCounts) {
            const card = cardsContainer.createEl('div', {
                cls: 'tag-counter-card'
            });

            // Apply colour
            card.style.borderLeftColor = tagCount.colour;
            card.style.setProperty('--tag-colour', tagCount.colour);

            // Count number
            const countEl = card.createEl('div', {
                text: tagCount.count.toString(),
                cls: 'tag-counter-count'
            });
            countEl.style.color = tagCount.colour;

            // Tag name
            card.createEl('div', {
                text: tagCount.tag,
                cls: 'tag-counter-label'
            });
        }

        // Add total if more than one tag
        if (tagCounts.length > 1) {
            const total = tagCounts.reduce((sum, tc) => sum + tc.count, 0);
            const totalCard = cardsContainer.createEl('div', {
                cls: 'tag-counter-card tag-counter-total'
            });

            totalCard.createEl('div', {
                text: total.toString(),
                cls: 'tag-counter-count'
            });

            totalCard.createEl('div', {
                text: 'Total',
                cls: 'tag-counter-label'
            });
        }
    }
}

interface DashboardOptions {
    tags: string[];
    title: string;
}

function parseDashboardOptions(source: string): DashboardOptions {
    const options: DashboardOptions = {
        tags: [],
        title: ''
    };

    const lines = source.trim().split('\n');
    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        if (key.trim().toLowerCase() === 'tags') {
            options.tags = value.split(',').map(t => t.trim()).filter(t => t);
        } else if (key.trim().toLowerCase() === 'title') {
            options.title = value;
        }
    }

    return options;
}

// ============================================================================
// Status Bar
// ============================================================================

class StatusBarManager {
    private plugin: TagCounterPlugin;
    private statusBarEl: HTMLElement | null = null;

    constructor(plugin: TagCounterPlugin) {
        this.plugin = plugin;
    }

    enable() {
        if (this.statusBarEl) return;

        this.statusBarEl = this.plugin.addStatusBarItem();
        this.statusBarEl.addClass('tag-counter-status-bar');
        void this.update();

        // Update on file change
        this.plugin.registerEvent(
            this.plugin.app.workspace.on('active-leaf-change', () => {
                void this.update();
            })
        );

        this.plugin.registerEvent(
            this.plugin.app.vault.on('modify', (file) => {
                const activeFile = this.plugin.app.workspace.getActiveFile();
                if (activeFile && file.path === activeFile.path) {
                    void this.update();
                }
            })
        );
    }

    async update() {
        if (!this.statusBarEl) return;

        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (!activeFile) {
            this.statusBarEl.empty();
            return;
        }

        const content = await this.plugin.app.vault.read(activeFile);
        const tagsToTrack = this.plugin.settings.trackedTags.split(',').map(t => t.trim());
        const tagCounts = countTagsInContent(content, tagsToTrack, this.plugin.settings);

        this.statusBarEl.empty();

        for (const tc of tagCounts) {
            if (tc.count === 0) continue;

            const badge = this.statusBarEl.createEl('span', {
                cls: 'tag-counter-status-badge'
            });
            badge.style.backgroundColor = tc.colour;
            badge.createEl('span', { text: `${tc.count} ${tc.tag}` });
        }
    }

    disable() {
        if (this.statusBarEl) {
            this.statusBarEl.remove();
            this.statusBarEl = null;
        }
    }
}

// ============================================================================
// Settings Tab
// ============================================================================

class TagCounterSettingTab extends PluginSettingTab {
    plugin: TagCounterPlugin;

    constructor(app: App, plugin: TagCounterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Tracked Tags
        new Setting(containerEl)
            .setName('Tracked tags')
            .setDesc('Comma-separated list of tags to track (without the # symbol)')
            .addText(text => text
                .setPlaceholder('urgent, medium, low')
                .setValue(this.plugin.settings.trackedTags)
                .onChange(async (value) => {
                    this.plugin.settings.trackedTags = value;
                    await this.plugin.saveSettings();
                }));

        // Count only incomplete tasks
        new Setting(containerEl)
            .setName('Count only incomplete tasks')
            .setDesc('Only count tags on lines with unchecked checkboxes (- [ ])')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.countOnlyIncompleteTasks)
                .onChange(async (value) => {
                    this.plugin.settings.countOnlyIncompleteTasks = value;
                    await this.plugin.saveSettings();
                }));

        // Status Bar
        new Setting(containerEl)
            .setName('Show status bar')
            .setDesc('Display tag counts in the status bar at the bottom')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showStatusBar)
                .onChange(async (value) => {
                    this.plugin.settings.showStatusBar = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.plugin.statusBar.enable();
                    } else {
                        this.plugin.statusBar.disable();
                    }
                }));

        new Setting(containerEl)
            .setName('Tag colours')
            .setHeading();

        // Urgent colour
        new Setting(containerEl)
            .setName('Urgent/critical colour')
            .addColorPicker(picker => picker
                .setValue(this.plugin.settings.urgentColour)
                .onChange(async (value) => {
                    this.plugin.settings.urgentColour = value;
                    await this.plugin.saveSettings();
                }));

        // High colour
        new Setting(containerEl)
            .setName('High/important colour')
            .addColorPicker(picker => picker
                .setValue(this.plugin.settings.highColour)
                .onChange(async (value) => {
                    this.plugin.settings.highColour = value;
                    await this.plugin.saveSettings();
                }));

        // Medium colour
        new Setting(containerEl)
            .setName('Medium/normal colour')
            .addColorPicker(picker => picker
                .setValue(this.plugin.settings.mediumColour)
                .onChange(async (value) => {
                    this.plugin.settings.mediumColour = value;
                    await this.plugin.saveSettings();
                }));

        // Low colour
        new Setting(containerEl)
            .setName('Low/minor colour')
            .addColorPicker(picker => picker
                .setValue(this.plugin.settings.lowColour)
                .onChange(async (value) => {
                    this.plugin.settings.lowColour = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Usage')
            .setHeading();

        const usageEl = containerEl.createEl('div', { cls: 'tag-counter-usage' });
        usageEl.createEl('p', {
            text: 'Add a dashboard to any note by inserting a code block:'
        });

        const codeExample = usageEl.createEl('pre');
        codeExample.createEl('code', {
            text: '```tag-counter\ntitle: My Tasks\ntags: Urgent,High,Medium,Low\n```'
        });

        usageEl.createEl('p', {
            text: 'Options are optional. Without them, it uses your default tracked tags.'
        });

        // Support Section
        new Setting(containerEl)
            .setName('Support this plugin')
            .setHeading();

        const supportEl = containerEl.createEl('div', { cls: 'tag-counter-support' });

        supportEl.createEl('p', {
            text: 'If this plugin has helped you stay organised or saved you time, consider buying me a coffee! Your support helps me maintain this plugin and build more useful tools.'
        });

        const coffeeLink = supportEl.createEl('a', {
            href: 'https://buymeacoffee.com/maframpton',
            cls: 'tag-counter-coffee-link'
        });
        coffeeLink.setAttr('target', '_blank');

        const coffeeImg = coffeeLink.createEl('img', {
            cls: 'tag-counter-coffee-button'
        });
        coffeeImg.setAttr('src', 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png');
        coffeeImg.setAttr('alt', 'Buy Me A Coffee');
        coffeeImg.setAttr('height', '50');

        supportEl.createEl('p', {
            text: 'Thank you for your support!',
            cls: 'tag-counter-thanks'
        });
    }
}

// ============================================================================
// Main Plugin
// ============================================================================

export default class TagCounterPlugin extends Plugin {
    settings: TagCounterSettings;
    statusBar: StatusBarManager;

    async onload() {
        console.debug('Loading Tag Counter Dashboard plugin');

        await this.loadSettings();

        // Initialise status bar manager
        this.statusBar = new StatusBarManager(this);
        if (this.settings.showStatusBar) {
            this.statusBar.enable();
        }

        // Register the code block processor for ```tag-counter```
        this.registerMarkdownCodeBlockProcessor(
            'tag-counter',
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

        // Add command to insert dashboard
        this.addCommand({
            id: 'insert-tag-counter',
            name: 'Insert dashboard',
            editorCallback: (editor) => {
                const dashboardBlock = '```tag-counter\ntitle: Task Overview\n```\n';
                editor.replaceSelection(dashboardBlock);
            }
        });

        // Add settings tab
        this.addSettingTab(new TagCounterSettingTab(this.app, this));
    }

    onunload() {
        console.debug('Unloading Tag Counter Dashboard plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
