# ⚡ Zeus's Storage - Manga Reader Starter Kit
> **Bản mẫu (Template) Web Đọc Truyện Hiện Đại dành cho các Nhóm Dịch**

![Version](https://img.shields.io/badge/version-2.0.8--official-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzeuswithluv%2FIndivisual-Storage-Web-Project&env=VITE_IMGBB_API_KEY&project-name=my-manga-site&repository-name=my-manga-site)

**Zeus's Storage** không chỉ là một trang web, mà là một **Bộ công cụ (Starter Kit)** mã nguồn mở giúp các nhóm dịch truyện có thể tự xây dựng nền tảng đọc truyện riêng biệt, chuyên nghiệp và hoàn toàn miễn phí chỉ trong vài phút.

---

## 🌟 Tại sao nên dùng bản mẫu này?

- **Tiết kiệm thời gian:** Không cần viết code từ đầu, chỉ cần cấu hình và chạy.
- **Chi phí 0đ:** Sử dụng Vercel (Hosting) và Firebase (Database) gói miễn phí.
- **Trải nghiệm cao cấp:** Giao diện tối ưu cho cả điện thoại và máy tính, hỗ trợ chế độ đọc Webtoon.
- **Dễ dàng tùy chỉnh:** Thay đổi màu sắc, logo, thông tin nhóm dịch ngay trong code.

---

## 🚀 Hướng dẫn triển khai (Dành cho Nhóm dịch)

Xem chi tiết hướng dẫn từ A-Z tại: **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)**

### Tóm tắt nhanh:
1.  **Fork** dự án này về GitHub cá nhân.
2.  Thiết lập **Firebase** (Auth & Firestore).
3.  Lấy API Key từ **ImgBB**.
4.  Triển khai lên **Vercel** và cấu hình **Environment Variables**.

---

## 🛡️ Bảo mật & Tối ưu Chi phí

Dự án này được thiết kế để chạy **hoàn toàn miễn phí** nếu bạn tuân thủ các nguyên tắc sau:
- **Không hardcode thông tin nhạy cảm:** Luôn dùng Environment Variables cho email admin, API keys.
- **Hạn mức Spark (Free):** Firebase gói Spark cung cấp đủ tài nguyên cho các nhóm dịch vừa và nhỏ.
- **Lưu trữ ảnh bên ngoài:** Dùng ImgBB giúp tiết kiệm dung lượng lưu trữ của Firebase.

> **Bài học kinh nghiệm:** Luôn đặt **Budget Alerts** trong Google Cloud Console để kiểm soát chi phí dù bạn đang dùng gói miễn phí. Tránh sử dụng Cloud Run hoặc các dịch vụ tốn phí nếu Vercel/Cloudflare đã đáp ứng được nhu cầu.

---

## ✨ Tính năng tích hợp sẵn

### 📖 Cho Độc giả
- **Đọc truyện đa chế độ:** Cuộn dọc (Zen) hoặc Từng trang (Classic).
- **Theo dõi & Đánh giá:** Lưu truyện yêu thích, chấm điểm 5 sao.
- **Bình luận:** Thảo luận thời gian thực qua Firebase.
- **Theme Engine:** Chế độ Sáng/Tối/Hệ thống mượt mà.

### 🛠️ Cho Nhóm dịch (Admin)
- **Đăng truyện siêu tốc:** Hỗ trợ tải lên cả thư mục (Folder Upload), tự động nhận diện số chương.
- **Quản lý nội dung:** Chỉnh sửa thông tin truyện, thêm/xóa chương dễ dàng.
- **Widget Donate:** Tích hợp mã QR và link mạng xã hội nhóm dịch.

---

## 📺 Demo & Hướng dẫn sử dụng
<div align="center">
  <a href="https://youtu.be/hfFCh0zIS5c" target="_blank">
    <img src="https://img.youtube.com/vi/hfFCh0zIS5c/maxresdefault.jpg" alt="Demo" width="100%" style="border-radius: 12px;">
  </a>
</div>

---

## 🛠️ Cấu trúc dự án (Project Structure)
- `/api`: Vercel Serverless Functions.
- `/functions`: Cloudflare Pages Functions.
- `/public`: Thư mục chứa tài sản tĩnh (Ảnh, Icon, ...).
- `/src/components`: Chứa toàn bộ giao diện người dùng.
- `/src/services`: Các dịch vụ kết nối API bên ngoài (ImgBB, ...).
- `/src/firebase.ts`: Cấu hình SDK và kết nối Database.
- `/src/App.tsx`: Quản lý định tuyến và trạng thái ứng dụng.
- `firestore.rules`: Quy tắc bảo mật Firestore.
- `firebase-blueprint.json`: Sơ đồ cấu trúc dữ liệu ứng dụng.
- `wrangler.jsonc`: Cấu hình cho Cloudflare Pages.

---

## 🤝 Đóng góp & Hỗ trợ
Nếu bạn thấy dự án này hữu ích, hãy tặng nó 1 ⭐ trên GitHub! 
Mọi thắc mắc hoặc yêu cầu tính năng mới, vui lòng mở một **Issue** trên repository này.

**Phát triển bởi:** [Zeus De Prince](https://github.com/zeuswithluv)
**Giấy phép:** MIT - Bạn có quyền sử dụng và chỉnh sửa cho mục đích cá nhân hoặc thương mại.

---
© 2026 Zeus's Storage. Built with ❤️ for the Manga Community.
