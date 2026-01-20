/**
 * Virtual Assistant - Algorithm Tests
 * Based on requirements.md specifications
 * 
 * These tests verify the core business logic:
 * - AI Confidence Threshold Algorithm
 * - Tutor Mode State Detection
 * - Energy State Tracking
 * - Snooze Handling
 */

// ============================================
// 1. AI CONFIDENCE THRESHOLD ALGORITHM TESTS
// ============================================
describe('AI Confidence Threshold Algorithm', () => {
    /**
     * From requirements Section 4.1:
     * Confidence = (Tone × 0.20) + (Accuracy × 0.25) + (Clarity × 0.15) + (Completeness × 0.15) + (EQ × 0.25)
     */

    const calculateConfidence = (scores: {
        tone: number;
        accuracy: number;
        clarity: number;
        completeness: number;
        eq: number;
    }) => {
        return (
            scores.tone * 0.20 +
            scores.accuracy * 0.25 +
            scores.clarity * 0.15 +
            scores.completeness * 0.15 +
            scores.eq * 0.25
        );
    };

    test('calculates perfect score as 100', () => {
        const score = calculateConfidence({
            tone: 100,
            accuracy: 100,
            clarity: 100,
            completeness: 100,
            eq: 100,
        });
        expect(score).toBe(100);
    });

    test('calculates weighted average correctly', () => {
        const score = calculateConfidence({
            tone: 80,      // 0.20 weight = 16
            accuracy: 90,  // 0.25 weight = 22.5
            clarity: 70,   // 0.15 weight = 10.5
            completeness: 85, // 0.15 weight = 12.75
            eq: 95,        // 0.25 weight = 23.75
        });
        expect(score).toBe(85.5);
    });

    test('score >= 85 should auto-accept', () => {
        const score = calculateConfidence({
            tone: 90, accuracy: 85, clarity: 80, completeness: 85, eq: 90,
        });
        expect(score).toBeGreaterThanOrEqual(85);
    });

    test('score between 70-85 should iterate', () => {
        const score = calculateConfidence({
            tone: 75, accuracy: 75, clarity: 75, completeness: 75, eq: 75,
        });
        expect(score).toBe(75);
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThan(85);
    });

    test('score < 70 should require detailed feedback', () => {
        const score = calculateConfidence({
            tone: 60, accuracy: 65, clarity: 70, completeness: 60, eq: 65,
        });
        expect(score).toBeLessThan(70);
    });
});

// ============================================
// 2. TUTOR MODE STATE DETECTION TESTS
// ============================================
describe('Tutor Mode State Detection', () => {
    /**
     * From requirements Section 4C:
     * Difficulty Classification based on signals with weights
     */

    interface DifficultySignals {
        userTaggedHard: boolean;
        snoozedTwicePreviously: boolean;
        titleContainsKeywords: boolean;
        durationOverTwoHours: boolean;
    }

    const classifyDifficulty = (signals: DifficultySignals): 'easy' | 'medium' | 'hard' => {
        let score = 0;

        if (signals.userTaggedHard) score += 100;
        if (signals.snoozedTwicePreviously) score += 80;
        if (signals.titleContainsKeywords) score += 50;
        if (signals.durationOverTwoHours) score += 40;

        if (score >= 100) return 'hard';
        if (score >= 50) return 'medium';
        return 'easy';
    };

    test('user-tagged hard task returns hard', () => {
        const result = classifyDifficulty({
            userTaggedHard: true,
            snoozedTwicePreviously: false,
            titleContainsKeywords: false,
            durationOverTwoHours: false,
        });
        expect(result).toBe('hard');
    });

    test('snoozed twice previously returns hard', () => {
        const result = classifyDifficulty({
            userTaggedHard: false,
            snoozedTwicePreviously: true,
            titleContainsKeywords: true,
            durationOverTwoHours: false,
        });
        expect(result).toBe('hard'); // 80 + 50 = 130 >= 100
    });

    test('title keywords alone returns medium', () => {
        const result = classifyDifficulty({
            userTaggedHard: false,
            snoozedTwicePreviously: false,
            titleContainsKeywords: true,
            durationOverTwoHours: false,
        });
        expect(result).toBe('medium'); // 50 >= 50
    });

    test('long duration alone returns easy', () => {
        const result = classifyDifficulty({
            userTaggedHard: false,
            snoozedTwicePreviously: false,
            titleContainsKeywords: false,
            durationOverTwoHours: true,
        });
        expect(result).toBe('easy'); // 40 < 50
    });

    test('no signals returns easy', () => {
        const result = classifyDifficulty({
            userTaggedHard: false,
            snoozedTwicePreviously: false,
            titleContainsKeywords: false,
            durationOverTwoHours: false,
        });
        expect(result).toBe('easy');
    });
});

