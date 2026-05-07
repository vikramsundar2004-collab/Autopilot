import type { CodingPlugin } from "./coding.js";

export type CodingPluginInstaller = "shell" | "winget";

export type CodingPluginDefinition = CodingPlugin & {
  checkCommand: string;
  installCommand: string;
  installArgs?: string[];
  installer: CodingPluginInstaller;
  estimatedSeconds: number;
};

type WingetPluginInput = Omit<CodingPlugin, "command"> & {
  packageId: string;
  checkCommand: string;
  estimatedSeconds?: number;
};

type NpmPluginInput = Omit<CodingPlugin, "command"> & {
  packageName: string;
  binary: string;
  estimatedSeconds?: number;
};

function wingetPlugin(input: WingetPluginInput): CodingPluginDefinition {
  const installArgs = [
    "install",
    "--id",
    input.packageId,
    "--exact",
    "--silent",
    "--accept-package-agreements",
    "--accept-source-agreements",
    "--disable-interactivity"
  ];
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    description: input.description,
    command: `winget install --id ${input.packageId} --exact --silent`,
    checkCommand: input.checkCommand,
    installCommand: `winget ${installArgs.join(" ")}`,
    installArgs,
    installer: "winget",
    estimatedSeconds: input.estimatedSeconds ?? 180
  };
}

function npmPlugin(input: NpmPluginInput): CodingPluginDefinition {
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    description: input.description,
    command: `npm install -g ${input.packageName}`,
    checkCommand: `${input.binary} --version`,
    installCommand: `npm install -g ${input.packageName}`,
    installer: "shell",
    estimatedSeconds: input.estimatedSeconds ?? 90
  };
}

