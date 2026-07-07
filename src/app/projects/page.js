import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProjectsList from "./ProjectsList";
import NicknameOverlay from "./NicknameOverlay";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <>
      <ProjectsList />
      {!session.user.nickname && <NicknameOverlay />}
    </>
  );
}
