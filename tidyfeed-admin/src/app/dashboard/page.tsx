'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { getToken, getEmail, clearAuth, isAuthenticated } from '@/lib/auth';
import { Settings } from 'lucide-react';

interface Report {
    blocked_x_id: string;
    blocked_x_name: string | null;
    report_count: number;
    reasons: string | null;
    latest_report: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        setEmail(getEmail());
        fetchReports();
    }, [router]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/api/reports`, {
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
                throw new Error('Failed to fetch reports');
            }

            const data = await res.json();
            setReports(data.reports || []);
        } catch (error) {
            toast.error('Failed to fetch reports');
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

    const truncateId = (id: string, length = 12) => {
        if (id.length <= length) return id;
        return `${id.slice(0, length)}...`;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">TidyFeed Admin</h1>
                    <div className="flex items-center gap-4">
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

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Reported Accounts</h2>
                    <Button onClick={fetchReports} disabled={loading} variant="outline">
                        {loading ? 'Loading...' : 'Refresh'}
                    </Button>
                </div>

                {/* Reports Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Blocked User</TableHead>
                                <TableHead>Report Count</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Latest Report</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        {loading ? 'Loading reports...' : 'No reports found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reports.map((report) => (
                                    <TableRow key={report.blocked_x_id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{report.blocked_x_name || 'Unknown'}</div>
                                                <div className="text-sm text-muted-foreground font-mono">
                                                    {truncateId(report.blocked_x_id)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                                {report.report_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {report.reasons || '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(report.latest_report)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {reports.length > 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Showing {reports.length} reported account{reports.length !== 1 ? 's' : ''}
                    </p>
                )}
            </main>
        </div>
    );
}
