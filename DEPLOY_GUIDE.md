# 📖 Hướng dẫn Triển khai & Tối ưu Chi phí từ A-Z

Chào mừng bạn đến với hướng dẫn chi tiết dành cho người mới bắt đầu. Tài liệu này giúp bạn tự xây dựng kho lưu trữ truyện cá nhân từ mã nguồn **Zeus's Storage**, đảm bảo an toàn bảo mật và đặc biệt là **KHÔNG TỐN PHÍ**.

---

## 1. 🚀 Hướng dẫn Triển khai (Dành cho bản Fork/Clone)

### Bước 1: Fork Repository
1. Nhấn nút **Fork** ở góc trên cùng bên phải của repository này để copy toàn bộ mã nguồn về tài khoản GitHub của bạn.
2. Bây giờ bạn có thể sửa đổi bất kỳ file nào (như logo, tên web trong `index.html`) mà không ảnh hưởng đến bản gốc.

### Bước 2: Thiết lập Database & Auth (Firebase)
*Đây là "trái tim" của ứng dụng, nơi lưu trữ thông tin truyện và người dùng.*

1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Tạo dự án mới (Ví dụ: `my-manga-storage`). **Lưu ý: TẤT CẢ dịch vụ Google Cloud/Firebase đều có hạn mức miễn phí (Free Tier). Nếu quy mô nhỏ, bạn sẽ không bao giờ bị tính phí.**
3. **Firestore Database**:
   - Chọn "Create database".
   - Chọn khu vực gần bạn (Ví dụ: `asia-southeast1`).
   - Chọn "Test mode" ban đầu để dễ thiết lập, nhưng **phải cập nhật Rules ngay lập tức** (xem phần Bảo mật bên dưới).
4. **Authentication**:
   - Bật "Google Sign-in" (Đây là cách an toàn và miễn phí nhất).
5. **Lấy config**:
   - Vào Settings dự án (icon bánh răng) -> General.
   - Thêm một app Web `</>`.
   - Copy nội dung `firebaseConfig`.
   - Tạo file `src/firebase-applet-config.json` trong code của bạn và dán vào.

### Bước 3: Lưu trữ ảnh (ImgBB)
*Ứng dụng này dùng ImgBB để lưu ảnh truyện, giúp giảm tải dung lượng cho server và tiết kiệm chi phí database.*

1. Đăng ký tại [ImgBB API](https://api.imgbb.com/).
2. Lấy **API Key**. Bạn sẽ cần key này ở bước sau.

### Bước 4: Triển khai Hosting (Vercel)
1. Truy cập [Vercel](https://vercel.com/) và kết nối với GitHub.
2. Chọn repo bạn vừa Fork.
3. **Cấu hình Environment Variables** (Cực kỳ quan trọng để bảo mật):
   - `VITE_IMGBB_API_KEY`: Dán Key ImgBB vào đây.
   - `VITE_ADMIN_EMAIL`: Nhập email Google của bạn (email bạn dùng để đăng nhập web). Chỉ email này mới có quyền Admin.
4. Nhấn **Deploy**.

---

## 2. 💸 Cách hạn chế phát sinh chi phí tối đa

1. **Sử dụng Cloud Serverless thay vì Virtual Machine**: Đừng bao giờ thuê VPS hay chạy Cloud Run liên tục nếu không cần thiết. Vercel và Cloudflare Pages (Hosting) là **miễn phí** cho mục đích cá nhân.
2. **Tối ưu hóa Database (Firestore)**:
   - Sử dụng ImgBB để chứa ảnh thay vì upload trực tiếp lên Storage của Firebase (vốn có giới hạn dung lượng nhỏ).
   - Hạn chế các truy vấn (Queries) quá phức tạp hoặc lặp lại liên tục.
3. **Vòng đời dữ liệu**: Xóa các chương cũ hoặc truyện không còn sử dụng để giữ database gọn nhẹ.
4. **Hạn mức Google Cloud**: Đừng bật các dịch vụ trả phí của Google Cloud nếu bạn chỉ cần Firebase. Firebase gói **Spark (Free)** là đủ cho 50.000 lượt đọc mỗi ngày.

---

## 3. ⚠️ Những sai sót "Xương máu" (Lessons Learned)

Đừng lặp lại những lỗi này để tránh mất tiền hoặc lộ thông tin cá nhân:

1. **KHÔNG BAO GIỜ hardcode email cá nhân vào code**:
   - *Lỗi cũ:* Viết thẳng `if (email == "my-email@gmail.com")` trong `firestore.rules`.
   - *Hệ quả:* Khi bạn push lên GitHub công khai, cả thế giới sẽ thấy email của bạn.
   - *Cách đúng:* Sử dụng Environment Variables (`process.env`) hoặc kiểm tra qua Database (bảng `admins`).

2. **Cẩn thận với Cloud Run / Virtual Machines**:
   - *Lỗi cũ:* Chạy server full-stack trên Cloud Run mà không giới hạn instance hoặc bật các dịch vụ tốn phí của Google Cloud.
   - *Cách đúng:* Ưu tiên Frontend-Only (SPA) chạy trên Vercel/GitHub Pages. Chỉ dùng Backend khi thực sự cần thiết và phải cấu hình giới hạn (Budget Alerts).

3. **Luôn kiểm tra Firestore Rules**:
   - Đừng để Rules là `allow read, write: if true;`. Kẻ xấu có thể xóa sạch database của bạn trong 1 giây.
   - Sử dụng các quy tắc bảo mật nghiêm ngặt (kiểm tra `request.auth.uid`).

4. **Quên đặt Ngưỡng cảnh báo chi phí (Budget Alerts)**:
   - Luôn vào Google Cloud Billing và đặt cảnh báo khi chi phí vượt quá $1. Điều này giúp bạn phát hiện sớm nếu code bị lỗi vòng lặp gây tốn tài nguyên.

---

## 4. 🛠️ Tùy biến mã nguồn

- **Tên ứng dụng:** Sửa thẻ `<title>` trong `index.html`.
- **Màu sắc/Giao diện:** Chỉnh sửa các biến CSS trong `src/index.css`.
- **Logo/Icon:** Thay thế các file trong thư mục `/public`.

*Chúc bạn xây dựng được kho lưu trữ truyện ưng ý!*
