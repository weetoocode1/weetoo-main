import { TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | Weetoo",
  description: "Login to your Weetoo account",
};

export default function Login() {
  return (
    <div className="h-screen bg-background w-full px-4 lg:px-0">
      <div className="w-full h-full flex">
        <div className="w-full h-full flex relative">
          <div className="absolute top-7 left-10 lg:flex hidden items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            <span className="text-xl font-semibold">Weetoo</span>
          </div>

          <div className="absolute top-7 right-10 hidden lg:flex">
            <Link href="/trading">
              <span className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors duration-200 ease-in-out">
                Back to Website
              </span>
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
