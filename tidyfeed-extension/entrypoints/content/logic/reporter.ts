/**
 * Reporter utility for TidyFeed
 * Sends block reports to the backend via background script
 */

export interface ReportResponse {
    success: boolean;
    error?: string;
    data?: unknown;
}

/**
 * Report a blocked user to the backend
 * @param blockedId - User ID/handle of the blocked account  
 * @param blockedName - Display name of the blocked account
 * @param reason - Reason for blocking (e.g., 'Ad', 'Keyword: spam')
 */
export async function reportBlock(
    blockedId: string,
    blockedName: string,
    reason: string
): Promise<ReportResponse> {
    // Reporting disabled in this build - no-op implementation
    console.warn('[TidyFeed] reportBlock called but reporting is disabled - ignoring report for', blockedName || blockedId);
    return { success: false, error: 'Reporting disabled in this extension' };
}
