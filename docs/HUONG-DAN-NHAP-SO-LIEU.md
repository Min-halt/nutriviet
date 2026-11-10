# Hướng dẫn nhập số liệu món đã kiểm tra

Dành cho nhóm khi thay số liệu ước lượng bằng số liệu đã kiểm tra theo **Bảng thành phần thực phẩm Việt Nam**.

## Quy trình

1. Mở file **`data/mon-an.csv`** bằng Google Sheets hoặc Excel:
   - **Google Sheets:** File → Import → Upload → chọn file → "Replace spreadsheet".
   - **Excel:** mở trực tiếp file (chữ tiếng Việt hiển thị đúng).
2. Sửa số liệu từng món (mỗi món một dòng). Món nào đã kiểm tra xong thì:
   - đặt cột **`verified`** = `true`
   - ghi cột **`nguon_so_lieu`**, ví dụ: `BTPTP VN 2007 + công thức nhóm (100g bánh phở, 80g thịt bò...)`
3. Lưu lại thành CSV:
   - **Google Sheets:** File → Download → **Comma-separated values (.csv)**
   - **Excel:** File → Save As → **CSV UTF-8 (Comma delimited)**
4. Chép file vừa lưu đè lên `data/mon-an.csv` trong thư mục dự án.
5. Mở Terminal trong thư mục dự án, chạy:
   ```bash
   npm run nhap-mon
   ```
   - Nếu có lỗi: công cụ ghi rõ **dòng nào, cột nào, sai gì** và **không thay đổi gì** trong app. Sửa trong file CSV rồi chạy lại.
   - Nếu thành công: dữ liệu mới đã vào `data/dishes.json`.
6. Chạy `npm test` để chắc thực đơn vẫn tạo đúng với số liệu mới, rồi commit.

> Không cài được Node.js? Gửi file CSV cho người làm code (hoặc Claude) để chạy giúp các bước 4–6.

## Ý nghĩa các cột

| Cột | Ghi gì | Ví dụ |
|---|---|---|
| `id` | Mã món, chữ thường không dấu, nối bằng `-`. **Không đổi id của món đã có** (nhật ký người dùng lưu theo id) | `com-tam-suon` |
| `ten_mon` | Tên hiển thị | `Cơm tấm sườn` |
| `bua` | Bữa phù hợp, nhiều bữa ngăn bằng `\|` | `sang\|trua\|toi` |
| `kcal`, `dam_g`, `tinh_bot_g`, `beo_g` | Dinh dưỡng của **phần vừa** | `600`, `30`, `75`, `20` |
| `he_so_it`, `he_so_vua`, `he_so_nhieu` | Hệ số khẩu phần so với phần vừa (`he_so_vua` luôn là 1) | `0,7`, `1`, `1,3` |
| `gia_vnd` | Giá ước tính một phần | `35000` |
| `phut_nau` | Thời gian nấu (món mua ngoài ghi `0`) | `20` |
| `an_ngoai` | Thường mua ngoài? `true` / `false` | `true` |
| `che_do` | `chay`, `khong_heo` (để trống nếu không) | `chay\|khong_heo` |
| `di_ung` | Mã chất gây dị ứng (bảng dưới) | `nuoc_mam\|dau_phong` |
| `nhan_suc_khoe` | `nhieu_duong`, `gi_thap`, `nhieu_purine`, `nhieu_muoi` | `nhieu_muoi` |
| `nhan_phong_cach` | `high_protein`, `tiet_kiem`, `nhanh_15p` | `tiet_kiem` |
| `nguyen_lieu` | Nguyên liệu, ngăn bằng `\|` | `cơm tấm\|sườn heo nướng\|nước mắm` |
| `nguon_so_lieu` | Nguồn số liệu (bắt buộc khi `verified` = `true`) | `BTPTP VN 2007` |
| `verified` | Đã kiểm tra? `true` / `false` | `true` |

**Mã dị ứng:** `dau_phong` (đậu phộng) · `hai_san_vo` (tôm, cua) · `ca` (cá) · `trung` (trứng) · `sua` (sữa) · `dau_nanh` (đậu nành) · `gluten` (lúa mì) · `nuoc_mam` (nước mắm) · `mam_tom` (mắm tôm).

## Công cụ tự kiểm tra những gì

- Đủ cột; id không trùng và đúng định dạng; tên, bữa, nguyên liệu không trống.
- Số không âm; giá và kcal lớn hơn 0; hệ số khẩu phần hợp lý (ít < 1 = vừa < nhiều).
- **4 × đạm + 4 × tinh bột + 9 × béo phải gần đúng kcal** (lệch tối đa 10%) — bắt lỗi gõ nhầm số.
- **An toàn dị ứng:** nguyên liệu có "nước mắm", "mắm tôm / mắm ruốc", "đậu phộng / lạc rang" thì cột `di_ung` bắt buộc phải có mã tương ứng.
- Mã dị ứng, chế độ ăn, nhãn đều phải nằm trong danh sách cho phép.
- Món `verified` = `true` phải có nguồn số liệu.
- Số món nằm trong giới hạn ở `lib/config.ts` (hiện 10–25 món; nhóm đã đồng ý nới từ 15 món của SPEC).

Excel lưu CSV kiểu tiếng Việt (dấu `;`, số thập phân `0,7`) cũng đọc được.

## Sau khi nhập

- Trang chi tiết món đã kiểm tra hiện **"Số liệu đã được nhóm kiểm tra · Nguồn: …"** thay cho dòng "Số liệu ước lượng".
- Trang Thực đơn ghi số món còn dùng số liệu ước lượng; khi tất cả đã kiểm tra, dòng đó tự biến mất.
- Muốn tạo lại file CSV từ dữ liệu hiện tại: `npm run xuat-csv`.
