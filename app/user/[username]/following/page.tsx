"use client";

import { useParams } from "next/navigation";
import ProfileConnections from "@/components/ProfileConnections";

export default function FollowingPage() {
  const params = useParams<{ username: string }>();

  return <ProfileConnections username={params.username} kind="following" />;
}
