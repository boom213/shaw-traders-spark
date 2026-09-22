import { useSession } from "@tanstack/react-start/server";

type GateSession = { unlocked?: boolean };

export const managerSessionConfig = () => ({
  password: process.env['SESSION_SECRET']!,
  name: "shaw-manage",
  maxAge: 60 * 60 * 12,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
});

/** True when the staff gate cookie is unlocked on this request. */
export async function managerUnlocked(): Promise<boolean> {
  const session = await useSession<GateSession>(managerSessionConfig());
  return session.data.unlocked === true;
}

export async function requireManager(): Promise<void> {
  if (!(await managerUnlocked())) throw new Error("Staff sign-in required");
}
