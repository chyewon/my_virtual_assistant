interface CounterEntry {
    count: number;
    resetAt: number;
}

interface LimitResult {
    allowed: boolean;
    retryAfterSeconds: number;
    remaining: number;
}

const counterStore = new Map<string, CounterEntry>();
const MAX_KEYS = 5000;

function cleanupStore(now: number) {
    if (counterStore.size < MAX_KEYS) {
        return;
    }

    for (const [key, entry] of counterStore.entries()) {
        if (entry.resetAt <= now) {
            counterStore.delete(key);
        }
    }
}

function checkCounter(key: string, max: number, windowMs: number): LimitResult {
    const now = Date.now();
    cleanupStore(now);

    const existing = counterStore.get(key);
    if (!existing || existing.resetAt <= now) {
        counterStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000), remaining: Math.max(0, max - 1) };
    }

    if (existing.count >= max) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
            remaining: 0,
        };
    }

    existing.count += 1;
    return {
        allowed: true,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        remaining: Math.max(0, max - existing.count),
    };
}

export interface UserQuotaConfig {
    perMinute: number;
    perDay: number;
}

export function enforceUserQuota(userKey: string, action: string, config: UserQuotaConfig): LimitResult {
    const minuteKey = `min:${action}:${userKey}`;
    const dayKey = `day:${action}:${userKey}`;

    const minute = checkCounter(minuteKey, config.perMinute, 60 * 1000);
    if (!minute.allowed) {
        return minute;
    }

    const day = checkCounter(dayKey, config.perDay, 24 * 60 * 60 * 1000);
    if (!day.allowed) {
        return day;
    }

    return {
        allowed: true,
        retryAfterSeconds: Math.max(minute.retryAfterSeconds, day.retryAfterSeconds),
        remaining: Math.min(minute.remaining, day.remaining),
    };
}
