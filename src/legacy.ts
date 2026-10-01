// Compatibility labels for existing Ruang browser data and JSON backups.
// User-written names and notes are preserved; only known demo copy is translated.
export const legacyLabels: Record<string, string> = {
  "Makan & minum": "Food & drinks",
  Belanja: "Shopping",
  Transportasi: "Transport",
  Tagihan: "Bills",
  Hiburan: "Entertainment",
  Lainnya: "Other",
  Gaji: "Salary",
  Tinggi: "High",
  Sedang: "Medium",
  Rendah: "Low",
  Pribadi: "Personal",
  Pekerjaan: "Work",
  "Pengembangan diri": "Personal growth",
  Kesehatan: "Health",
};

export const legacyDemoCopy: Record<string, string> = {
  "Kopi & cerita sore": "Afternoon coffee",
  "Belanja kebutuhan bulanan": "Monthly groceries",
  "Perjalanan ke kantor": "Commute to work",
  "Langganan Spotify": "Spotify subscription",
  "Makan siang & jajan": "Lunch and snacks",
  "Internet & listrik": "Internet and electricity",
  "Buku dan kebutuhan rumah": "Books and home essentials",
  "Bensin & transportasi": "Fuel and transport",
  "Nonton akhir pekan": "Weekend movie",
  "Donasi bulanan": "Monthly donation",
  "Gaji bulanan": "Monthly salary",
  "Proyek desain freelance": "Freelance design project",
  "Pengeluaran bulan lalu": "Last month’s expenses",
  "Gaji bulan lalu": "Last month’s salary",
  "Selesaikan proposal proyek": "Finish the project proposal",
  "Catat pengeluaran minggu ini": "Log this week’s expenses",
  "Baca buku 20 halaman": "Read 20 pages",
  "Rencanakan menu minggu depan": "Plan next week’s meals",
  "Olahraga pagi 30 menit": "Exercise for 30 minutes",
  "Rapikan meja kerja": "Tidy up your desk",
  "Liburan ke Jepang": "Trip to Japan",
  "Dana darurat": "Emergency fund",
  "Laptop baru": "New laptop",
};

export function translateLegacy(
  value: unknown,
  dictionary: Record<string, string>,
): unknown {
  return typeof value === "string" && Object.hasOwn(dictionary, value)
    ? dictionary[value]
    : value;
}
