import { Metadata } from "next";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Profile | Weetoo",
  description: "View your profile, settings, and notifications in Weetoo",
};

export default function Profile() {
  return (
    <div className="max-w-[1650px] w-full mx-auto pt-4 sm:pt-8 lg:pt-20 px-2 sm:px-6 lg:px-8 mt-12 lg:mt-0 md:mt-0">
      <div className="border w-full flex flex-col lg:flex-row min-h-[calc(100vh-120px)] lg:min-h-[calc(100vh-140px)]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              Loading...
            </div>
          }
        >
          <ProfileTabs />
        </Suspense>
      </div>
    </div>
  );
}
