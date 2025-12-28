import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Header() {
    return (
        <header className="h-16 border-b flex items-center justify-between px-6 bg-background">
            <div className="text-sm text-muted-foreground">
                Dashboard
            </div>
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>JD</AvatarFallback>
                </Avatar>
            </div>
        </header>
    )
}
