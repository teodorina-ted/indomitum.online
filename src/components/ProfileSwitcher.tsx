import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Package, Leaf } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProfileSwitcherProps {
  compact?: boolean;
}

const ProfileSwitcher = ({ compact = false }: ProfileSwitcherProps) => {
  const navigate = useNavigate();
  const { isCollector, isBuyer, isAdmin, roles } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Determine which profiles user has access to
  const availableProfiles = [];
  
  if (isAdmin || isCollector) {
    availableProfiles.push({
      id: "collector",
      label: "Collector",
      icon: Leaf,
      path: "/dashboard",
      description: "Manage seed collection",
    });
  }
  
  if (isAdmin || isBuyer || roles.includes("buyer")) {
    availableProfiles.push({
      id: "buyer",
      label: "Buyer",
      icon: Package,
      path: "/buyer",
      description: "View purchased seeds",
    });
  }

  // Determine current profile based on path
  const currentPath = window.location.pathname;
  const currentProfile = currentPath.startsWith("/buyer") 
    ? availableProfiles.find(p => p.id === "buyer") 
    : availableProfiles.find(p => p.id === "collector");

  // Don't show if user only has one profile
  if (availableProfiles.length <= 1) {
    return null;
  }

  const handleSwitch = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            {currentProfile?.icon && <currentProfile.icon className="w-4 h-4" />}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableProfiles.map((profile) => (
            <DropdownMenuItem
              key={profile.id}
              onClick={() => handleSwitch(profile.path)}
              className={currentProfile?.id === profile.id ? "bg-accent" : ""}
            >
              <profile.icon className="w-4 h-4 mr-2" />
              {profile.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-between">
          <div className="flex items-center gap-2">
            {currentProfile?.icon && <currentProfile.icon className="w-4 h-4" />}
            <span>{currentProfile?.label}</span>
          </div>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableProfiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSwitch(profile.path)}
            className={`flex flex-col items-start py-2 ${currentProfile?.id === profile.id ? "bg-accent" : ""}`}
          >
            <div className="flex items-center gap-2">
              <profile.icon className="w-4 h-4" />
              <span className="font-medium">{profile.label}</span>
            </div>
            <span className="text-xs text-muted-foreground ml-6">{profile.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileSwitcher;
