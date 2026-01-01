/**
 * TidyFeed Scoring Engine
 * 
 * Computes spam scores for tweets based on configurable rules.
 * Actions are limited to NORMAL or COLLAPSE (no HIDE).
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ScoringRule {
    rule_id: string;
    name: string;
    category: string;
    pattern: string;
    flags?: string;  // regex flags, default "i"
    score: number;
    severity?: 'strong' | 'medium' | 'weak';
    enabled?: boolean;  // default true
    requires_any?: string[];  // rule_ids - at least one must also match
    requires_all?: string[];  // rule_ids - all must also match
    override_collapse?: boolean;  // force collapse even if below threshold
    // Internal: compiled regex (not serialized)
    _compiled?: RegExp;
}

export interface ScoringConfig {
    version: 2;
    thresholds: {
        collapse: number;  // score >= this triggers COLLAPSE
    };
    category_weights?: Record<string, number>;  // e.g. { "crypto_scam": 1.2 }
    max_score?: number;  // cap to prevent score explosion, default 200
    rules: ScoringRule[];
    negative_rules?: ScoringRule[];  // subtract from score
    whitelist?: {
        author_handles?: string[];  // force NORMAL for these authors
    };
}

export interface TweetContext {
    text: string;
    authorHandle?: string;
    authorId?: string;
    isRetweet?: boolean;
    isReply?: boolean;
    sourceFeedType?: 'home' | 'for_you' | 'following' | 'search' | 'profile';
}

export interface RuleMatch {
    rule_id: string;
    name: string;
    score: number;
    matchedText?: string;
}

export type ActionType = 'NORMAL' | 'COLLAPSE';

export interface ScoreResult {
    score: number;
    action: ActionType;
    matchedRules: RuleMatch[];
    negativeRules: RuleMatch[];
    overrideApplied: boolean;
    whitelisted: boolean;
    debugSummary: string;
}

// ============================================================================
// Legacy Config (v1 - simple string array)
// ============================================================================

export type LegacyConfig = string[];

export function isLegacyConfig(config: unknown): config is LegacyConfig {
    return Array.isArray(config) && (config.length === 0 || typeof config[0] === 'string');
}

/**
 * Convert legacy v1 config (string array) to v2 format
 */
export function migrateLegacyConfig(patterns: string[]): ScoringConfig {
    return {
        version: 2,
        thresholds: { collapse: 50 },
        rules: patterns.map((pattern, idx) => ({
            rule_id: `legacy_${idx}`,
            name: `Legacy Pattern ${idx + 1}`,
            category: 'legacy',
            pattern,
            score: 60,  // High enough to trigger collapse
            severity: 'strong' as const,
            enabled: true,
        })),
    };
}

// ============================================================================
// Scoring Engine
// ============================================================================

export class ScoringEngine {
    private config: ScoringConfig;
    private compiledRules: ScoringRule[] = [];
    private compiledNegativeRules: ScoringRule[] = [];
    private whitelistSet: Set<string> = new Set();
    private redirectSignalPattern: RegExp | null = null;

    constructor(config: ScoringConfig) {
        this.config = config;
        this.compileRules();
    }

    /**
     * Pre-compile all regex patterns for performance
     */
    private compileRules(): void {
        // Compile positive rules
        this.compiledRules = [];
        for (const rule of this.config.rules) {
            if (rule.enabled === false) continue;
            try {
                const flags = rule.flags || 'i';
                rule._compiled = new RegExp(rule.pattern, flags);
                this.compiledRules.push(rule);
            } catch (e) {
                console.warn('[TidyFeed Scoring] Invalid regex pattern:', rule.pattern, e);
            }
        }

        // Compile negative rules
        this.compiledNegativeRules = [];
        if (this.config.negative_rules) {
            for (const rule of this.config.negative_rules) {
                if (rule.enabled === false) continue;
                try {
                    const flags = rule.flags || 'i';
                    rule._compiled = new RegExp(rule.pattern, flags);
                    this.compiledNegativeRules.push(rule);
                } catch (e) {
                    console.warn('[TidyFeed Scoring] Invalid negative regex:', rule.pattern, e);
                }
            }
        }

        // Build whitelist set (lowercase for case-insensitive matching)
        this.whitelistSet.clear();
        if (this.config.whitelist?.author_handles) {
            for (const handle of this.config.whitelist.author_handles) {
                this.whitelistSet.add(handle.toLowerCase().replace('@', ''));
            }
        }

        // Pre-compile redirect signal pattern (used by negative rules)
        this.redirectSignalPattern = /t\.me|telegram|dm\s*me|link\s*(in|on)\s*bio|bit\.ly|tinyurl|cutt\.ly|discord\.gg/i;
    }

    /**
     * Check if author is whitelisted
     */
    private isWhitelisted(authorHandle?: string): boolean {
        if (!authorHandle) return false;
        return this.whitelistSet.has(authorHandle.toLowerCase().replace('@', ''));
    }

    /**
     * Test if a rule matches the text
     */
    private testRule(rule: ScoringRule, text: string): string | null {
        if (!rule._compiled) return null;
        const match = text.match(rule._compiled);
        return match ? match[0] : null;
    }

    /**
     * Check requires_any/requires_all conditions
     */
    private checkConditions(rule: ScoringRule, matchedRuleIds: Set<string>): boolean {
        // requires_any: at least one must match
        if (rule.requires_any && rule.requires_any.length > 0) {
            const anyMatch = rule.requires_any.some(id => matchedRuleIds.has(id));
            if (!anyMatch) return false;
        }

        // requires_all: all must match
        if (rule.requires_all && rule.requires_all.length > 0) {
            const allMatch = rule.requires_all.every(id => matchedRuleIds.has(id));
            if (!allMatch) return false;
        }

        return true;
    }

