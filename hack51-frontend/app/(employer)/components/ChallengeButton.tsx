
import Link from "next/link";

export default function ChallengeButton() {
  return (
  <div>
          <Link
            href="/new-request"
            className="bg-[#FF0046] hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            Hire A New Role
          </Link>
        </div>
    );
}
