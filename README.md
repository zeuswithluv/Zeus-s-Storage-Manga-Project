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

### Bước 1: Chuẩn bị tài khoản
1.  Tạo tài khoản [GitHub](https://github.com/).
2.  Tạo tài khoản [Vercel](https://vercel.com/).
3.  Tạo tài khoản [Firebase](https://console.firebase.google.com/).
4.  Tạo tài khoản [ImgBB](https://imgbb.com/) để lấy API Key (Dùng để lưu trữ ảnh truyện).

### Bước 2: Thiết lập Firebase (Quan trọng)
1.  Tạo một dự án mới trên Firebase.
2.  Vào **Authentication** -> Bật **Google Sign-in**.
3.  Vào **Firestore Database** -> Tạo database (chọn chế độ test hoặc production).
4.  Vào **Project Settings** -> Cuộn xuống phần **Your apps** -> Chọn biểu tượng Web `</>` để lấy thông tin cấu hình.
5.  Tạo file `src/firebase-applet-config.json` trong dự án của bạn và dán thông tin đó vào (Xem file mẫu `firebase-applet-config.json`).

### Bước 3: Triển khai lên Vercel
1.  Nhấn vào nút **Deploy with Vercel** ở đầu trang này.
2.  Vercel sẽ yêu cầu bạn kết nối GitHub và tạo một kho lưu trữ mới.
3.  Trong phần **Environment Variables**, hãy thêm:
    -   **Key:** `VITE_IMGBB_API_KEY`
    -   **Value:** (Mã API Key lấy từ ImgBB của bạn).
4.  Nhấn **Deploy** và đợi 2 phút.

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

## 🛠️ Cấu trúc dự án (Dành cho Developer)
- `/src/components`: Chứa toàn bộ giao diện (Reader, Upload, MangaDetail...).
- `/src/firebase.ts`: Cấu hình kết nối Database.
- `/src/App.tsx`: Quản lý định tuyến (Routing) và Auth.
- `firestore.rules`: Quy tắc bảo mật cho Database (Hãy nạp vào Firebase để bảo vệ dữ liệu).

---

## 🤝 Đóng góp & Hỗ trợ
Nếu bạn thấy dự án này hữu ích, hãy tặng nó 1 ⭐ trên GitHub! 
Mọi thắc mắc hoặc yêu cầu tính năng mới, vui lòng mở một **Issue** trên repository này.

**Phát triển bởi:** [Zeus De Prince](https://github.com/zeuswithluv)
**Giấy phép:** MIT - Bạn có quyền sử dụng và chỉnh sửa cho mục đích cá nhân hoặc thương mại.

---
© 2026 Zeus's Storage. Built with ❤️ for the Manga Community.
