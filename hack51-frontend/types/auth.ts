export interface RegisterProps {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
}

export interface LoginProps {
  email: string;
  password: string;
}

export interface VerificationProps {
  email: string;
  otp: number;
}

export interface DashboardRoute {
  employer: "/";
  candidate: "/candidate/dashboard";
  admin: "/admin/dashboard";
}
