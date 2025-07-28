import { RightSide } from "@/components/right-side";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen bg-background w-full">
      <div className="w-full h-full flex">
        <div className="flex items-center justify-center w-full">
          {children}
        </div>
        <RightSide />
      </div>
    </div>
  );
}
