import { LoginForm } from "@/components/login-form";
export default function LoginPage() {
  return (
    <div className="bg-[#F5F7FA] flex min-h-svh flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-sm lg:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
