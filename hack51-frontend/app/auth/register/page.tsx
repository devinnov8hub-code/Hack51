import animation from "../../../public/cubes-human-resources-department-hiring-employee 1.png";
import Image from "next/image";
import RegisterForm from "@/app/components/forms/RegisterForm";

export default function Register() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row-reverse">
      <section className="hidden md:flex md:w-1/2 flex-col justify-center items-center p-8">
        <h1 className="text-4xl font-bold mb-4">
          Hack <span className="text-[#FF0046]">51</span>
        </h1>
        <p className="text-lg text-gray-600">
          Join our platform to connect with talent or employers.
        </p>
        <Image src={animation} alt="" />
      </section>
      <section className="bg-[#FF0046] w-full md:w-1/2 flex justify-center items-center py-10 px-4">
        <RegisterForm />
      </section>
    </main>
  );
}
