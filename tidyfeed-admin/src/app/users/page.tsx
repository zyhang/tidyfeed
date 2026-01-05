'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { API_BASE_URL } from '@/lib/config';
import { clearAuth, getEmail, getToken, isAuthenticated } from '@/lib/auth';
import { Settings, Users as UsersIcon } from 'lucide-react';

type UserPlan = 'free' | 'pro' | 'ultra';

interface User {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    plan: UserPlan | string | null;
    created_at: string;
}

const PLAN_OPTIONS: UserPlan[] = ['free', 'pro', 'ultra'];

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [selectedPlans, setSelectedPlans] = useState<Record<string, UserPlan>>({});

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        setEmail(getEmail());
        fetchUsers();
    }, [router]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    toast.error('Session expired. Please login again.');
                    clearAuth();
                    router.push('/');
                    return;
                }
                throw new Error('Failed to fetch users');
            }

            const data = await res.json();
            const list = data.users || [];
            setUsers(list);
            const nextPlans: Record<string, UserPlan> = {};
            for (const user of list) {
                const plan = (user.plan || 'free') as UserPlan;
                nextPlans[user.id] = PLAN_OPTIONS.includes(plan) ? plan : 'free';
            }
            setSelectedPlans(nextPlans);
        } catch (error) {
            toast.error('Failed to fetch users');
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        clearAuth();
        router.push('/');
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    const updatePlan = async (userId: string) => {
        const plan = selectedPlans[userId];
        if (!plan) return;

        setUpdatingId(userId);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/plan`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ plan }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update plan');
            }

            setUsers((prev) =>
                prev.map((user) =>
                    user.id === userId ? { ...user, plan } : user
                )
            );
            toast.success('User tier updated');
        } catch (error) {
            toast.error('Failed to update tier');
            console.error('Update error:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const usersCount = useMemo(() => users.length, [users.length]);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">TidyFeed Admin</h1>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <UsersIcon className="h-4 w-4" />
                            <span>Reports</span>
                        </Link>
                        <Link
                            href="/users"
                            className="flex items-center gap-1.5 text-sm text-foreground"
                        >
                            <UsersIcon className="h-4 w-4" />
                            <span>Users</span>
                        </Link>
                        <Link
                            href="/settings/system"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            <span>System Settings</span>
                        </Link>
                        <Link
                            href="/settings/ai"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            <span>AI Settings</span>
                        </Link>
                        <span className="text-sm text-muted-foreground">{email}</span>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold">Users</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage user tiers and review account details.
                        </p>
                    </div>
                    <Button onClick={fetchUsers} disabled={loading} variant="outline">
                        {loading ? 'Loading...' : 'Refresh'}
                    </Button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Join Time</TableHead>
                                <TableHead>User Tier</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        {loading ? 'Loading users...' : 'No users found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img
                                                            src={user.avatar_url}
                                                            alt={user.name || user.email}
                                                            className="h-10 w-10 object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{user.name || 'Unnamed user'}</div>
                                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                className="border border-border rounded-md bg-background px-2 py-1 text-sm"
                                                value={selectedPlans[user.id] || 'free'}
                                                onChange={(e) =>
                                                    setSelectedPlans((prev) => ({
                                                        ...prev,
                                                        [user.id]: e.target.value as UserPlan,
                                                    }))
                                                }
                                                disabled={updatingId === user.id}
                                            >
                                                {PLAN_OPTIONS.map((plan) => (
                                                    <option key={plan} value={plan}>
                                                        {plan}
                                                    </option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => updatePlan(user.id)}
                                                disabled={updatingId === user.id}
                                            >
                                                {updatingId === user.id ? 'Updating...' : 'Update Tier'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {usersCount > 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Showing {usersCount} user{usersCount !== 1 ? 's' : ''}
                    </p>
                )}
            </main>
        </div>
    );
}