export const CODING_PLUGIN_DEFINITIONS: CodingPluginDefinition[] = [
  wingetPlugin({
    id: "node",
    name: "Node.js CLI",
    category: "Runtime",
    description: "Run npm, Vite, TypeScript, React, and JavaScript tooling from project folders.",
    packageId: "OpenJS.NodeJS.LTS",
    checkCommand: "node --version",
    estimatedSeconds: 180
  }),
  wingetPlugin({
    id: "git",
    name: "Git",
    category: "Source control",
    description: "Clone repositories, manage branches, inspect diffs, and prepare reviewable patches.",
    packageId: "Git.Git",
    checkCommand: "git --version",
    estimatedSeconds: 180
  }),
  wingetPlugin({
    id: "python",
    name: "Python",
    category: "Runtime",
    description: "Run Python scripts, virtual environments, notebooks, data tools, and automation helpers.",
    packageId: "Python.Python.3.12",
    checkCommand: "python --version",
    estimatedSeconds: 240
  }),
  wingetPlugin({
    id: "gh",
    name: "GitHub CLI",
    category: "Source control",
    description: "Authenticate GitHub, inspect issues and PRs, create pull requests, and automate repo work.",
    packageId: "GitHub.cli",
    checkCommand: "gh --version",
    estimatedSeconds: 180
  }),
  npmPlugin({
    id: "typescript",
    name: "TypeScript",
    category: "Quality",
    description: "Run type checks and compile TypeScript projects from Autopilot terminals.",
    packageName: "typescript",
    binary: "tsc"
  }),
  npmPlugin({
    id: "eslint",
    name: "ESLint",
    category: "Quality",
    description: "Lint JavaScript and TypeScript projects before Autopilot proposes a patch.",
    packageName: "eslint",
    binary: "eslint"
  }),
  npmPlugin({
    id: "prettier",
    name: "Prettier",
    category: "Formatting",
    description: "Format code consistently across projects before review.",
    packageName: "prettier",
    binary: "prettier"
  }),
  npmPlugin({
    id: "vitest",
    name: "Vitest",
    category: "Testing",
    description: "Run fast unit and integration tests for Vite, React, and TypeScript projects.",
    packageName: "vitest",
    binary: "vitest"
  }),
  npmPlugin({
    id: "playwright",
    name: "Playwright",
    category: "Testing",
    description: "Drive browser QA flows, screenshots, and regression tests from the Coding workspace.",
    packageName: "playwright",
    binary: "playwright",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "pnpm",
    name: "pnpm",
    category: "Package manager",
    description: "Install monorepo dependencies quickly and work with pnpm workspace projects.",
    packageName: "pnpm",
    binary: "pnpm"
  }),
  npmPlugin({
    id: "yarn",
    name: "Yarn",
    category: "Package manager",
    description: "Support projects that use Yarn scripts, lockfiles, and workspace commands.",
    packageName: "yarn",
    binary: "yarn"
  }),
  wingetPlugin({
    id: "bun",
    name: "Bun",
    category: "Runtime",
    description: "Run Bun-based JavaScript projects, package installs, and fast test scripts.",
    packageId: "Oven-sh.Bun",
    checkCommand: "bun --version",
    estimatedSeconds: 120
  }),
  wingetPlugin({
    id: "deno",
    name: "Deno",
    category: "Runtime",
    description: "Run secure TypeScript scripts, Deno apps, and standalone automation tasks.",
    packageId: "DenoLand.Deno",
    checkCommand: "deno --version",
    estimatedSeconds: 120
  }),
  wingetPlugin({
    id: "uv",
    name: "uv",
    category: "Python",
    description: "Create Python environments and install Python dependencies much faster than pip alone.",
    packageId: "astral-sh.uv",
    checkCommand: "uv --version",
    estimatedSeconds: 120
  }),
  wingetPlugin({
    id: "rust",
    name: "Rust toolchain",
    category: "Runtime",
    description: "Build Rust projects with rustup, cargo, rustc, and standard Rust tooling.",
    packageId: "Rustlang.Rustup",
    checkCommand: "rustc --version",
    estimatedSeconds: 240
  }),
  wingetPlugin({
    id: "go",
    name: "Go",
    category: "Runtime",
    description: "Build Go services, CLIs, tests, and backend automation projects.",
    packageId: "GoLang.Go",
    checkCommand: "go version",
    estimatedSeconds: 180
  }),
  wingetPlugin({
    id: "dotnet",
    name: ".NET SDK",
    category: "Runtime",
    description: "Build C#, ASP.NET, MAUI, and .NET CLI projects from Autopilot.",
    packageId: "Microsoft.DotNet.SDK.8",
    checkCommand: "dotnet --version",
    estimatedSeconds: 240
  }),
  wingetPlugin({
    id: "jdk",
    name: "Java JDK",
    category: "Runtime",
    description: "Compile Java projects and run Gradle, Maven, Android, and JVM-based tooling.",
    packageId: "EclipseAdoptium.Temurin.21.JDK",
    checkCommand: "java --version",
    estimatedSeconds: 240
  }),
  wingetPlugin({
    id: "docker",
    name: "Docker Desktop",
    category: "Containers",
    description: "Run local containers, databases, services, and integration-test environments.",
    packageId: "Docker.DockerDesktop",
    checkCommand: "docker --version",
    estimatedSeconds: 420
  }),
  wingetPlugin({
    id: "postgres",
    name: "PostgreSQL",
    category: "Database",
    description: "Use psql and local Postgres tooling for app development and database debugging.",
    packageId: "PostgreSQL.PostgreSQL",
    checkCommand: "psql --version",
    estimatedSeconds: 360
  }),
  npmPlugin({
    id: "supabase",
    name: "Supabase CLI",
    category: "Database",
    description: "Run Supabase local dev, migrations, generated types, and database workflows.",
    packageName: "supabase",
    binary: "supabase",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "netlify",
    name: "Netlify CLI",
    category: "Deploy",
    description: "Run Netlify dev, deploy previews, serverless functions, and environment commands.",
    packageName: "netlify-cli",
    binary: "netlify",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "vercel",
    name: "Vercel CLI",
    category: "Deploy",
    description: "Build, preview, and deploy Vercel apps directly from a coding task.",
    packageName: "vercel",
    binary: "vercel",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "firebase",
    name: "Firebase CLI",
    category: "Deploy",
    description: "Manage Firebase hosting, functions, emulators, and project deployment.",
    packageName: "firebase-tools",
    binary: "firebase",
    estimatedSeconds: 150
  }),
  npmPlugin({
    id: "wrangler",
    name: "Cloudflare Wrangler",
    category: "Deploy",
    description: "Build and deploy Cloudflare Workers, Pages, D1, KV, and edge functions.",
    packageName: "wrangler",
    binary: "wrangler",
    estimatedSeconds: 120
  }),
  wingetPlugin({
    id: "aws",
    name: "AWS CLI",
    category: "Cloud",
    description: "Inspect AWS resources, deploy services, and script cloud workflows with approval.",
    packageId: "Amazon.AWSCLI",
    checkCommand: "aws --version",
    estimatedSeconds: 180
  }),
  wingetPlugin({
    id: "azure",
    name: "Azure CLI",
    category: "Cloud",
    description: "Manage Azure resources, deployments, logs, and cloud app debugging.",
    packageId: "Microsoft.AzureCLI",
    checkCommand: "az --version",
    estimatedSeconds: 240
  }),
  wingetPlugin({
    id: "gcloud",
    name: "Google Cloud CLI",
    category: "Cloud",
    description: "Manage Google Cloud projects, auth, logs, deploys, and app infrastructure.",
    packageId: "Google.CloudSDK",
    checkCommand: "gcloud --version",
    estimatedSeconds: 240
  }),
  wingetPlugin({
    id: "terraform",
    name: "Terraform",
    category: "Infrastructure",
    description: "Plan and inspect infrastructure changes before any approval-gated apply step.",
    packageId: "Hashicorp.Terraform",
    checkCommand: "terraform --version",
    estimatedSeconds: 120
  }),
  wingetPlugin({
    id: "kubectl",
    name: "kubectl",
    category: "Infrastructure",
    description: "Inspect Kubernetes resources, logs, and deployment state from Autopilot.",
    packageId: "Kubernetes.kubectl",
    checkCommand: "kubectl version --client",
    estimatedSeconds: 120
  }),
  wingetPlugin({
    id: "helm",
    name: "Helm",
    category: "Infrastructure",
    description: "Work with Helm charts, releases, and Kubernetes app packaging.",
    packageId: "Helm.Helm",
    checkCommand: "helm version --short",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "expo",
    name: "Expo CLI",
    category: "Mobile",
    description: "Build and run React Native and Expo apps from the Coding workspace.",
    packageName: "expo",
    binary: "expo",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "eas",
    name: "EAS CLI",
    category: "Mobile",
    description: "Build, submit, and manage Expo app builds after explicit approval.",
    packageName: "eas-cli",
    binary: "eas",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "ionic",
    name: "Ionic CLI",
    category: "Mobile",
    description: "Build Ionic and Capacitor mobile apps and run project commands.",
    packageName: "@ionic/cli",
    binary: "ionic",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "codex",
    name: "OpenAI Codex CLI",
    category: "AI coding",
    description: "Use OpenAI's local coding agent CLI for terminal-based repo tasks and reviews.",
    packageName: "@openai/codex",
    binary: "codex",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "claude-code",
    name: "Claude Code",
    category: "AI coding",
    description: "Use Anthropic's coding-agent CLI for alternate repo investigation and edit workflows.",
    packageName: "@anthropic-ai/claude-code",
    binary: "claude",
    estimatedSeconds: 120
  }),
  npmPlugin({
    id: "gemini",
    name: "Gemini CLI",
    category: "AI coding",
    description: "Use Google's Gemini command-line assistant for repo and terminal workflows.",
    packageName: "@google/gemini-cli",
    binary: "gemini",
    estimatedSeconds: 120
  })
];

export const CODING_PLUGIN_CATALOG: CodingPlugin[] = CODING_PLUGIN_DEFINITIONS.map(({ id, name, category, description, command }) => ({
  id,
  name,
  category,
  description,
  command
}));
