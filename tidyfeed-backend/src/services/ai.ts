/**
 * AI Service - BigModel (Zhipu) Integration
 * 
 * Generates summaries using Zhipu's GLM models with web_search capability.
 */

// Types for BigModel API
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface BigModelResponse {
    id: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

interface AIConfig {
    prompt_template: string;
    output_format: string;
    model: string;
}

export class AIService {
    private apiKey: string;
    private baseUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Generate a summary for a cached tweet snapshot.
     * 
     * @param snapshotKey - The R2 key for the snapshot (e.g., "snapshots/123456789.html")
     * @param r2 - R2 bucket binding (unused for URL generation, using public endpoint)
     * @param db - D1 database binding for fetching AI config
     * @param webAppUrl - Base URL of the web app (e.g., "https://tidyfeed.app")
     * @returns Generated summary text
     */
    async generateSummary(
        snapshotKey: string,
        r2: R2Bucket,
        db: D1Database,
        webAppUrl: string = 'https://tidyfeed.app'
    ): Promise<string> {
        // Step A: Generate accessible URL
        // Extract tweet ID from snapshot key (format: "snapshots/{tweetId}.html")
        const tweetIdMatch = snapshotKey.match(/snapshots\/(\d+)\.html/);
        if (!tweetIdMatch) {
            throw new Error(`Invalid snapshot key format: ${snapshotKey}`);
        }
        const tweetId = tweetIdMatch[1];
        const snapshotUrl = `${webAppUrl}/s/${tweetId}`;

        // Step B: Fetch AI config from system_settings
        const config = await this.fetchAIConfig(db);

        // Step C: Build prompt
        const prompt = this.buildPrompt(config, snapshotUrl);

        // Step D: Call BigModel API
        const response = await this.callBigModel(config.model, prompt);

        return response;
    }

    /**
     * Fetch AI configuration from system_settings table.
     */
    private async fetchAIConfig(db: D1Database): Promise<AIConfig> {
        const settings = await db.prepare(
            `SELECT key, value FROM system_settings 
             WHERE key IN ('ai_prompt_template', 'ai_output_format', 'ai_model')`
        ).all<{ key: string; value: string }>();

        const config: AIConfig = {
            prompt_template: '',
            output_format: '',
            model: 'glm-4-flash' // Default model
        };

        if (settings.results) {
            for (const setting of settings.results) {
                if (setting.key === 'ai_prompt_template') config.prompt_template = setting.value;
                if (setting.key === 'ai_output_format') config.output_format = setting.value;
                if (setting.key === 'ai_model') config.model = setting.value;
            }
        }

        return config;
    }

    /**
     * Build the final prompt with URL substitution and output format.
     */
    private buildPrompt(config: AIConfig, snapshotUrl: string): string {
        // Replace {snapshot_url} placeholder
        let prompt = config.prompt_template.replace('{snapshot_url}', snapshotUrl);

        // Append output format instructions
        if (config.output_format) {
            prompt += `\n\n请按照以下格式输出：\n${config.output_format}`;
        }

        return prompt;
    }

    /**
     * Call the BigModel API with web_search enabled.
     */
    private async callBigModel(model: string, userPrompt: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'user',
                content: userPrompt
            }
        ];

        const requestBody = {
            model: model,
            messages: messages,
            tools: [
                {
                    type: 'web_search',
                    web_search: {
                        enable: true
                    }
                }
            ]
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`BigModel API error (${response.status}): ${errorText}`);
        }

        const data = await response.json() as BigModelResponse;

        if (!data.choices || data.choices.length === 0) {
            throw new Error('BigModel API returned no choices');
        }

        return data.choices[0].message.content;
    }
}

export default AIService;
