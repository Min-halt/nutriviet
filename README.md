# NutriViet

Web app lập thực đơn món Việt và theo dõi ăn uống có hỗ trợ AI, dành cho sinh viên muốn ăn lành mạnh với ngân sách thấp. Đồ án môn học của nhóm sinh viên DUE.

- **Số liệu do code tính** (BMR, TDEE, calo, macro, khẩu phần) — hàm TypeScript thuần trong `lib/engine/`, có test.
- **AI chỉ chọn món trong database và viết lời giải thích** — mọi kết quả AI đều được code kiểm tra lại, lỗi thì dùng phương án dự phòng.
- **Luật an toàn luôn thắng mục tiêu người dùng** (xem `SPEC.md` mục 4).
- Dữ liệu sức khỏe chỉ lưu trên trình duyệt (`localStorage`), không có tài khoản hay database máy chủ.

Chi tiết tính năng: [`SPEC.md`](SPEC.md) · Luật làm việc của dự án: [`CLAUDE.md`](CLAUDE.md) · Chuẩn bị thuyết trình: [`docs/THUYET-TRINH.md`](docs/THUYET-TRINH.md)

---

## Chạy trên máy

Cần cài [Node.js](https://nodejs.org) bản 20 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:3000 (bật chế độ xem điện thoại trong trình duyệt bằng F12 cho giống thật). Muốn demo nhanh, bấm **"Dùng hồ sơ mẫu"** ở trang chủ.

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy bản phát triển |
| `npm test` | Chạy toàn bộ unit test (Vitest) cho engine, AI, lưu trữ |
| `npm run test:e2e` | Chạy test trình duyệt (Playwright) — cần `npm run build` trước. Máy mới cài trình duyệt một lần: `npx playwright install chromium` |
| `npm run build` | Build bản chính thức (Vercel cũng chạy lệnh này) |
| `npm run lint` | Kiểm tra lỗi viết code |
| `npm run nhap-mon` | Nhập số liệu món từ `data/mon-an.csv` vào database, có kiểm tra lỗi (xem [`docs/HUONG-DAN-NHAP-SO-LIEU.md`](docs/HUONG-DAN-NHAP-SO-LIEU.md)) — cần Node.js 22.18 trở lên |
| `npm run xuat-csv` | Tạo lại `data/mon-an.csv` từ database hiện tại |
| `npm run xuat-html` | Xuất app thành thư mục HTML tĩnh `out/` (xem bên dưới) |

### Bật tính năng AI (không bắt buộc)

App vẫn chạy đầy đủ khi **không có** API key — các tính năng AI tự dùng phương án dự phòng. Muốn bật AI:

1. Chép file `.env.example` thành `.env.local` (cùng thư mục).
2. Điền key Anthropic vào `ANTHROPIC_API_KEY=`. `ANTHROPIC_MODEL` để mặc định `claude-opus-5-5`.
3. Chạy lại `npm run dev`. Nhãn "Gợi ý bởi AI" sẽ xuất hiện thay cho "Gợi ý tự động".

`.env.local` đã nằm trong `.gitignore` — **không bao giờ commit key**. Key chỉ được dùng ở máy chủ (`app/api/ai/...`), không bao giờ gửi xuống trình duyệt.

### Xuất bản HTML (mở không cần cài đặt)

```bash
npm run xuat-html
```

Tạo thư mục `out/` chứa app dạng HTML tĩnh, kèm file mở nhanh `Mo NutriViet (Windows).bat` / `Mo NutriViet (Mac).command` và `HUONG-DAN.txt`. Nén thư mục `out/` thành zip để gửi cho người khác.

- **Không nhấp đúp `index.html`**: trình duyệt chặn file đi kèm khi mở trực tiếp từ ổ cứng. Hãy dùng file mở nhanh (nó chạy một máy chủ nhỏ tại http://localhost:8123).
- Bản HTML không có máy chủ nên 3 tính năng AI tự dùng phương án dự phòng ngay trên trình duyệt.
- Sau khi xuất, chạy lại `npm run build` nếu muốn dùng `npm start` hoặc `npm run test:e2e`.

### Xóa dữ liệu để làm lại từ đầu

Vào trang **Hồ sơ** → **"Xóa toàn bộ dữ liệu"** → **"Xóa hết"**. (Hoặc F12 → **Application** → **Local Storage** → xóa các mục bắt đầu bằng `nutriviet.`)

---

## Cấu trúc thư mục

```
app/                  các trang + API routes
  page.tsx            trang chủ (Bắt đầu / Dùng hồ sơ mẫu)
  onboarding/         5 bước nhập hồ sơ
  ket-qua/            bước 6: BMR, TDEE, calo, macro, "Vì sao ra con số này?"
  thuc-don/           thực đơn 7 ngày, 3 phong cách
  mon/[id]/           chi tiết món, Đổi món, "Vì sao chọn món này?"
  hom-nay/            calo còn lại, nước, ghi món, "Lỡ ăn rồi", Nhập nhanh
  lich-su/            xem lại các ngày trước (chỉ xem)
  ho-so/              xem/sửa hồ sơ, chế độ Đơn giản, hồ sơ mẫu, xóa toàn bộ dữ liệu
  api/ai/             3 API route gọi AI (chạy ở máy chủ)
components/           giao diện dùng lại
lib/
  config.ts           MỌI hằng số (hệ số vận động, % cắt calo, ngưỡng an toàn...)
  engine/             công thức & thuật toán (hàm thuần, có test)
  ai/                 prompt, kiểm tra kết quả AI, phương án dự phòng
  storage.ts          đọc/ghi localStorage
  profile.ts          hồ sơ người dùng, kiểm tra từng bước onboarding
  hoSoMau.ts          3 hồ sơ mẫu để demo
data/dishes.json      database 21 món Việt mẫu (đọc bởi app)
data/mon-an.csv       cùng dữ liệu dạng bảng — nhóm sửa bằng Excel rồi chạy npm run nhap-mon
e2e/                  test trình duyệt (Playwright)
docs/THUYET-TRINH.md  tài liệu chuẩn bị thuyết trình
```

## Engine tính toán (`lib/engine/`)

Mọi hằng số nằm ở `lib/config.ts`, nhóm chỉnh ở đó là cả app đổi theo.

```
Hồ sơ người dùng
   │
   ▼
body.ts ──── + phân loại BMI chuẩn châu Á, chặn số đo vô lý (BMI ngoài 12–60),
             đạm tính theo cân nặng ứng với BMI 25 khi BMI > 25
safety.ts ── Tầng an toàn: tầng 1 → chỉ "Ăn cân bằng", ẩn con số calo, tắt giảm bù;
             tầng 2 → lọc món theo bệnh nền
   │
   ▼
body.ts ──── BMR (Mifflin-St Jeor), BMI
   │
   ▼
energy.ts ── TDEE = BMR × hệ số công việc + calo tập/ngày
             Calo mục tiêu = TDEE × (1 − % cắt) hoặc × (1 + % thêm), không dưới mức sàn
   │
   ▼
macros.ts ── Protein theo g/kg · Chất béo 25% · Carb = phần còn lại
weightGoal.ts  Kiểm tra tốc độ giảm/tăng cân, BMI ở cân mục tiêu → đề xuất thời hạn mới
   │
   ▼
plan.ts ──── Hàm tổng hợp tinhKeHoach(); explain.ts sinh lời "Vì sao ra con số này?"
   │
   ▼
dishes.ts ── Dinh dưỡng theo khẩu phần, bộ lọc món (an toàn → dị ứng → chế độ ăn → món ghét → ngân sách → thời gian nấu)
             Ngân sách là TRUNG BÌNH mỗi bữa: từng bữa ≤ 1,5 lần, tổng ngày ≤ ngân sách × số bữa
menu.ts ──── Thực đơn 7 ngày: chia calo theo bữa → xếp món cả tuần (bữa ít món xếp trước)
             → tối đa 2 lần/tuần → tổng ngày ±10%, không đạt thì báo "chưa đủ món" (không ép) → Đổi món
   │
   ▼
tracking.ts  Trang Hôm nay: tổng ngày, "Lỡ ăn rồi" (chia bù 3 ngày, tối đa 10%/ngày, không dưới mức sàn),
             3 ngày liền dưới mức sàn → thông điệp quan tâm, tắt giảm bù
```

Mỗi file có file `*.test.ts` đi kèm, gồm các ca tính tay ghi rõ phép tính (xem `lib/engine/body.test.ts`, `plan.test.ts`, `tracking.test.ts`).

## Tính năng AI (`lib/ai/`, `app/api/ai/`)

| Tính năng | AI làm | Code kiểm tra | Dự phòng khi AI lỗi |
|---|---|---|---|
| Nhập món bằng chat | Hiểu câu → `{ meal, dish_id, portion }` | Món có trong DB, bữa/khẩu phần hợp lệ; người dùng xác nhận trước khi lưu | Dò từ khóa + so tên món không dấu |
| Vì sao chọn món này? | Viết 2–3 câu | Không chứa con số nào ngoài số liệu engine đã tính | Câu ghép từ số liệu |
| Chọn món đa dạng | Chọn id món từ danh sách đã lọc | Món trong danh sách, ≤2 lần/tuần, không trùng ngày, engine tự tính khẩu phần, ±10% | Giữ thực đơn rule-based |

Chỉ gửi cho AI: mục tiêu, phong cách, calo bữa, tên món, nhãn ưu tiên — không gửi tuổi, cân nặng, chiều cao hay tên bệnh.

Mỗi địa chỉ mạng gọi AI tối đa 20 lần / 10 phút (`lib/ai/gioiHan.ts`); vượt quá thì vẫn trả kết quả bằng phương án dự phòng.

---

## Deploy lên Vercel

1. Đẩy code lên GitHub (kho `JudeJefferey/nutriviet`).
2. Vào https://vercel.com → **Sign Up / Log in with GitHub**.
3. **Add New… → Project** → chọn kho `nutriviet` → **Import**.
4. Vercel tự nhận ra Next.js, giữ nguyên các thiết lập build.
5. Mở **Environment Variables**, thêm (nếu muốn bật AI):
   - `ANTHROPIC_API_KEY` = key của bạn
   - `ANTHROPIC_MODEL` = `claude-opus-5-5`
6. Bấm **Deploy**, chờ 1–2 phút → nhận link dạng `https://nutriviet-xxx.vercel.app`.
7. Mỗi lần đẩy code mới lên nhánh `main`, Vercel tự deploy lại.

Đổi key sau khi deploy: **Settings → Environment Variables** → sửa → **Deployments → Redeploy**.

> Lưu ý: link công khai thì ai cũng bấm được các nút AI và dùng vào key của bạn. Với bản demo có thể chấp nhận; nên đặt giới hạn chi tiêu trong trang quản lý của Anthropic.

---

## Thay đổi so với SPEC (nhóm đã đồng ý)

- **Giới tính hỏi ở bước 1** (trước câu mang thai/cho con bú); câu mang thai chỉ hỏi khi chọn Nữ.
- **BMI:** chặn số đo vô lý; phân loại theo chuẩn châu Á; gợi ý mục tiêu theo BMI; BMI ≥ 30 có ghi chú bác sĩ theo dõi; đạm tính theo cân nặng ứng với BMI 25 khi BMI > 25.
- **Giảm cân tối đa 1% cân nặng/tuần và không quá 1 kg/tuần.**
- **Ngân sách là trung bình mỗi bữa** (SPEC ghi "ngân sách mỗi bữa"); tối thiểu 10.000 đ.
- **Số món tối đa 25** (SPEC ghi 10–15); đã thêm 6 món giá rẻ, số liệu ước lượng.
- Tầng 1 ẩn con số calo và tắt giảm bù (an toàn hơn SPEC).

## Giới hạn hiện tại

- **Số liệu món là ước lượng** (`"verified": false`). Nhóm sẽ thay bằng số liệu theo Bảng thành phần thực phẩm Việt Nam — làm theo [`docs/HUONG-DAN-NHAP-SO-LIEU.md`](docs/HUONG-DAN-NHAP-SO-LIEU.md).
- **Mới có 21 món mẫu** nên:
  - Người cần nhiều calo (khoảng trên 2.200 kcal/ngày) có thể thấy vài ngày "chưa đủ món phù hợp".
  - Người dị ứng nước mắm hoặc ăn chay với ngân sách thấp có ít lựa chọn.
  - Hướng xử lý: bổ sung món (kể cả món phần lớn) khi có dữ liệu đã kiểm tra.
- Ngoài phạm vi MVP (định hướng phát triển): tài khoản, database máy chủ, chat tư vấn tự do, điều chỉnh calo theo cân nặng hằng tuần, nhận diện món qua ảnh, danh sách đi chợ… (xem `SPEC.md` mục 9).

> Đây là gợi ý chung, không thay thế chỉ định của bác sĩ.
