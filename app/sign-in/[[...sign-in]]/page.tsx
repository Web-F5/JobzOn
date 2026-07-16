import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#1e293b] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/Jobz-On.webp" alt="JobzOn" className="w-64 object-contain" />
          <p className="text-white/60 text-sm">Job management & automated invoicing</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
