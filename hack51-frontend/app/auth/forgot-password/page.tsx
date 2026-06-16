import animation from "../../../public/cubes-human-resources-department-hiring-employee 1.png";
import Image from "next/image";
import ForgotPasswordForm from "@/app/components/forms/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white">
      <section className="hidden md:flex w-full md:w-1/2 flex-col justify-center items-center gap-6 bg-white px-10 py-16">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">
            Hack <span className="text-[#FF0046]">51</span>
          </h1>
          <p className="text-lg text-gray-600 leading-8">
            No worries , we'll help you get back into your account.
          </p>
        </div>
        <div className="w-full max-w-lg">
          <Image src={animation} alt="Illustration" />
        </div>
      </section>

      <section className="flex w-full md:w-1/2 justify-center items-center bg-[#FF0046] px-4 py-10">
        <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow-[0_35px_60px_-25px_rgba(0,0,0,0.35)] sm:p-10">
          <div className="mb-8 text-center md:hidden">
            <h1 className="text-4xl font-bold mb-2">
              Hack <span className="text-[#FF0046]">51</span>
            </h1>
            <p className="text-gray-600">
              No worries , we'll help you get back into your account.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
