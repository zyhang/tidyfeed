'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/config';
import { clearAuth, getEmail, getToken, isAuthenticated } from '@/lib/auth';
import AdminNav from '@/components/admin-nav';

type SystemSettings = {
    bot_enabled: boolean;
    storage_quota_mb: number;
    cache_ttl_hours: number;
    cache_comments_limit: number;
    auto_cache_on_save: boolean;
    regex_rules_url: string;
};

const DEFAULT_SETTINGS: SystemSettings = {
    bot_enabled: true,
    storage_quota_mb: 500,
    cache_ttl_hours: 24,
    cache_comments_limit: 20,
    auto_cache_on_save: true,
    regex_rules_url: 'https://tidyfeed.app/regex_rules.json',
};

export default function SystemSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        setEmail(getEmail());
        fetchSettings();
    }, [router]);

    const fetchSettings = async () => {
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/admin/system-settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    toast.error('Session expired. Please login again.');
                    router.push('/');
                    return;
                }
                throw new Error('Failed to load settings');
            }

            const data = await res.json();
            if (data?.settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading system settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/admin/system-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                toast.success('System settings saved');
            } else {
                toast.error('Failed to save system settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error saving system settings');
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
                <main className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Bot Control</CardTitle>
                            <CardDescription>Toggle the mention bot for daily operations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="bot_enabled">Bot Enabled</Label>
                                    <div className="text-xs text-muted-foreground">Enable or disable the bot worker.</div>
                                </div>
                                <input
                                    id="bot_enabled"
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={settings.bot_enabled}
                                    onChange={(e) => setSettings({ ...settings, bot_enabled: e.target.checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Storage / Quota</CardTitle>
                            <CardDescription>Controls for storage usage display.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="storage_quota_mb">Storage Quota (MB)</Label>
                                <Input
                                    id="storage_quota_mb"
                                    type="number"
                                    min={0}
                                    value={settings.storage_quota_mb}
                                    onChange={(e) => setSettings({ ...settings, storage_quota_mb: Number(e.target.value) })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Snapshot Caching</CardTitle>
                            <CardDescription>Operational parameters for snapshot caching.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cache_ttl_hours">Cache TTL (hours)</Label>
                                <Input
                                    id="cache_ttl_hours"
                                    type="number"
                                    min={0}
                                    value={settings.cache_ttl_hours}
                                    onChange={(e) => setSettings({ ...settings, cache_ttl_hours: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cache_comments_limit">Comments Limit</Label>
                                <Input
                                    id="cache_comments_limit"
                                    type="number"
                                    min={0}
                                    value={settings.cache_comments_limit}
                                    onChange={(e) => setSettings({ ...settings, cache_comments_limit: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="auto_cache_on_save">Auto Cache on Save</Label>
                                    <div className="text-xs text-muted-foreground">Trigger snapshot caching when a post is saved.</div>
                                </div>
                                <input
                                    id="auto_cache_on_save"
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={settings.auto_cache_on_save}
                                    onChange={(e) => setSettings({ ...settings, auto_cache_on_save: e.target.checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Regex Rules</CardTitle>
                            <CardDescription>Configure the rules source for extension filtering.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Label htmlFor="regex_rules_url">Rules URL</Label>
                            <Input
                                id="regex_rules_url"
                                type="url"
                                value={settings.regex_rules_url}
                                onChange={(e) => setSettings({ ...settings, regex_rules_url: e.target.value })}
                            />
                        </CardContent>
                    </Card>

                    <div>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    );
}
