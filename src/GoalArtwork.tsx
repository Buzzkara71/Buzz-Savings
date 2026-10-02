import { useState } from "react";
import type { Goal } from "./domain";

export default function GoalArtwork({
  cover = "journey",
  photo,
  alt = "Custom goal cover",
}: {
  cover?: Goal["cover"];
  photo?: string | null;
  alt?: string;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string>();
  if (photo && photo !== failedPhoto)
    return (
      <img
        className="goal-artwork custom-goal-photo"
        src={photo}
        alt={alt}
        loading="lazy"
        onError={() => setFailedPhoto(photo)}
      />
    );
  return (
    <svg
      className={`goal-artwork artwork-${cover}`}
      viewBox="0 0 480 230"
      fill="none"
      aria-hidden="true"
    >
      <rect
        width="480"
        height="230"
        fill={
          cover === "studio"
            ? "#233d4a"
            : cover === "nest"
              ? "#dce8e8"
              : "#caeef2"
        }
      />
      <circle
        cx="365"
        cy="65"
        r="40"
        fill={cover === "studio" ? "#42616d" : "#f6f9f2"}
      />
      <path d="M0 183Q100 124 237 190T480 164V230H0Z" fill="#9dcdd3" />
      <path d="M0 213Q159 163 315 202T480 195V230H0Z" fill="#73b7c4" />
      {cover === "journey" && (
        <>
          <path d="m58 183 139-139 138 139Z" fill="#538d9f" />
          <path d="m155 86 42-42 45 45-31-12-17 18-15-17Z" fill="#f2f8f8" />
          <path
            d="m315 66 47-18 25-23 10 1-15 23 32 5-7 7-40-1-43 21Z"
            fill="#245469"
          />
          <path
            d="M318 87q-31 48-72 34"
            stroke="#fff"
            strokeWidth="2"
            strokeDasharray="5 6"
          />
          <path
            d="M316 207v-80m-29 34h58m-54-20h50"
            stroke="#294c5d"
            strokeWidth="9"
          />
          <path
            d="M280 130h73m-72-1-8-8m79 8 8-8"
            stroke="#294c5d"
            strokeWidth="8"
          />
        </>
      )}
      {cover === "nest" && (
        <>
          <path d="M168 195v-85l72-53 73 53v85Z" fill="#f8fbf8" />
          <path
            d="m149 116 91-69 92 69"
            stroke="#376a77"
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <rect x="226" y="144" width="32" height="51" rx="4" fill="#649da5" />
          <rect x="180" y="125" width="28" height="28" rx="4" fill="#a4d5dc" />
          <rect x="273" y="125" width="26" height="28" rx="4" fill="#a4d5dc" />
          <path d="M115 202v-71m251 71v-80" stroke="#456e76" strokeWidth="6" />
          <ellipse cx="114" cy="124" rx="26" ry="43" fill="#7fb6ad" />
          <ellipse cx="367" cy="116" rx="30" ry="46" fill="#568f88" />
        </>
      )}
      {cover === "studio" && (
        <>
          <rect
            x="132"
            y="49"
            width="217"
            height="137"
            rx="11"
            fill="#133140"
          />
          <rect x="143" y="59" width="195" height="113" rx="5" fill="#d4f2f3" />
          <path
            d="m117 186-19 14q-3 9 10 9h266q11 0 7-9l-23-14Z"
            fill="#e6eff0"
          />
          <path d="M208 188h66l-6 9h-54Z" fill="#88a9b2" />
          <rect x="157" y="73" width="75" height="85" rx="5" fill="#92d6df" />
          <path
            d="m168 140 13-16 12 8 25-34"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M248 86h71m-71 17h51m-51 19h63m-63 19h34"
            stroke="#71a5b1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="m79 89 5-13 5 13 13 5-13 5-5 13-5-13-13-5Z" fill="#67d4df" />
        </>
      )}
      {cover === "horizon" && (
        <>
          <path d="m-15 193 109-100 80 60 89-122 143 164Z" fill="#78aebc" />
          <path d="m187 139 76-108 139 164H147Z" fill="#3c778d" />
          <path d="m234 74 29-43 36 53-28-12-12 12-9-13Z" fill="#effafb" />
          <path
            d="M209 230q139-25 81-46t12-23"
            stroke="#e2f4ed"
            strokeWidth="16"
          />
          <path
            d="M57 195v-42m-18 14 18-32 19 32Z"
            fill="#245365"
            stroke="#245365"
            strokeWidth="5"
          />
        </>
      )}
      <path d="m46 47 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill="#fff" opacity=".85" />
      <circle cx="422" cy="110" r="4" fill="#fff" opacity=".75" />
    </svg>
  );
}
