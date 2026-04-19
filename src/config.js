// Mengambil URL dari file .env
// Jika .env tidak terbaca, gunakan fallback (opsional)
export const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://quantum.or.id/resto-backend/api/index.php?route=';