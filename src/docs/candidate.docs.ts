/**
 * Candidate auth + profile Swagger doc definitions.
 */
export const candidateDocs = {
  "/candidate/auth/register": {
    post: {
      tags: ["Candidate – Auth"],
      summary: "Register as a candidate",
      description: "Shortcut to /auth/register with role pre-set to 'candidate'. A candidate profile is created after email verification.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" }, example: { email: "talent@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } },
      responses: { 201: { description: "Candidate account created, OTP sent" }, 409: { description: "Email already exists" } },
    },
  },
  "/candidate/auth/login": {
    post: {
      tags: ["Candidate – Auth"],
      summary: "Candidate login",
      description: "Login restricted to candidate accounts only.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" }, example: { email: "talent@example.com", password: "SecurePass1!" } } } },
      responses: { 200: { description: "Candidate authenticated" }, 401: { description: "Invalid credentials" }, 403: { description: "Not a candidate account" } },
    },
  },
  "/candidate/profile": {
    get: {
      tags: ["Candidate – Profile"],
      summary: "Get candidate profile",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Candidate profile" }, 404: { description: "Profile not found" } },
    },
    patch: {
      tags: ["Candidate – Profile"],
      summary: "Update candidate profile",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCandidateProfileInput" }, example: { bio: "Full-stack developer with 5 years experience.", skills: ["TypeScript", "React", "Node.js"], experience_years: 5, location: "Lagos, Nigeria" } } } },
      responses: { 200: { description: "Profile updated" }, 422: { description: "Validation error" } },
    },
  },
};
