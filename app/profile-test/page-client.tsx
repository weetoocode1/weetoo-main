"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Building2,
  Calendar,
  Camera,
  Check,
  Edit2,
  Globe,
  Link as LinkIcon,
  Mail,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  location: string;
  website: string;
  company: string;
  joinDate: string;
  level: number;
  exp: number;
  korCoins: number;
  stats: {
    followers: number;
    following: number;
    posts: number;
    likes: number;
  };
  achievements: {
    title: string;
    icon: string;
  }[];
  isVerified: boolean;
}

const demoProfileData: ProfileData = {
  id: "1",
  firstName: "Alex",
  lastName: "Chen",
  username: "alexchen",
  email: "alex.chen@example.com",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexChen",
  bio: "Professional trader and crypto enthusiast. Building the future of decentralized finance. Always learning, always growing.",
  location: "San Francisco, CA",
  website: "https://alexchen.dev",
  company: "Weetoo Trading",
  joinDate: "2023-01-15",
  level: 42,
  exp: 12500,
  korCoins: 8500,
  stats: {
    followers: 12847,
    following: 892,
    posts: 342,
    likes: 15420,
  },
  achievements: [
    { title: "Top Trader", icon: "🏆" },
    { title: "Early Adopter", icon: "🚀" },
    { title: "Community Leader", icon: "👑" },
  ],
  isVerified: true,
};

export function ProfileTestPageClient() {
  const [profileData] = useState<ProfileData>(demoProfileData);
  const [isEditing, setIsEditing] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const handleEditProfile = () => {
    setIsEditing(!isEditing);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="flex h-full w-full gap-4 p-4">
        {/* Left Side - Profile Info */}
        <div className="flex w-1/3 flex-col gap-3">
          <Card className="flex-1 border shadow-md">
            <CardContent className="flex flex-col items-center p-4">
              <div
                className="relative mb-3 cursor-pointer"
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
              >
                <Avatar className="size-24 border-2 border-background shadow-lg ring-2 ring-primary/20">
                  <AvatarImage
                    src={profileData.avatarUrl}
                    alt={`${profileData.firstName} ${profileData.lastName}`}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {profileData.firstName[0]}
                    {profileData.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                {isHoveringAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-opacity">
                    <Camera className="size-5 text-white" />
                  </div>
                )}
              </div>
              <div className="mb-2 text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <h1 className="text-xl font-bold">
                    {profileData.firstName} {profileData.lastName}
                  </h1>
                  {profileData.isVerified && (
                    <Badge
                      variant="default"
                      className="bg-primary text-primary-foreground"
                    >
                      <Check className="size-3" />
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{profileData.username}
                </p>
              </div>
              {profileData.bio && (
                <p className="mb-3 text-center text-xs leading-relaxed text-muted-foreground">
                  {profileData.bio}
                </p>
              )}
              <div className="mb-3 w-full space-y-1.5 text-xs text-muted-foreground">
                {profileData.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3" />
                    <span>{profileData.location}</span>
                  </div>
                )}
                {profileData.website && (
                  <a
                    href={profileData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <LinkIcon className="size-3" />
                    <span className="truncate text-xs">
                      {profileData.website}
                    </span>
                  </a>
                )}
                {profileData.company && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3" />
                    <span>{profileData.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  <span>Joined {formatDate(profileData.joinDate)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditProfile}
                className="w-full gap-2"
              >
                <Edit2 className="size-3" />
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="border shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="size-3 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${profileData.email}`}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {profileData.email}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Stats and Details */}
        <div className="flex w-2/3 flex-col gap-3">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border shadow-md transition-all hover:shadow-lg">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {formatNumber(profileData.stats.followers)}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border shadow-md transition-all hover:shadow-lg">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {formatNumber(profileData.stats.following)}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border shadow-md transition-all hover:shadow-lg">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {formatNumber(profileData.stats.posts)}
                  </p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border shadow-md transition-all hover:shadow-lg">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {formatNumber(profileData.stats.likes)}
                  </p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section - Two Columns */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              <Card className="border shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Award className="size-4" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profileData.achievements.map((achievement, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="gap-1 px-2 py-1 text-xs"
                      >
                        <span className="text-sm">{achievement.icon}</span>
                        <span>{achievement.title}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {new Date(profileData.joinDate).getFullYear()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant="default"
                      className="bg-success text-success-foreground text-xs"
                    >
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <Card className="border shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="size-4" />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      Level {profileData.level}
                    </span>
                    <span className="text-muted-foreground">
                      {profileData.exp.toLocaleString()} / 15K
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(profileData.exp / 15000) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Globe className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      KOR Coins
                    </span>
                  </div>
                  <span className="text-base font-bold">
                    {profileData.korCoins.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
