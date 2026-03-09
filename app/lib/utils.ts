import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Unbekanntes Datum";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeDate(date: string | Date): string {
  if (!date) return "Unbekanntes Datum";
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Unbekanntes Datum";
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `Vor ${minutes} Min.`;
  if (hours < 24) return `Vor ${hours} Std.`;
  if (days < 7) return `Vor ${days} Tagen`;
  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "...";
}

export function extractLinkedInPostId(url: string): string | null {
  const match = url.match(/urn:li:(?:activity|ugcPost|share):(\d+)/);
  if (match) return match[0];
  const activityMatch = url.match(/activity[:\-/](\d+)/);
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`;
  return null;
}
