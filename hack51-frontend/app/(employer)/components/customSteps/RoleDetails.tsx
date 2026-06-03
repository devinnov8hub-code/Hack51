const details = [{ title: "Role Title" }, { title: "Role Level" }];

export default function RoleDetails() {
  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl">Role Details</h2>
      {details.map((detail, index) => (
        <div className="flex items-center" key={index}>
          <label className="block mt-4 mb-2 font-semibold">
            {detail.title}
          </label>
          <input
            type="text"
            className="block mt-4 m-4 p-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500"
            // value={detail.value}
          />
        </div>
      ))}

      <div className="bg-white rounded-xl mt-12">
        <h2 className="border-b border-b-gray-300 text-xl">
          Role Capabilities
        </h2>
        <section className="grid w-full grid-cols-1 md:grid-cols-2 md:gap-4 mt-4">
          <div className="border border-gray-100 bg-gray-50 p-5 rounded-lg">
            <input
              className="border-b border-gray-200 p-4 w-full rounded focus:ring-1 focus:ring-[#FF0046]"
              placeholder="Enter Capability Title"
            />

            <input
              className="mt-4 p-4 border border-gray-300 rounded-lg w-full focus:ring-1 focus:ring-[#FF0046]"
              placeholder="Describe the capability summary"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
