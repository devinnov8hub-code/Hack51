"use client";

type Props = {
  id: string;
  title: string;
  description?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

export default function ChallengeCard({
  id,
  title,
  description = "",
  isSelected = false,
  onSelect,
}: Props) {
  return (
    <div
      onClick={() => onSelect?.(id)}
      className={`border rounded-2xl p-6 cursor-pointer ${
        isSelected ? "border-[#FF0046]" : "border-gray-300"
      }`}
    >
      <div className="relative">
        {isSelected && (
          <div className="bg-[#FF0046] border border-[#FF0046] text-white px-3 p-1 rounded-full w-2/6 flex justify-right">
            Selected
          </div>
        )}
        <h2 className="text-xl font-bold mt-4">{title}</h2>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  );
}
