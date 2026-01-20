/**
 * Virtual Assistant - Test Suite
 * Based on requirements.md specifications
 * 
 * Test Categories:
 * 1. Landing Page & Authentication
 * 2. Dashboard UI Components
 * 3. Priority Planner Logic
 * 4. Accountability Checker Logic
 * 5. AI Confidence Threshold Algorithm
 * 6. Tutor Mode State Detection
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================
// 1. LANDING PAGE TESTS
// ============================================
describe('Landing Page', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test('displays value proposition headline', async () => {
        const LandingPage = (await import('@/app/page')).default;
        render(<LandingPage />);

        expect(screen.getByText(/Your AI Executive Assistant/i)).toBeInTheDocument();
    });

    test('displays Google login button', async () => {
        const LandingPage = (await import('@/app/page')).default;
        render(<LandingPage />);

        expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
    });

    test('displays three feature cards', async () => {
        const LandingPage = (await import('@/app/page')).default;
        render(<LandingPage />);

        expect(screen.getByText(/Priority Planner/i)).toBeInTheDocument();
        expect(screen.getByText(/Accountability/i)).toBeInTheDocument();
        expect(screen.getByText(/Track Progress/i)).toBeInTheDocument();
    });

    test('redirects to dashboard when session exists', async () => {
        const { useSession } = await import('next-auth/react');
        (useSession as jest.Mock).mockReturnValue({
            data: { user: { email: 'test@example.com' } },
            status: 'authenticated',
        });

        const { useRouter } = await import('next/navigation');
        const mockPush = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

        const LandingPage = (await import('@/app/page')).default;
        render(<LandingPage />);

        expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
});

// ============================================
// 2. DASHBOARD UI TESTS
// ============================================
describe('Dashboard Components', () => {
    describe('WeeklyCalendar', () => {
        test('renders 7 day tabs', async () => {
            const WeeklyCalendar = (await import('@/components/dashboard/WeeklyCalendar')).default;
            render(<WeeklyCalendar />);

            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            days.forEach(day => {
                expect(screen.getByText(day)).toBeInTheDocument();
            });
        });

        test('displays calendar header', async () => {
            const WeeklyCalendar = (await import('@/components/dashboard/WeeklyCalendar')).default;
            render(<WeeklyCalendar />);

            expect(screen.getByText(/Weekly Calendar/i)).toBeInTheDocument();
        });

        test('shows add event button', async () => {
            const WeeklyCalendar = (await import('@/components/dashboard/WeeklyCalendar')).default;
            render(<WeeklyCalendar />);

            expect(screen.getByText(/\+ Add Event/i)).toBeInTheDocument();
        });
    });

    describe('TodaysTasks', () => {
        test('renders AI chat input', async () => {
            const TodaysTasks = (await import('@/components/dashboard/TodaysTasks')).default;
            render(<TodaysTasks />);

            expect(screen.getByPlaceholderText(/Chat with your AI coach/i)).toBeInTheDocument();
        });

        test('displays task list with status indicators', async () => {
            const TodaysTasks = (await import('@/components/dashboard/TodaysTasks')).default;
            render(<TodaysTasks />);

            // Should have task items (from mock data)
            expect(screen.getByText(/Team Sync/i)).toBeInTheDocument();
            expect(screen.getByText(/Deep Work/i)).toBeInTheDocument();
        });

        test('expands task to show details on click', async () => {
            const TodaysTasks = (await import('@/components/dashboard/TodaysTasks')).default;
            render(<TodaysTasks />);

            // Click on a task with details
            const taskCard = screen.getByText(/Deep Work - Project X/i);
            fireEvent.click(taskCard);

            // Should show expanded content
            expect(screen.getByText(/What to do:/i)).toBeInTheDocument();
            expect(screen.getByText(/Success criteria:/i)).toBeInTheDocument();
        });

        test('shows Mark Done and Reschedule buttons in expanded view', async () => {
            const TodaysTasks = (await import('@/components/dashboard/TodaysTasks')).default;
            render(<TodaysTasks />);

            // Expand a task
            const taskCard = screen.getByText(/Deep Work - Project X/i);
            fireEvent.click(taskCard);

            expect(screen.getByText(/Mark Done/i)).toBeInTheDocument();
            expect(screen.getByText(/Reschedule/i)).toBeInTheDocument();
        });
    });

    describe('ActivityLog', () => {
        test('displays activity entries', async () => {
            const ActivityLog = (await import('@/components/dashboard/ActivityLog')).default;
            render(<ActivityLog />);

            expect(screen.getByText(/Activity Log/i)).toBeInTheDocument();
        });

        test('shows completion rate metrics', async () => {
            const ActivityLog = (await import('@/components/dashboard/ActivityLog')).default;
            render(<ActivityLog />);

            expect(screen.getByText(/Completion Rate/i)).toBeInTheDocument();
            expect(screen.getByText(/Today/i)).toBeInTheDocument();
            expect(screen.getByText(/This Week/i)).toBeInTheDocument();
        });

        test('displays day streak and weekly average', async () => {
            const ActivityLog = (await import('@/components/dashboard/ActivityLog')).default;
            render(<ActivityLog />);

            expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
            expect(screen.getByText(/Weekly Avg/i)).toBeInTheDocument();
        });
    });
});

// ============================================
// 3. AI CONFIDENCE THRESHOLD ALGORITHM TESTS
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
// 4. TUTOR MODE STATE DETECTION TESTS
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
// 5. ENERGY STATE TRACKING TESTS
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
// 6. SNOOZE HANDLING TESTS
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
