import Link from "next/link";

export default function ChallengeButton() {
  return (
    <button className="flex items-center bg-[#FF0046] hover:bg-red-700 text-white font-bold py-2 px-6 md:px-2 rounded-lg">
      <Link href="/new-request">Hire A New Role</Link>
    </button>
  );
}
