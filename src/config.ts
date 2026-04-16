/**
 * Zeus's Storage - Configuration File
 * 
 * Dành cho các nhóm dịch: Bạn có thể dễ dàng thay đổi tên website, 
 * màu sắc chủ đạo và các thông tin cơ bản tại đây.
 */

export const APP_CONFIG = {
  // 1. Thông tin cơ bản
  appName: "Zeus's Storage",
  appDescription: "Nền tảng đọc truyện tranh hiện đại dành cho cộng đồng.",
  author: "Zeus De Prince",
  
  // 2. Màu sắc chủ đạo (Primary Color)
  // Bạn có thể dùng mã màu Hex (VD: #1abc9c, #3498db, #e74c3c...)
  primaryColor: "#1abc9c",
  primaryColorDark: "#16a085",
  
  // 3. Cấu hình Admin
  // Thay email này bằng email Google của bạn để có quyền Admin
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || "admin@example.com",
  
  // 4. Chặn địa lý (Geo-blocking)
  // Danh sách các mã quốc gia muốn chặn (VD: 'VN', 'KR', 'JP'...)
  // Để trống [] nếu không muốn chặn quốc gia nào.
  blockedCountries: ['VN', 'KR', 'JP'],
  
  // 5. Hình ảnh mặc định
  defaultLogo: "https://i.ibb.co/mL55f6z/logo.png",
  
  // 6. Thông tin liên hệ mặc định (Nếu chưa cài đặt trong Database)
  defaultTeamInfo: {
    facebook: "",
    discord: "",
    telegram: "",
    website: "",
    donateQR: ""
  }
};
