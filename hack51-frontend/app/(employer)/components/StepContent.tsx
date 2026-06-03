"use client";

import SelectRole from "./steps/SelectRole";
import SkillLevel from "./steps/SkillLevel";
import RoleDetails from "./steps/RoleDetails";
import Challenge from "./steps/Challenge";
import ChallengeEditor from "./steps/ChallengeEditor";
import RubricEditor from "./steps/RubricEditor";
import RequestPreview from "./steps/RequestPreview";
import Checkout from "./steps/Checkout";
import Completion from "./steps/Completion";

export const stepConfig = [
  { id: 1, label: "Request Details", component: <SelectRole /> },
  { id: 2, label: "Job Description", component: <SkillLevel /> },
  { id: 3, label: "Role Details", component: <RoleDetails /> },
  { id: 4, label: "Challenge Setup", component: <Challenge /> },
  { id: 5, label: "Challenge Editor", component: <ChallengeEditor /> },
  { id: 6, label: "Rubric Editor", component: <RubricEditor /> },
  { id: 7, label: "Request Preview", component: <RequestPreview /> },
  { id: 8, label: "Checkout", component: <Checkout /> },
  {
    id: 9,
    label: "Completion",
    component: (
      <Completion
        icon="✅"
        title="Challenge Request Successfully Created"
        text="Your request has been created successfully! View it in your requests."
      />
    ),
  },
];



export default function StepContent({ step }: { step: number }) {
  const normalized = Math.max(1, Math.min(stepConfig.length, step));
  return stepConfig[normalized - 1]?.component ?? null;
}