    /**
     * Compute score for a tweet
     */
    computeScore(context: TweetContext): ScoreResult {
        const { text, authorHandle } = context;

        // Early exit: whitelist check
        if (this.isWhitelisted(authorHandle)) {
            return {
                score: 0,
                action: 'NORMAL',
                matchedRules: [],
                negativeRules: [],
                overrideApplied: false,
                whitelisted: true,
                debugSummary: `Whitelisted author: ${authorHandle}`,
            };
        }

        // Phase 1: Find all matching rules (without conditions first)
        const rawMatches: Map<string, { rule: ScoringRule; matchedText: string }> = new Map();

        for (const rule of this.compiledRules) {
            const matchedText = this.testRule(rule, text);
            if (matchedText) {
                rawMatches.set(rule.rule_id, { rule, matchedText });
            }
        }

        // Phase 2: Apply requires_any/requires_all conditions
        const matchedRuleIds = new Set(rawMatches.keys());
        const matchedRules: RuleMatch[] = [];
        let totalScore = 0;
        let overrideApplied = false;

        for (const [ruleId, { rule, matchedText }] of rawMatches) {
            if (!this.checkConditions(rule, matchedRuleIds)) {
                continue;  // Conditions not met, skip this rule
            }

            // Apply category weight
            const weight = this.config.category_weights?.[rule.category] ?? 1.0;
            const weightedScore = Math.round(rule.score * weight);

            matchedRules.push({
                rule_id: ruleId,
                name: rule.name,
                score: weightedScore,
                matchedText,
            });

            totalScore += weightedScore;

            if (rule.override_collapse) {
                overrideApplied = true;
            }
        }

        // Phase 3: Apply negative rules (only if no redirect signals present)
        const negativeRules: RuleMatch[] = [];
        const hasRedirectSignals = this.redirectSignalPattern?.test(text) ?? false;

        if (!hasRedirectSignals) {
            for (const rule of this.compiledNegativeRules) {
                const matchedText = this.testRule(rule, text);
                if (matchedText) {
                    const weight = this.config.category_weights?.[rule.category] ?? 1.0;
                    const weightedScore = Math.round(Math.abs(rule.score) * weight);

                    negativeRules.push({
                        rule_id: rule.rule_id,
                        name: rule.name,
                        score: -weightedScore,
                        matchedText,
                    });

                    totalScore -= weightedScore;
                }
            }
        }

        // Phase 4: Apply max_score cap
        const maxScore = this.config.max_score ?? 200;
        if (totalScore > maxScore) {
            totalScore = maxScore;
        }

        // Phase 5: Ensure score doesn't go below 0
        if (totalScore < 0) {
            totalScore = 0;
        }

        // Phase 6: Determine action (only NORMAL or COLLAPSE)
        let action: ActionType = 'NORMAL';

        if (overrideApplied) {
            action = 'COLLAPSE';  // Override forces collapse
        } else if (totalScore >= this.config.thresholds.collapse) {
            action = 'COLLAPSE';
        }

        // Build debug summary
        const debugParts: string[] = [];
        if (matchedRules.length > 0) {
            debugParts.push(`+rules: ${matchedRules.map(r => `${r.name}(${r.score})`).join(', ')}`);
        }
        if (negativeRules.length > 0) {
            debugParts.push(`-rules: ${negativeRules.map(r => `${r.name}(${r.score})`).join(', ')}`);
        }
        if (hasRedirectSignals && this.compiledNegativeRules.length > 0) {
            debugParts.push('(negative rules skipped: redirect signals present)');
        }
        if (overrideApplied) {
            debugParts.push('(OVERRIDE)');
        }
        debugParts.push(`=> score=${totalScore}, threshold=${this.config.thresholds.collapse}, action=${action}`);

        return {
            score: totalScore,
            action,
            matchedRules,
            negativeRules,
            overrideApplied,
            whitelisted: false,
            debugSummary: debugParts.join(' | '),
        };
    }

    /**
     * Get threshold for external reference
     */
    getThreshold(): number {
        return this.config.thresholds.collapse;
    }

    /**
     * Get rule count for UI display
     */
    getRuleCount(): number {
        return this.compiledRules.length;
    }
}

// ============================================================================
// Singleton Instance & Initialization
// ============================================================================

let engineInstance: ScoringEngine | null = null;

/**
 * Initialize or update the scoring engine with new config
 */
export function initScoringEngine(config: ScoringConfig | LegacyConfig): ScoringEngine {
    // Handle legacy config migration
    let normalizedConfig: ScoringConfig;

    if (isLegacyConfig(config)) {
        console.log('[TidyFeed Scoring] Migrating legacy config to v2 format');
        normalizedConfig = migrateLegacyConfig(config);
    } else {
        normalizedConfig = config;
    }

    engineInstance = new ScoringEngine(normalizedConfig);
    return engineInstance;
}

/**
 * Get the current scoring engine instance
 */
export function getScoringEngine(): ScoringEngine | null {
    return engineInstance;
}

/**
 * Compute score using the global engine instance
 * Returns null if engine not initialized
 */
export function computeScore(context: TweetContext): ScoreResult | null {
    if (!engineInstance) {
        console.warn('[TidyFeed Scoring] Engine not initialized');
        return null;
    }
    return engineInstance.computeScore(context);
}
