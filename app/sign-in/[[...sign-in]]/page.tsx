import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#182134] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 -translate-x-8">
          <img src="/jobzon-logo.svg" alt="JobzOn" className="w-72 object-contain" />
        </div>
        <SignIn />
      </div>
    </div>
  );
}
