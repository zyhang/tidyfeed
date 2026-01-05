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
        webAppUrl: string = 'https://tidyfeed.app',
        customPrompt?: string
    ): Promise<string> {
        // Step A: Fetch the actual snapshot content from R2
        const snapshotObject = await r2.get(snapshotKey);
        if (!snapshotObject) {
            throw new Error(`Snapshot not found in R2: ${snapshotKey}`);
        }

        const htmlContent = await snapshotObject.text();

        // Step B: Extract text content from HTML (simple extraction)
        const textContent = this.extractTextFromHtml(htmlContent);

        // Step C: Fetch AI config from system_settings
        const config = await this.fetchAIConfig(db);

        // Step D: Build prompt with the actual content
        const prompt = this.buildPromptWithContent(config, textContent, customPrompt);

        // Step E: Call BigModel API (without web_search since we have the content)
        const response = await this.callBigModel(config.model, prompt);

        return response;
    }

    /**
     * Simple HTML to text extraction
     */
    private extractTextFromHtml(html: string): string {
        // Remove script and style tags
        let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, ' ');

        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/&#39;/g, "'");

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        // Limit length to avoid token limits
        if (text.length > 4000) {
            text = text.substring(0, 4000) + '...';
        }

        return text;
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
            model: 'glm-4.6' // Default model
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
     * Build prompt with actual content instead of URL.
     */
    private buildPromptWithContent(config: AIConfig, content: string, customPrompt?: string): string {
        // Use custom prompt if provided, otherwise use default
        let systemInstruction = customPrompt;

        // If no custom prompt, use template or default instruction
        if (!systemInstruction) {
            systemInstruction = "请阅读以下推文内容，并进行总结分析：";
        }

        let prompt = `${systemInstruction}\n\n---\n${content}\n---`;

        // Append output format instructions
        if (config.output_format) {
            prompt += `\n\n请按照以下格式输出：\n${config.output_format}`;
        }

        return prompt;
    }

    /**
     * Call the BigModel API.
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
            messages: messages
            // Removed web_search tool since we provide content directly
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
