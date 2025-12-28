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
    try {
        const response = await browser.runtime.sendMessage({
            type: 'REPORT_BLOCK',
            blockedId,
            blockedName,
            reason,
        });

        console.log('[TidyFeed] Report response:', response);
        return response || { success: false, error: 'No response' };
    } catch (error) {
        console.error('[TidyFeed] Report error:', error);
        return { success: false, error: String(error) };
    }
}
