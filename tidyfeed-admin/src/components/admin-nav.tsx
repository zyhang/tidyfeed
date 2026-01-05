'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users as UsersIcon, Flag } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/users', label: 'Users', icon: UsersIcon },
    { href: '/settings/ai', label: 'AI Settings', icon: Settings },
    { href: '/settings/system', label: 'System Settings', icon: Settings },
    { href: '/dashboard', label: 'Reports', icon: Flag },
];

export default function AdminNav() {
    const pathname = usePathname();

    return (
        <nav className="w-full max-w-[220px]">
            <div className="rounded-lg border border-border bg-card p-2">
                <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={[
                                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                                        isActive
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                                    ].join(' ')}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
