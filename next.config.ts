import type { NextConfig } from "next";

const nextConfig: NextConfig = { serverExternalPackages: ["mysql2"], turbopack: { root: process.cwd() } };
nextConfig.redirects = async () => [
  { source: "/index.php", destination: "/", permanent: false },
  { source: "/login.php", destination: "/login", permanent: false },
  { source: "/admin.php", destination: "/admin", permanent: false },
  { source: "/logout.php", destination: "/api/auth/logout", permanent: false },
  { source: "/data_peserta.php", destination: "/peserta", permanent: false },
  { source: "/monitor.php", destination: "/monitor", permanent: false },
  { source: "/kelola_soal.php", destination: "/kelola-soal", permanent: false },
  { source: "/tambah_soal.php", destination: "/kelola-soal", permanent: false },
  { source: "/jawaban_peserta.php", destination: "/jawaban-peserta", permanent: false },
  { source: "/rekapitulasi.php", destination: "/rekapitulasi", permanent: false },
  { source: "/input_nilai.php", destination: "/input-nilai", permanent: false },
  { source: "/test_day6.php", destination: "/test-day6", permanent: false },
  { source: "/employe/index.php", destination: "/employe", permanent: false },
  { source: "/employe/login.php", destination: "/employe/login", permanent: false },
  { source: "/employe/buat_password.php", destination: "/employe/buat-password", permanent: false },
  { source: "/employe/dashboard.php", destination: "/employe/dashboard", permanent: false },
  { source: "/employe/logout.php", destination: "/api/employee/logout", permanent: false },
];
nextConfig.rewrites = async () => ({
  beforeFiles: [
    { source: "/kode_akses_api.php", destination: "/api/kode-akses" },
    { source: "/save_catatan.php", destination: "/api/catatan" },
    { source: "/save_koreksi.php", destination: "/api/koreksi" },
    { source: "/delete_jawaban.php", destination: "/api/jawaban-hapus" },
    { source: "/get_detail_aadl.php", destination: "/api/detail-aadl" },
    { source: "/get_video_progress.php", destination: "/api/video-progress" },
    { source: "/api.php", destination: "/api/cbt" },
    { source: "/api/get_status.php", destination: "/api/status" },
    { source: "/update_nilai_rekap.php", destination: "/api/rekap/save" },
  ],
});
export default nextConfig;
