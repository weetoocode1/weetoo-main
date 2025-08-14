import { GlobeIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function AdminProfile() {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full p-0 hover:bg-accent transition-colors cursor-pointer"
          >
            <Avatar className="w-7 h-7">
              <AvatarImage
                src="https://vercel.com/api/www/avatar?s=64&u=shivraj-k09"
                alt="@shadcn"
              />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
                CN
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-64 p-0 bg-card/95 backdrop-blur-sm border shadow-lg rounded-xl overflow-hidden"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarImage
                  src="https://vercel.com/api/www/avatar?s=64&u=shivraj-k09"
                  alt="@shadcn"
                />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-medium">
                  CN
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">shadcn</div>
                <div className="text-xs text-muted-foreground">
                  shadcn@gmail.com
                </div>
              </div>
            </div>
          </div>

          <Link href="/">
            <DropdownMenuItem className="cursor-pointer px-3 py-2.5 rounded-none hover:bg-accent transition-colors">
              <GlobeIcon className="w-4 h-4 mr-3 text-muted-foreground" />
              Go Back to Website
            </DropdownMenuItem>
          </Link>

          <Link href="#">
            <DropdownMenuItem className="cursor-pointer rounded-none px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <LogOutIcon className="w-4 h-4 mr-3 text-red-500" />
              Sign Out
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