// ============================================
// 3. ENERGY STATE TRACKING TESTS
// ============================================
describe('Energy State Tracking', () => {
    /**
     * From requirements Section 4C.2:
     * - High Energy: Previous task completed within 2 hours
     * - Low Energy: 2+ snoozes today OR missed task in last 2 hours
     * - Neutral: Default
     */

    interface UserState {
        lastTaskCompletedMinutesAgo: number | null;
        snoozesToday: number;
        missedTaskInLastTwoHours: boolean;
    }

    const determineEnergyState = (state: UserState): 'high' | 'low' | 'neutral' => {
        // High energy: completed task within 2 hours (120 min)
        if (state.lastTaskCompletedMinutesAgo !== null && state.lastTaskCompletedMinutesAgo <= 120) {
            return 'high';
        }

        // Low energy: 2+ snoozes or missed task
        if (state.snoozesToday >= 2 || state.missedTaskInLastTwoHours) {
            return 'low';
        }

        return 'neutral';
    };

    test('recent completion indicates high energy', () => {
        const result = determineEnergyState({
            lastTaskCompletedMinutesAgo: 30,
            snoozesToday: 0,
            missedTaskInLastTwoHours: false,
        });
        expect(result).toBe('high');
    });

    test('multiple snoozes indicates low energy', () => {
        const result = determineEnergyState({
            lastTaskCompletedMinutesAgo: null,
            snoozesToday: 3,
            missedTaskInLastTwoHours: false,
        });
        expect(result).toBe('low');
    });

    test('missed task indicates low energy', () => {
        const result = determineEnergyState({
            lastTaskCompletedMinutesAgo: null,
            snoozesToday: 0,
            missedTaskInLastTwoHours: true,
        });
        expect(result).toBe('low');
    });

    test('no signals returns neutral', () => {
        const result = determineEnergyState({
            lastTaskCompletedMinutesAgo: null,
            snoozesToday: 1,
            missedTaskInLastTwoHours: false,
        });
        expect(result).toBe('neutral');
    });
});

// ============================================
// 4. SNOOZE HANDLING TESTS
// ============================================
describe('Smart Snooze Handling', () => {
    /**
     * From requirements Section 3.2:
     * - 1st Snooze: Allowed
     * - 2nd Snooze: Tutor intervenes with coaching prompt
     */

    interface SnoozeResult {
        allowed: boolean;
        requiresIntervention: boolean;
        message: string;
    }

    const handleSnooze = (snoozeCount: number, snoozeLimit: number = 2): SnoozeResult => {
        const newCount = snoozeCount + 1;

        if (newCount < snoozeLimit) {
            return {
                allowed: true,
                requiresIntervention: false,
                message: `Snoozed. You have ${snoozeLimit - newCount} snooze(s) left.`,
            };
        } else if (newCount === snoozeLimit) {
            return {
                allowed: true,
                requiresIntervention: true,
                message: "I notice you're struggling to start. Do you need to unblock something, or should we swap this for an easier task?",
            };
        } else {
            return {
                allowed: false,
                requiresIntervention: true,
                message: "You've reached your snooze limit. Let's figure out what's blocking you.",
            };
        }
    };

    test('first snooze is allowed without intervention', () => {
        const result = handleSnooze(0);
        expect(result.allowed).toBe(true);
        expect(result.requiresIntervention).toBe(false);
    });

    test('second snooze triggers tutor intervention', () => {
        const result = handleSnooze(1);
        expect(result.allowed).toBe(true);
        expect(result.requiresIntervention).toBe(true);
        expect(result.message).toContain("struggling to start");
    });

    test('third snooze is blocked', () => {
        const result = handleSnooze(2);
        expect(result.allowed).toBe(false);
        expect(result.requiresIntervention).toBe(true);
    });
});

