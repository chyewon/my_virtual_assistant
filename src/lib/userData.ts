import fs from "fs";
import path from "path";

function toSafePathSegment(value: string): string {
    return Buffer.from(value).toString("base64url");
}

export interface UserDataPaths {
    priorityTasksPath: string;
    activityHistoryPath: string;
    hiddenItemsPath: string;
}

export function getUserDataPaths(userId: string): UserDataPaths {
    const userDir = path.join(process.cwd(), "src/data/users", toSafePathSegment(userId));
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    return {
        priorityTasksPath: path.join(userDir, "priority_tasks.json"),
        activityHistoryPath: path.join(userDir, "activity_history.json"),
        hiddenItemsPath: path.join(userDir, "hidden_items.json"),
    };
}
