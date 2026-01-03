-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default values
INSERT OR IGNORE INTO system_settings (key, value) VALUES 
('ai_prompt_template', '请阅读链接 {snapshot_url} 中的内容，并进行总结分析。'),
('ai_output_format', '**核心事实如下：**\n- **发布者：**\n- **发布时间：**\n- **对象：**\n- **内容摘要：**\n**我的判断：**'),
('ai_model', 'glm-4-flash');
