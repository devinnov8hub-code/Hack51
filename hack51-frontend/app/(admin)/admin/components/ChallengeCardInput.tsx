"use client";

import type { CreateChallengeWithRubric } from "@/types/catalog";
type Props = {
  catalog_role_id?: number;
  title?: string;
  summary?: string;
  scenario: string;
  del: string[];
};

export default function ChallengeCardInput<CreateChallengeWithRubric>({
  catalog_role_id = 0,
  title,
  summary,
  scenario,
  del,
}: Props) {
  return (
    <div className=" relative border rounded-2xl p-6 border-[#FF0046] cursor-pointer w-full">
      <h2 className="text-xl font-bold mt-4 whitespace-wrap">{title}</h2>
      <p className="text-gray-600 mt-2 whitespace-wrap">{summary}</p>

      <div className="gap-4 mt-4">
        <h1>Tests for</h1>
        <div className="flex flex-wrap">
          {del.map((d) => (
            <span
              className="m-2 bg-[#ff0046]/40 text-black text-sm p-1 px-4 rounded-full"
              key={catalog_role_id}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
