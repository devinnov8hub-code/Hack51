const levels = ["Entry Level", "Intermediate Level", "Senior Level", "Lead"];

export default function SkillLevel() {
  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-8 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl">
        Select skill level for the role
      </h2>
      {levels.map((level, index) => (
        <div
          key={index}
          className="p-4 mt-4 gap-4 cursor-pointer hover:bg-gray-100"
        >
          <input type="checkbox" className="rounded-full" />
          <label htmlFor="role" className="ml-5">
            {level}
          </label>
        </div>
      ))}
    </div>
  );
}