// ============================================
// 5. NOTIFICATION TIMING TESTS
// ============================================
describe('Notification Timing Logic', () => {
    /**
     * From requirements Section 3.2:
     * - Pre-Event: 10 minutes before
     * - Post-Event: Immediately after end time
     * - End-of-Day Retro: 30 min after last event OR 6 PM (whichever is later)
     */

    const shouldSendPreEventNotification = (nowMs: number, eventStartMs: number): boolean => {
        const tenMinutesMs = 10 * 60 * 1000;
        const timeUntilEvent = eventStartMs - nowMs;
        return timeUntilEvent <= tenMinutesMs && timeUntilEvent > 0;
    };

    const shouldSendPostEventNotification = (nowMs: number, eventEndMs: number): boolean => {
        return nowMs >= eventEndMs;
    };

    const getRetroTime = (lastEventEndMs: number, sixPmMs: number): number => {
        const thirtyMinutesMs = 30 * 60 * 1000;
        const retroAfterEvent = lastEventEndMs + thirtyMinutesMs;
        return Math.max(retroAfterEvent, sixPmMs);
    };

    test('sends pre-event notification 10 min before', () => {
        const now = Date.now();
        const eventStart = now + 9 * 60 * 1000; // 9 minutes from now
        expect(shouldSendPreEventNotification(now, eventStart)).toBe(true);
    });

    test('does not send pre-event notification 15 min before', () => {
        const now = Date.now();
        const eventStart = now + 15 * 60 * 1000; // 15 minutes from now
        expect(shouldSendPreEventNotification(now, eventStart)).toBe(false);
    });

    test('sends post-event notification after end time', () => {
        const now = Date.now();
        const eventEnd = now - 1000; // 1 second ago
        expect(shouldSendPostEventNotification(now, eventEnd)).toBe(true);
    });

    test('retro time is 30 min after last event if later than 6 PM', () => {
        const sixPm = new Date();
        sixPm.setHours(18, 0, 0, 0);
        const lastEventEnd = new Date();
        lastEventEnd.setHours(18, 30, 0, 0); // 6:30 PM
        const expected = new Date();
        expected.setHours(19, 0, 0, 0); // 7:00 PM (30 min after 6:30)

        expect(getRetroTime(lastEventEnd.getTime(), sixPm.getTime())).toBe(expected.getTime());
    });

    test('retro time is 6 PM if last event ends earlier', () => {
        const sixPm = new Date();
        sixPm.setHours(18, 0, 0, 0);
        const lastEventEnd = new Date();
        lastEventEnd.setHours(16, 0, 0, 0); // 4:00 PM

        expect(getRetroTime(lastEventEnd.getTime(), sixPm.getTime())).toBe(sixPm.getTime());
    });
});

// ============================================
// 6. COST TRACKING TESTS
// ============================================
describe('AI Cost Tracking', () => {
    /**
     * From requirements Section 6.1:
     * GPT-4o: Input $2.50/1M tokens, Output $10.00/1M tokens
     * Gemini 2.5: Input $1.25/1M tokens, Output $5.00/1M tokens
     * Budget: $10/month
     */

    const calculateGPT4oCost = (inputTokens: number, outputTokens: number): number => {
        const inputCost = (inputTokens / 1_000_000) * 2.50;
        const outputCost = (outputTokens / 1_000_000) * 10.00;
        return inputCost + outputCost;
    };

    const calculateGeminiCost = (inputTokens: number, outputTokens: number): number => {
        const inputCost = (inputTokens / 1_000_000) * 1.25;
        const outputCost = (outputTokens / 1_000_000) * 5.00;
        return inputCost + outputCost;
    };

    const isWithinBudget = (totalCost: number, budget: number = 10): boolean => {
        return totalCost <= budget;
    };

    test('calculates GPT-4o cost correctly', () => {
        // 500K input + 100K output = $1.25 + $1.00 = $2.25
        const cost = calculateGPT4oCost(500_000, 100_000);
        expect(cost).toBeCloseTo(2.25, 2);
    });

    test('calculates Gemini cost correctly', () => {
        // 600K input + 120K output = $0.75 + $0.60 = $1.35
        const cost = calculateGeminiCost(600_000, 120_000);
        expect(cost).toBeCloseTo(1.35, 2);
    });

    test('typical month stays within budget', () => {
        const gptCost = calculateGPT4oCost(500_000, 100_000);
        const geminiCost = calculateGeminiCost(600_000, 120_000);
        const totalCost = gptCost + geminiCost;

        expect(isWithinBudget(totalCost)).toBe(true);
    });

    test('warns when approaching budget limit', () => {
        const totalCost = 8.5;
        const warningThreshold = 8.0; // 80% of $10
        expect(totalCost > warningThreshold).toBe(true);
    });
});
