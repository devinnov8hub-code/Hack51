"use client";

import { Trash2, PlusCircle } from "lucide-react";
import { useState } from "react";

interface ChallengeProps {
  title: string;
  scenario: string;
  deliverables: string[];
  rules: string;
  submission_requirements: string;
}

export default function ChallengeEditor({
  deliverables: initialDeliverables,
}: ChallengeProps) {
  const [deliverable, setDeliverable] = useState<string[]>(initialDeliverables);
  const [value, setValue] = useState("");

  const addDeliverable = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent,
  ) => {
    e.preventDefault();
    if (!value.trim()) return;
    setDeliverable([...deliverable, value]);
    setValue("");
  };

  const removeDeliverable = (index: number) => {
    const newDeliverables = [...deliverable];
    newDeliverables.splice(index, 1);
    setDeliverable(newDeliverables);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl">Challenge Editor</h2>

      <div className="bg-white rounded-xl mt-12">
        <h2>Scenario</h2>
        <textarea
          className="border border-gray-100 bg-gray-50 p-5 rounded-lg w-full"
          rows={5}
          placeholder="Enter scenario description"
        ></textarea>
      </div>

      <div className="bg-white rounded-xl mt-12">
        <h2>Deliverables</h2>
        <section className="mt-4">
          {deliverable.map((d, index) => (
            <div className="flex justify-between items-center" key={index}>
              <div className="border border-gray-100 bg-gray-50 p-2 rounded-lg w-full">
                <p>{d}</p>
              </div>
              <button
                onClick={() => removeDeliverable(index)}
                className="ml-4 hover:text-red-700"
              >
                <Trash2 />
              </button>
            </div>
          ))}
          <form onSubmit={addDeliverable} className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Add Deliverable"
                className="border border-dashed rounded-full p-2 pl-10"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <PlusCircle
                className="ml-2 cursor-pointer absolute top-0 bottom-0 left-0 my-auto text-gray-400"
                onClick={addDeliverable}
              />
            </div>
          </form>
        </section>
      </div>

      <div className="bg-white rounded-xl mt-12">
        <h2>Tooling Requirements & Restrictions</h2>
        <textarea
          rows={5}
          placeholder="Enter tooling requirements"
          className="border border-gray-100 w-full bg-gray-50 p-5 rounded-lg"
        ></textarea>
      </div>

      <div className="bg-white rounded-xl mt-12">
        <h2>Submission Requirements</h2>
        <textarea
          rows={5}
          className="border border-gray-100 bg-gray-50 p-5 rounded-lg w-full"
          placeholder="Enter submission requirements"
        ></textarea>
      </div>
    </div>
  );
}
