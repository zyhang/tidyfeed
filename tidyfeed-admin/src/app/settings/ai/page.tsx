'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/config';
import { clearAuth, getEmail, getToken, isAuthenticated } from '@/lib/auth';
import AdminNav from '@/components/admin-nav';

export default function AISettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [config, setConfig] = useState({
        model: 'glm-4-flash',
        prompt_template: '',
        output_format: ''
    });

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        setEmail(getEmail());
        fetchConfig();
    }, [router]);

    const fetchConfig = async () => {
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/admin/ai-config`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({
                    model: data.model || 'glm-4-flash',
                    prompt_template: data.prompt_template || '',
                    output_format: data.output_format || ''
                });
            } else {
                toast.error('Failed to load AI config');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading config');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/ai-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success('AI Configuration saved');
            } else {
                toast.error('Failed to save configuration');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error saving configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading settings...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">TidyFeed Admin</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{email}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                clearAuth();
                                router.push('/');
                            }}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 flex flex-col gap-6 lg:flex-row">
                <AdminNav />
                <main className="flex-1 space-y-4">
                    <div className="flex items-center justify-between space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">AI Configuration</h2>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Model Settings</CardTitle>
                            <CardDescription>Configure the AI model and generation parameters.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <select
                                    id="model"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={config.model}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                >
                                    <option value="glm-4-flash">GLM-4-Flash</option>
                                    <option value="glm-4-plus">GLM-4-Plus</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="prompt">Prompt Template</Label>
                                <Textarea
                                    id="prompt"
                                    placeholder="Enter prompt template..."
                                    className="min-h-[100px] font-mono text-sm"
                                    value={config.prompt_template}
                                    onChange={(e) => setConfig({ ...config, prompt_template: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {'{snapshot_url}'} as a placeholder for the tweet snapshot link.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="output">Output Format</Label>
                                <Textarea
                                    id="output"
                                    placeholder="Enter expected markdown format..."
                                    className="min-h-[150px] font-mono text-sm"
                                    value={config.output_format}
                                    onChange={(e) => setConfig({ ...config, output_format: e.target.value })}
                                />
                            </div>

                            <div className="pt-4">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
