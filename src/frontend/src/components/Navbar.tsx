import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Home, LogOut, Menu, PlusCircle, User, Users, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { CreatePostModal } from "./CreatePostModal";
import { NotificationBell } from "./NotificationBell";
import { UserAvatar } from "./UserAvatar";

export function Navbar() {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useGetCallerUserProfile();
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  const navLinks = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/friends", label: "Friends", icon: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/feed" className="flex items-center gap-2 flex-shrink-0">
            <img
              src="/assets/generated/mycircle-logo-transparent.dim_120x120.png"
              alt="MyCircle"
              className="h-7 w-7"
            />
            <span className="font-display font-bold text-lg text-foreground hidden sm:block">
              MyCircle
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                )}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="hidden sm:flex gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              New Post
            </Button>

            <NotificationBell />

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 p-0"
                  aria-label="Profile menu"
                >
                  <UserAvatar profile={profile} size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <div className="px-3 py-2">
                  <p className="font-display font-semibold text-sm">
                    {profile?.username ?? "Loading..."}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {identity?.getPrincipal().toString().slice(0, 12)}...
                  </p>
                </div>
                <DropdownMenuSeparator />
                {profile?.username && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile/$username"
                      params={{ username: profile.username }}
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-2 pt-6">
                  {navLinks.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </Button>
                    </Link>
                  ))}
                  <Button
                    className="w-full justify-start gap-3 mt-2"
                    onClick={() => {
                      setMobileOpen(false);
                      setCreateOpen(true);
                    }}
                  >
                    <PlusCircle className="h-5 w-5" />
                    New Post
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
