/**
 * Subscription Service
 * 
 * Manages plan definitions, quota checking, and usage tracking.
 * All quota enforcement is backend-only.
 */

// =============================================================================
// Plan Definitions
// =============================================================================

export type PlanType = 'free' | 'pro' | 'ultra';
export type FeatureType = 'collection' | 'ai_summary' | 'storage';

export interface PlanLimits {
    collectionPerMonth: number;
    storageBytes: number;
    aiSummaryPerMonth: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    free: {
        collectionPerMonth: 100,
        storageBytes: 500 * 1024 * 1024,      // 500 MB
        aiSummaryPerMonth: 5,
    },
    pro: {
        collectionPerMonth: Infinity,
        storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
        aiSummaryPerMonth: 500,
    },
    ultra: {
        collectionPerMonth: Infinity,
        storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
        aiSummaryPerMonth: 2000,
    },
};

export interface UserPlanInfo {
    plan: PlanType;
    limits: PlanLimits;
    expiresAt: string | null;
}

export interface QuotaCheckResult {
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    feature: FeatureType;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get current billing period in YYYY-MM format
 */
export function getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Validate plan type
 */
export function isValidPlan(plan: string | null | undefined): plan is PlanType {
    return plan === 'free' || plan === 'pro' || plan === 'ultra';
}

// =============================================================================
// Database Operations
// =============================================================================

/**
 * Get user's current plan and limits
 */
export async function getUserPlan(db: D1Database, userId: string): Promise<UserPlanInfo> {
    const user = await db.prepare(
        'SELECT plan, plan_expires_at FROM users WHERE id = ?'
    ).bind(userId).first<{ plan: string | null; plan_expires_at: string | null }>();

    // Default to free if no plan or invalid plan
    let plan: PlanType = 'free';

    if (user?.plan && isValidPlan(user.plan)) {
        // Check if plan has expired
        if (user.plan !== 'free' && user.plan_expires_at) {
            const expiresAt = new Date(user.plan_expires_at);
            if (expiresAt < new Date()) {
                // Plan expired, treat as free
                plan = 'free';
            } else {
                plan = user.plan;
            }
        } else {
            plan = user.plan;
        }
    }

    return {
        plan,
        limits: PLAN_LIMITS[plan],
        expiresAt: user?.plan_expires_at || null,
    };
}

/**
 * Get usage count for a feature in the current period
 */
export async function getUsage(
    db: D1Database,
    userId: string,
    feature: FeatureType,
    period?: string
): Promise<number> {
    const targetPeriod = period || getCurrentPeriod();

    const result = await db.prepare(
        'SELECT count FROM usage_records WHERE user_id = ? AND feature = ? AND period = ?'
    ).bind(userId, feature, targetPeriod).first<{ count: number }>();

    return result?.count || 0;
}

/**
 * Increment usage count for a feature
 */
export async function incrementUsage(
    db: D1Database,
    userId: string,
    feature: FeatureType,
    amount: number = 1
): Promise<void> {
    const period = getCurrentPeriod();

    await db.prepare(`
        INSERT INTO usage_records (user_id, feature, period, count)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, feature, period) DO UPDATE SET
            count = count + ?,
            updated_at = CURRENT_TIMESTAMP
    `).bind(userId, feature, period, amount, amount).run();
}

/**
 * Check if user has remaining quota for a feature
 */
export async function checkQuota(
    db: D1Database,
    userId: string,
    feature: FeatureType
): Promise<QuotaCheckResult> {
    const planInfo = await getUserPlan(db, userId);
    const period = getCurrentPeriod();
    const used = await getUsage(db, userId, feature, period);

    let limit: number;
    switch (feature) {
        case 'collection':
            limit = planInfo.limits.collectionPerMonth;
            break;
        case 'ai_summary':
            limit = planInfo.limits.aiSummaryPerMonth;
            break;
        case 'storage':
            // Storage is handled differently - uses bytes, not count
            limit = planInfo.limits.storageBytes;
            break;
        default:
            limit = 0;
    }

    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
    const allowed = limit === Infinity || used < limit;

    return {
        allowed,
        used,
        limit,
        remaining,
        feature,
    };
}

/**
 * Calculate real-time storage usage for a user (bytes)
 * Sums up actual file sizes from:
 * 1. Completed video downloads (user downloaded videos) from video_downloads
 * 2. All cached media (images + avatars) from cached_tweets.media_size
 *
 * This provides accurate, up-to-date storage usage calculated in real-time.
 */
export async function getStorageUsage(db: D1Database, userId: string): Promise<number> {
    // Sum up all completed video file sizes for this user
    // Includes user downloads (user_id = userId) and snapshot videos (task_type = 'snapshot_video')
    const videoSizesResult = await db.prepare(`
        SELECT COALESCE(SUM(vd.file_size), 0) as total_size
        FROM video_downloads vd
        WHERE vd.status = 'completed'
          AND vd.file_size IS NOT NULL
          AND vd.file_size > 0
          AND (
            -- User's direct downloads
            vd.user_id = ?
            OR
            -- Snapshot videos for tweets this user has saved
            vd.task_type = 'snapshot_video'
            AND vd.tweet_id IN (
                SELECT sp.x_post_id FROM saved_posts sp WHERE sp.user_id = ?
            )
          )
    `).bind(userId, userId).first<{ total_size: number }>();

    const videoStorage = videoSizesResult?.total_size || 0;

    // Sum up actual cached media sizes from cached_tweets
    // This includes images, avatars, and card images that were cached for saved tweets
    const mediaSizesResult = await db.prepare(`
        SELECT COALESCE(SUM(ct.media_size), 0) as total_size
        FROM cached_tweets ct
        INNER JOIN saved_posts sp ON ct.tweet_id = sp.x_post_id
        WHERE sp.user_id = ?
          AND ct.media_size IS NOT NULL
          AND ct.media_size > 0
    `).bind(userId).first<{ total_size: number }>();

    const mediaStorage = mediaSizesResult?.total_size || 0;

    return videoStorage + mediaStorage;
}

/**
 * Recalculate and update storage usage for a user
 * Updates the cached storage_usage column in the users table
 */
export async function recalculateStorageUsage(db: D1Database, userId: string): Promise<number> {
    const realTimeUsage = await getStorageUsage(db, userId);

    // Update the cached storage_usage column
    await db.prepare(
        'UPDATE users SET storage_usage = ? WHERE id = ?'
    ).bind(realTimeUsage, userId).run();

    return realTimeUsage;
}

/**
 * Check storage quota based on plan
 */
export async function checkStorageQuota(
    db: D1Database,
    userId: string
): Promise<QuotaCheckResult> {
    const planInfo = await getUserPlan(db, userId);
    const used = await getStorageUsage(db, userId);
    const limit = planInfo.limits.storageBytes;
    const remaining = Math.max(0, limit - used);

    return {
        allowed: used < limit,
        used,
        limit,
        remaining,
        feature: 'storage',
    };
}

/**
 * Get all usage info for a user (for dashboard display)
 */
export async function getAllUsageInfo(
    db: D1Database,
    userId: string
): Promise<{
    plan: UserPlanInfo;
    collection: QuotaCheckResult;
    aiSummary: QuotaCheckResult;
    storage: QuotaCheckResult;
}> {
    const plan = await getUserPlan(db, userId);
    const [collection, aiSummary, storage] = await Promise.all([
        checkQuota(db, userId, 'collection'),
        checkQuota(db, userId, 'ai_summary'),
        checkStorageQuota(db, userId),
    ]);

    return { plan, collection, aiSummary, storage };
}
