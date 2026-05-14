export type BackendConfigStatus = {
  supabaseUrl: string | null;
  supabaseProjectRef: string | null;
  hasSupabaseAnonKey: boolean;
  aiProxyUrl: string | null;
  hasOpenAiKeyInProcess: boolean;
  aiProxyReady: boolean;
  aiProxyHealth: "unconfigured" | "unknown" | "ready" | "unreachable";
  aiProxyHealthReason?: string;
  localDevelopmentMode: boolean;
  model: string;
};

export type AccountStatus = {
  configured: boolean;
  signedIn: boolean;
  userEmail: string | null;
  userId: string | null;
  backend: BackendConfigStatus;
  reason?: string;
};

export type AccountSignInRequest = {
  email?: string;
  password?: string;
  provider?: "google" | "email";
};

export type AccountSignInResult = {
  success: boolean;
  status: AccountStatus;
  reason?: string;
  nextStep?: string;
};
