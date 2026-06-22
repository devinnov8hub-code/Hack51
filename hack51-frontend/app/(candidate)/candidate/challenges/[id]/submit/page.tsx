"use client";

import Link from "next/link";
import { ArrowLeft, Link2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmployerRequest } from "@/types/employer";
import { challengeService } from "@/lib/services/challenge.service";
import { CandidateSubmission } from "@/types/submissions";
import { toast } from "react-toastify";
import { uploadFile } from "@/lib/services/upload.service";

export default function SubmitPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<EmployerRequest | null>(null);
  const [submitData, setSubmitData] = useState<CandidateSubmission>({
    artifact_urls: [],
    artifact_type: "link",
    submission_statement: "",
    integrity_declared: false,
  });
  const [uploadedLink, setUploadedLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const fetchChallengeById = async () => {
      try {
        const response =
          await challengeService.getCandidateChallengeDetails(id);
        setChallenge(response.data);
      } catch (err) {
        console.error("Failed to fetch challenge details:", err);
      }
    };
    fetchChallengeById();
  }, [id]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const public_url = await uploadFile(file);
      if (!public_url) {
        toast.error("Upload failed");
        return;
      }
      setSubmitData((prev) => ({
        ...prev,
        artifact_urls: [...prev.artifact_urls, public_url],
        artifact_type: "upload",
      }));
      toast.success("File uploaded successfully!");
      return public_url;
    } catch (err) {
      console.error("Failed to upload challenge file:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "artifact_url") {
      setUploadedLink(value);

      // setSubmitData((prev) => ({
      //   ...prev,
      //   artifact_urls: value ? [value] : [],

      // }));
      return;
    }

    setSubmitData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleFileUpload(file);
  };

  const handleContinue = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    const artifacts = [
      ...(uploadedLink ? [uploadedLink] : []),
      ...submitData.artifact_urls,
    ];

    if (artifacts.length === 0) {
      toast.error("Artifact URL is required to continue.");
      return;
    }
    const finalSubmitData = {
      ...submitData,
      artifact_urls: artifacts,
    };

    sessionStorage.setItem("submission_data", JSON.stringify(finalSubmitData));
    router.push(`/candidate/challenges/${id}/review`);

  };

  return (
    <>
      <div className="mb-2">
        <Link
          href={`/candidate/challenges/${id}`}
          className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#FF1F5A] transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{challenge?.title}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{challenge?.role_level}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
        <form onSubmit={handleContinue}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Submission Manifest
            </h2>
            <button
              type="submit"
              disabled={isUploading}
              className="bg-[#FF1F5A] hover:bg-[#e01550] text-white font-semibold px-8 py-2.5 rounded-lg text-sm transition-colors"
            >
              {isUploading ? "Uploading..." : "Continue"}
            </button>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              Submission Statement
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              A brief summary of how you solved the challenge.
            </p>
            <textarea
              name="submission_statement"
              placeholder="Type something..."
              className="w-full border border-gray-200 rounded-lg p-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] resize-none transition-colors min-h-35"
              value={submitData.submission_statement}
              onChange={handleChange}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              Artifact Upload
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              For MVP, provide a secure URL to your deliverables (e.g. Google
              Drive folder, GitHub Repo). Ensure public view access.
            </p>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    name="artifact_url"
                    placeholder="Provide a public link e.g github repo, google drive folder"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] transition-colors"
                    value={uploadedLink}
                    onChange={handleChange}
                  />
                  <Link2
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.zip"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#FF1F5A] transition-colors cursor-pointer"
                    onChange={handleChangeFile}
                  />

                  <Upload
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
