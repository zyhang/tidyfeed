/**
 * TikHub API Service
 * 
 * Fetches tweet data and comments from TikHub API for caching.
 * API Docs: https://docs.tikhub.io
 */

const TIKHUB_BASE_URL = 'https://api.tikhub.io/api/v1/twitter/web';

// Type definitions for TikHub API responses
export interface TikHubTweetData {
    id: string;
    text: string;
    created_at: string;
    author: {
        id: string;
        name: string;
        screen_name: string;
        profile_image_url: string;
        verified?: boolean;
        description?: string;
        followers_count?: number;
    };
    media?: TikHubMedia[];
    quoted_tweet?: TikHubTweetData;
    metrics?: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
        view_count?: number;
    };
    source?: string;
}

export interface TikHubMedia {
    type: 'photo' | 'video' | 'animated_gif';
    url: string;
    preview_url?: string;
    width?: number;
    height?: number;
    video_info?: {
        duration_millis?: number;
        variants?: { url: string; bitrate?: number; content_type: string }[];
    };
}

export interface TikHubComment {
    id: string;
    text: string;
    created_at: string;
    author: {
        id: string;
        name: string;
        screen_name: string;
        profile_image_url: string;
    };
    like_count?: number;
}

export interface TikHubApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface TikHubCommentsResponse {
    comments: TikHubComment[];
    cursor?: string;
    has_more?: boolean;
}

export class TikHubService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Fetch tweet detail by tweet ID
     */
    async fetchTweetDetail(tweetId: string): Promise<TikHubTweetData | null> {
        try {
            const response = await fetch(
                `${TIKHUB_BASE_URL}/fetch_tweet_detail?tweet_id=${tweetId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                console.error(`[TikHub] Tweet fetch failed: ${response.status}`);
                return null;
            }

            const result = await response.json<TikHubApiResponse<any>>();

            if (result.code !== 200 || !result.data) {
                console.error(`[TikHub] API error: ${result.message}`);
                return null;
            }

            return this.parseTweetData(result.data);
        } catch (error) {
            console.error('[TikHub] Error fetching tweet:', error);
            return null;
        }
    }

    /**
     * Fetch tweet comments with pagination
     * Note: TikHub supports max ~200 comments
     */
    async fetchTweetComments(
        tweetId: string,
        cursor?: string,
        maxComments: number = 50
    ): Promise<{ comments: TikHubComment[]; cursor?: string; hasMore: boolean }> {
        try {
            let url = `${TIKHUB_BASE_URL}/fetch_post_comments?tweet_id=${tweetId}`;
            if (cursor) {
                url += `&cursor=${encodeURIComponent(cursor)}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error(`[TikHub] Comments fetch failed: ${response.status}`);
                return { comments: [], hasMore: false };
            }

            const result = await response.json<TikHubApiResponse<any>>();

            if (result.code !== 200 || !result.data) {
                console.error(`[TikHub] API error: ${result.message}`);
                return { comments: [], hasMore: false };
            }

            const comments = this.parseComments(result.data);

            return {
                comments: comments.slice(0, maxComments),
                cursor: result.data.cursor,
                hasMore: !!result.data.cursor && comments.length >= maxComments,
            };
        } catch (error) {
            console.error('[TikHub] Error fetching comments:', error);
            return { comments: [], hasMore: false };
        }
    }

    /**
     * Parse raw tweet data from TikHub response
     */
    private parseTweetData(raw: any): TikHubTweetData {
        // TikHub returns data in different structures depending on the endpoint
        // This handles common patterns
        const tweet = raw.tweet || raw.data || raw;
        const user = tweet.user || tweet.author || {};
        const legacy = tweet.legacy || tweet;

        return {
            id: tweet.rest_id || tweet.id_str || tweet.id || '',
            text: legacy.full_text || legacy.text || tweet.text || '',
            created_at: legacy.created_at || tweet.created_at || '',
            author: {
                id: user.rest_id || user.id_str || user.id || '',
                name: user.name || user.legacy?.name || '',
                screen_name: user.screen_name || user.legacy?.screen_name || '',
                profile_image_url: user.profile_image_url_https || user.legacy?.profile_image_url_https || '',
                verified: user.verified || user.legacy?.verified || user.is_blue_verified,
                description: user.description || user.legacy?.description || '',
                followers_count: user.followers_count || user.legacy?.followers_count || 0,
            },
            media: this.parseMedia(legacy.extended_entities?.media || legacy.entities?.media || []),
            quoted_tweet: legacy.quoted_status_result?.result
                ? this.parseTweetData(legacy.quoted_status_result.result)
                : undefined,
            metrics: {
                like_count: legacy.favorite_count || 0,
                retweet_count: legacy.retweet_count || 0,
                reply_count: legacy.reply_count || 0,
                view_count: tweet.views?.count ? parseInt(tweet.views.count) : undefined,
            },
            source: legacy.source || '',
        };
    }

    /**
     * Parse media array from Twitter data
     */
    private parseMedia(mediaArray: any[]): TikHubMedia[] {
        if (!Array.isArray(mediaArray)) return [];

        return mediaArray.map((m) => ({
            type: m.type === 'video' ? 'video'
                : m.type === 'animated_gif' ? 'animated_gif'
                    : 'photo',
            url: m.media_url_https || m.url || '',
            preview_url: m.preview_image_url_https || m.media_url_https || '',
            width: m.original_info?.width || m.sizes?.large?.w,
            height: m.original_info?.height || m.sizes?.large?.h,
            video_info: m.video_info ? {
                duration_millis: m.video_info.duration_millis,
                variants: m.video_info.variants?.filter((v: any) => v.content_type === 'video/mp4'),
            } : undefined,
        }));
    }

    /**
     * Parse comments from TikHub response
     */
    private parseComments(raw: any): TikHubComment[] {
        const comments = raw.comments || raw.data || [];
        if (!Array.isArray(comments)) return [];

        return comments.map((c: any) => {
            const user = c.user || c.author || {};
            const legacy = c.legacy || c;

            return {
                id: c.rest_id || c.id_str || c.id || '',
                text: legacy.full_text || legacy.text || c.text || '',
                created_at: legacy.created_at || c.created_at || '',
                author: {
                    id: user.rest_id || user.id_str || user.id || '',
                    name: user.name || user.legacy?.name || '',
                    screen_name: user.screen_name || user.legacy?.screen_name || '',
                    profile_image_url: user.profile_image_url_https || user.legacy?.profile_image_url_https || '',
                },
                like_count: legacy.favorite_count || 0,
            };
        });
    }

    /**
     * Get best quality video URL from variants
     */
    static getBestVideoUrl(media: TikHubMedia): string | null {
        if (media.type !== 'video' && media.type !== 'animated_gif') return null;

        const variants = media.video_info?.variants || [];
        const mp4Variants = variants.filter(v => v.content_type === 'video/mp4');

        if (mp4Variants.length === 0) return null;

        // Sort by bitrate descending, get highest quality
        const sorted = mp4Variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        return sorted[0]?.url || null;
    }
}
