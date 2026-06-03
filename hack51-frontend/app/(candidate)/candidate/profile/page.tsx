"use client";

import { Camera, Plus } from "lucide-react";

const jobRoles = [
  "Software Engineer",
  "Product Designer",
  "Data Analyst",
  "Backend Engineer",
  "Frontend Engineer",
  "DevOps Engineer",
  "Product Manager",
];

export default function ProfilePage() {
  return (
 <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Change your settings</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-lg bg-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-400 transition-colors">
            Discard Changes
          </button>
          <button className="px-5 py-2.5 rounded-lg bg-[#FF1F5A] hover:bg-[#e01550] text-white text-sm font-semibold transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <Camera size={22} className="text-gray-400" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Edit Avatar</p>
            <button className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 transition-colors">
              upload image <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Name & Email */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Change Name</label>
            <input
              type="text"
              placeholder="Former name"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Change e-mail</label>
            <input
              type="email"
              placeholder="Former e-mail"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Password & security</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input
                type="password"
                placeholder="Old Password"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Job Role */}
        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Change Job role</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Select a job below</label>
            <select className="w-72 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#FF1F5A] bg-white appearance-none cursor-pointer">
              {jobRoles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
   </>
  );
}
