export interface UserProfileData {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
  avatarUrl: string;
  joinDate: string;
  bio?: string;
  role: string;
  isVerified: boolean;
}
