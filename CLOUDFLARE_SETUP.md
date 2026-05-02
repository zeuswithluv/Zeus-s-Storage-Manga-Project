# ☁️ Hướng dẫn tích hợp Cloudflare cho Zeus's Storage (Vercel)

Để web của bạn chạy qua Cloudflare một cách mượt mà nhất, hãy thực hiện theo các bước sau:

---

## 1. Cấu hình DNS trên Cloudflare
1. Đăng nhập vào [Cloudflare](https://dash.cloudflare.com/).
2. Thêm site của bạn (ví dụ: `yourdomain.com`).
3. Trong mục **DNS**, hãy trỏ các bản ghi về Vercel:
   - **Type A**: `@` -> `76.76.21.21` (IP của Vercel).
   - **Type CNAME**: `www` -> `cname.vercel-dns.com`.
4. **Quan trọng:** Bật đám mây màu cam (**Proxied**) cho cả 2 bản ghi này.

---

## 2. Cấu hình SSL/TLS (Cực kỳ quan trọng)
Nếu cấu hình sai bước này, web sẽ bị lỗi "Too many redirects".
- Vào mục **SSL/TLS** -> **Overview**.
- Chọn chế độ: **Full** hoặc **Full (Strict)**. 
- *Giải thích:* Vercel mặc định luôn dùng HTTPS, nên Cloudflare cần kết nối với Vercel qua cổng 443.

---

## 3. Thêm Domain vào Vercel
1. Vào **Vercel Dashboard** -> Project Settings -> **Domains**.
2. Thêm tên miền của bạn vào. 
3. Vercel sẽ kiểm tra DNS. Nếu bạn đã cấu hình đúng ở bước 1, nó sẽ hiện dấu tích xanh (có thể mất vài phút).

---

## 4. Tối ưu hóa Web (Page Rules)
Để tránh Cloudflare cache nhầm các trang Admin, hãy vào **Rules** -> **Page Rules**:
- Rule: `yourdomain.com/upload*` -> **Cache Level: Bypass**.
- Rule: `yourdomain.com/add-chapter*` -> **Cache Level: Bypass**.

---

## 5. Xử lý IP người dùng
Hiện tại code của bạn lấy IP qua `/api/ip`. Khi chạy qua Cloudflare, tiêu đề IP sẽ đổi từ `x-forwarded-for` sang `cf-connecting-ip`. Tôi đã cập nhật code bên dưới để tương thích với cả hai.
