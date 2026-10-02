import { avatarSymbols, type Profile } from "./domain";
import { useState } from "react";

export default function ProfileAvatar({
  profile,
  name,
}: {
  profile: Profile;
  name: string;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string>();
  return profile.photo && profile.photo !== failedPhoto ? (
    <img
      className="custom-avatar-photo"
      src={profile.photo}
      alt={`${name} profile photo`}
      onError={() => setFailedPhoto(profile.photo!)}
    />
  ) : (
    <>{avatarSymbols[profile.avatar] || name.charAt(0).toUpperCase()}</>
  );
}
