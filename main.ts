import { Plugin, WorkspaceLeaf, addIcon, ItemView } from "obsidian";

export default class TaskSchedulePlugin extends Plugin {
    scheduleView: ScheduleView | null = null;

    async onload() {
        console.log("TaskSchedulePlugin: onload");

        this.addCommand({
            id: "toggle-schedule",
            name: "Toggle Task Schedule",
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return;
                const content = await this.app.vault.read(activeFile);
                const tasks = content.split("\n").filter((line) => line.startsWith("- [ ]"));

                const leaves = this.app.workspace.getLeavesOfType("task-schedule");

                if (leaves.length > 0) {
                    // 既に開かれているビューがある場合、閉じる
                    this.app.workspace.detachLeavesOfType("task-schedule");
                } else {
                    // 新しくビューを開く
                    const leaf = this.app.workspace.getRightLeaf(false);
                    await leaf.setViewState({ type: "task-schedule" });
                    this.app.workspace.revealLeaf(leaf);

                    // Viewの登録
                    if (!this.scheduleView) {
                        this.scheduleView = new ScheduleView(leaf, tasks);
                        this.registerView("task-schedule", () => this.scheduleView!);
                        this.registerEvent(
                            this.app.vault.on("modify", (file) => {
                                if (file === activeFile && this.scheduleView) {
                                    this.scheduleView.update();
                                }
                            })
                        );
                    }

                }
            },
        });
    }

    onunload() {
        console.log("TaskSchedulePlugin: onunload");
    }
}

// Viewの型を定義
interface ScheduleView extends ItemView {
    containerEl: HTMLDivElement;
    update(): Promise<void>;
}

// ビューを定義
class ScheduleView extends ItemView {
    tasks: string[];

    constructor(leaf: WorkspaceLeaf, tasks: string[]) {
        super(leaf);
        this.tasks = tasks;
    }

    getViewType(): string {
        return "task-schedule";
    }

    getDisplayText(): string {
        return "Task Schedule";
    }

    async onOpen(): Promise<void> {
        await this.update();
    }

    async onClose(): Promise<void> {
        // 特に何もしない
    }

    async update(): Promise<void> {
        const { contentEl } = this;
        contentEl.innerHTML = '';

        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const content = await this.app.vault.read(activeFile);
        const tasks = content.split("\n").filter((line) => line.startsWith("- [ ]"));

        let currentTime = new Date();
        let scheduleTable = "<table><tr><th>tasks</th><th>estimate</th><th>end</th></tr>";

        for (let task of tasks) {
            let [taskName, timeEstimate] = task.split(":");
            taskName = taskName.replace(/^-\s\[.\]\s/, '').replace(/\[\[|\]\]/g, '').trim();
            let minutes = parseInt(timeEstimate);
            let endTime = new Date(currentTime.getTime() + minutes * 60000);
            let endTimeStr = endTime.getHours().toString().padStart(2, "0") + ":" + endTime.getMinutes().toString().padStart(2, "0");
            scheduleTable += `<tr><td>${taskName}</td><td>${timeEstimate}m</td><td>${endTimeStr}</td></tr>`;
            currentTime = endTime;
        }

        scheduleTable += "</table>";
        const tableDiv = contentEl.createDiv();
        tableDiv.innerHTML = scheduleTable;
    }
}
