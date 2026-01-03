
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
    entities?: {
        urls: {
            url: string;
            expanded_url: string;
            display_url: string;
        }[];
    };
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
