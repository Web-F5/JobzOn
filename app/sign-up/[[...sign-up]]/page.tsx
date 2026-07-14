import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">JobzOn</h1>
          <p className="text-slate-500 text-sm mt-1">Job management & automated invoicing</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
