# NutriViet — Tài liệu chuẩn bị thuyết trình

Tài liệu này giúp cả nhóm hiểu app chạy thế nào và trả lời câu hỏi của giảng viên. Mọi con số dưới đây đều khớp với app và có test kiểm tra (`npm test`).

---

## 1. App làm gì (nói trong 30 giây)

NutriViet giúp sinh viên **ăn lành mạnh bằng món Việt với ngân sách thấp**:

1. Hỏi 5 bước (an toàn → cơ thể → vận động → mục tiêu → thói quen ăn).
2. **Tính** lượng năng lượng và dinh dưỡng cần mỗi ngày, có giải thích từng bước.
3. Gợi ý **thực đơn 7 ngày** từ danh sách món Việt, theo 3 phong cách: Cân bằng / High-protein / Tiết kiệm.
4. Trang **Hôm nay**: ghi món đã ăn, đếm nước, "Lỡ ăn rồi" mà không phán xét; xem lại **các ngày trước**.
5. **AI** giúp nhập món bằng câu tự nhiên, giải thích vì sao chọn món, và làm thực đơn đa dạng hơn.

## 2. Ba nguyên tắc thiết kế (điểm nhấn khi thuyết trình)

| Nguyên tắc | Nghĩa là | Vì sao |
|---|---|---|
| **Số liệu do code tính, không do AI** | BMR, TDEE, calo, macro, khẩu phần đều là công thức trong `lib/engine/` | AI có thể "bịa" số. Công thức thì kiểm tra được, có test, giải thích được từng bước |
| **AI chỉ chọn món có sẵn và viết lời giải thích** | Mọi kết quả AI đều bị code kiểm tra lại; sai thì dùng phương án dự phòng | App luôn chạy được kể cả khi AI lỗi; AI không thể gợi ý món không có thật hay vi phạm dị ứng |
| **An toàn luôn thắng mục tiêu người dùng** | Có 3 tầng an toàn (mục 5 bên dưới) | App về dinh dưỡng có thể gây hại nếu khuyến khích ăn kiêng sai cách |

## 3. Luồng tính toán (đọc kèm sơ đồ trong README)

```
Hồ sơ → [An toàn] → BMR → TDEE → Calo mục tiêu (mức sàn) → Macro → Thực đơn 7 ngày → Theo dõi hằng ngày
```

### Ví dụ tính tay — Ca A (nam, 20 tuổi, 170 cm, 65 kg, ngồi nhiều, giảm mỡ)

| Bước | Công thức | Kết quả |
|---|---|---|
| BMR (Mifflin-St Jeor) | 10 × 65 + 6,25 × 170 − 5 × 20 + 5 | **1.617,5 kcal** |
| TDEE | 1.617,5 × 1,2 (ngồi nhiều) + 0 (không tập) | **1.941 kcal** |
| Calo mục tiêu | 1.941 × (1 − 15%) | **1.650 kcal** |
| Mức sàn | max(BMR 1.617,5; 1.500 với nam) | 1.617,5 → 1.650 cao hơn nên giữ nguyên |
| Protein | 1,6 g/kg × 65 kg | **104 g** (416 kcal) |
| Chất béo | 25% × 1.650 = 413 kcal ÷ 9 | **46 g** |
| Tinh bột | (1.650 − 416 − 413) ÷ 4 | **205 g** |

### Ví dụ có tập thể thao — hồ sơ mẫu "bóng đá" (nam, 20 tuổi, 172 cm, 62 kg, đá bóng 3 × 90 phút, cường độ vừa, tăng cơ)

- BMR = 10 × 62 + 6,25 × 172 − 5 × 20 + 5 = **1.600 kcal**
- Calo tập/ngày = (MET 5 − 1) × 62 kg × 4,5 giờ/tuần ÷ 7 ≈ **159 kcal** (trừ 1 vì phần năng lượng lúc nghỉ đã nằm trong BMR)
- TDEE = 1.600 × 1,2 + 159 ≈ **2.079 kcal** → tăng cơ +8% → **2.246 kcal**
- Protein = (1,8 + 0,2 vì có chơi thể thao) × 62 = **124 g**

### Thực đơn 7 ngày (thuật toán rule-based, `lib/engine/menu.ts`)

1. Chia calo theo bữa: 3 bữa → 30% / 35% / 35%; 4 bữa → 25% / 35% / 30% / 10%.
2. Lọc món: an toàn (bệnh nền) → dị ứng (kể cả nước mắm, mắm tôm ẩn trong món) → chay/không heo → món ghét → ngân sách → thời gian nấu.
3. Xếp món cho cả tuần, **bữa nào ít món phù hợp thì xếp trước** (bữa phụ, bữa sáng) để không bị "hết món" cuối tuần.
4. Mỗi bữa chọn món + khẩu phần (ít 0,7 / vừa 1,0 / nhiều 1,3) có calo gần mục tiêu bữa nhất.
5. Mỗi món tối đa **2 lần/tuần**, không lặp trong ngày.
6. Tổng ngày phải trong **±10%** mục tiêu. Không đạt thì thử đổi khẩu phần, thử thay món; vẫn không đạt → báo **"chưa đủ món phù hợp"** thay vì ép.

### "Lỡ ăn rồi" (`lib/engine/tracking.ts`)

- Phần ăn dư so với mục tiêu được **chia đều cho 3 ngày sau**.
- Mỗi ngày giảm **tối đa 10%** và **không bao giờ xuống dưới mức sàn**.
- Ví dụ: mục tiêu 1.650, mức sàn 1.200, hôm qua ăn 2.010 → dư 360 → mỗi ngày giảm 120 kcal.
- Nếu mức sàn là 1.618 thì chỉ giảm được 32 kcal/ngày (mức sàn chặn lại).

## 4. AI được dùng ở đâu và bị kiểm soát thế nào

| Tính năng | AI trả về | Code kiểm tra | AI lỗi thì |
|---|---|---|---|
| Nhập món bằng chat | `{ meal, dish_id, portion }` (JSON đúng khuôn) | Món có trong database? bữa/khẩu phần hợp lệ? Người dùng bấm Lưu mới ghi | Dò từ khóa + so tên món không dấu |
| Vì sao chọn món này? | 2–3 câu | Mọi con số trong câu phải là số engine đã tính | Câu ghép từ số liệu |
| Chọn món đa dạng | Danh sách id món cho 7 ngày | Món nằm trong danh sách đã lọc, ≤ 2 lần/tuần, engine tự tính khẩu phần, mỗi ngày ±10% | Giữ thực đơn rule-based |

- AI chỉ chạy ở **máy chủ**; API key không bao giờ xuống trình duyệt.
- Chỉ gửi cho AI: mục tiêu, phong cách, calo bữa, tên món. **Không gửi** tuổi, cân nặng, tên bệnh.
- Giới hạn 20 lần gọi AI / 10 phút cho mỗi địa chỉ mạng.

## 5. An toàn — 3 tầng (SPEC mục 4)

| Tầng | Ai | App làm gì |
|---|---|---|
| **1** | Dưới 18 tuổi · mang thai/cho con bú · bệnh thận · có (hoặc không muốn trả lời) vấn đề ăn uống · BMI < 18,5 mà chọn giảm mỡ | Chỉ cho "Ăn cân bằng", khuyên gặp chuyên gia, **ẩn mọi con số calo**, **tắt giảm bù** |
| **2** | Tiểu đường · gout · huyết áp cao | Loại món nhiều đường / nhiều purine / nhiều muối; ưu tiên món đường huyết thấp; luôn hiện "Đây là gợi ý chung, không thay thế chỉ định của bác sĩ" |
| **3** | Dị ứng, ăn chay, không thịt heo, ngân sách, thời gian nấu | Lọc món; ăn ngoài + có dị ứng thì nhắc "app không đảm bảo món không lẫn chất gây dị ứng" |

Ngoài ra:
- **Mục tiêu cân nặng quá nhanh** (giảm > 1%/tuần, tăng > 0,5%/tuần) → đề xuất thời hạn mới. BMI ở cân mục tiêu < 18,5 → không nhận mục tiêu.
- **3 ngày liền ăn dưới mức sàn** → thông điệp quan tâm, gợi ý nói chuyện với người thân/chuyên gia, không siết thêm calo.
- **Không phán xét:** dùng "Lỡ ăn rồi", "không sao cả"; không dùng màu đỏ hay chữ "vượt mức".

## 6. Kịch bản demo (5 phút)

1. **Trang chủ → "Dùng hồ sơ mẫu" → "Sinh viên chơi bóng đá muốn tăng cơ".** Chỉ con số 2.246 kcal, mở "Vì sao ra con số này?" đọc từng bước.
2. **Thực đơn** → bấm qua 3 phong cách → bấm 1 món → **Đổi món** → chọn món khác.
3. **"Vì sao chọn món này?"** → đọc lời giải thích (chỉ nhãn "Gợi ý bởi AI" hoặc "tự động").
4. **Hôm nay** → **Nhập nhanh** "trưa ăn cơm tấm sườn hơi nhiều" → Lưu. Bấm **"Lỡ ăn rồi"** vài món → chỉ câu "không sao cả" và dòng chia bù 3 ngày.
5. **Hồ sơ → "Dùng hồ sơ mẫu" → "Người tiểu đường"** → chỉ ghi chú bác sĩ, thực đơn không có món nhiều đường.
6. *(Nếu còn thời gian)* Làm onboarding với **tuổi 17** → chỉ còn "Ăn cân bằng", không hiện con số calo.

## 7. Câu hỏi giảng viên có thể hỏi

**Sao không để AI tính calo cho nhanh?**
AI có thể trả số khác nhau mỗi lần và đôi khi sai. Công thức Mifflin-St Jeor là chuẩn phổ biến, code tính lần nào cũng ra cùng kết quả, có test với ví dụ tính tay, và giải thích được từng bước cho người dùng.

**Nếu AI gợi ý món người dùng bị dị ứng thì sao?**
Không thể. AI chỉ được thấy danh sách món **đã qua bộ lọc dị ứng**, và kết quả AI còn bị kiểm tra lại bằng chính bộ lọc đó. Có test riêng cho tình huống này (`lib/ai/ai.test.ts`).

**Không có mạng / hết tiền API thì sao?**
App vẫn chạy đủ. Mỗi tính năng AI đều có phương án dự phòng không cần AI. Nhãn trên giao diện cho biết đang dùng AI hay tự động.

**Số liệu dinh dưỡng của món lấy ở đâu?**
Hiện là **số ước lượng** (đánh dấu `verified: false` và có ghi chú trên giao diện). Nhóm sẽ thay bằng số liệu theo **Bảng thành phần thực phẩm Việt Nam**. Nhóm nhập số liệu qua file Excel/CSV bằng lệnh `npm run nhap-mon`; công cụ tự kiểm tra 4 × đạm + 4 × tinh bột + 9 × béo phải gần đúng tổng calo, và bắt buộc khai dị ứng khi nguyên liệu có nước mắm, mắm tôm, đậu phộng. Món đã kiểm tra hiện nguồn số liệu ngay trên giao diện.

**Sao có ngày báo "chưa đủ món"?**
Đó là chủ ý: thay vì ép thực đơn sai mục tiêu, app nói thật. Với 15 món mẫu, người cần nhiều calo (> 2.200 kcal) hoặc có nhiều hạn chế sẽ gặp điều này. Hướng phát triển: bổ sung món.

**Nhập 120 cm và 220 kg thì sao?**
BMI ≈ 153 là không thể có thật, nên app chặn ngay và nhờ kiểm tra lại (chỉ nhận BMI 12–60). Với BMI cao nhưng có thật (vd 170 cm/100 kg, BMI 34,6): app phân loại theo chuẩn châu Á, gợi ý "Giảm mỡ", nhắc nên có bác sĩ theo dõi, tính đạm theo cân nặng ứng với BMI 25 (≈ 116 g thay vì 160 g), và giới hạn giảm tối đa 1 kg/tuần.

**Sinh viên chỉ có 15–20 nghìn mỗi bữa thì sao?**
Ngân sách được hiểu là trung bình mỗi bữa: bữa sáng rẻ (xôi, cháo) thì bữa trưa được đắt hơn một chút, miễn tổng ngày không vượt. Với 20.000 đ/bữa, hồ sơ giảm mỡ và tiểu đường có đủ 7 ngày thực đơn. Dưới 10.000 đ app nói rõ là chưa tìm được món đủ chất.

**Dữ liệu sức khỏe lưu ở đâu?**
Chỉ trong trình duyệt của người dùng (`localStorage`), không có tài khoản hay database máy chủ.

**Làm sao biết app đúng?**
- **280 unit test** (Vitest) cho toàn bộ engine, AI và lưu trữ, gồm các ca tính tay: `npm test`.
- **13 test trình duyệt** (Playwright) bấm như người dùng thật trên màn hình điện thoại: `npm run test:e2e`.

**Vì sao người dưới 18 tuổi / mang thai không thấy số calo?**
Công thức BMR được xây cho người lớn; khi mang thai cơ thể cần nhiều hơn TDEE; và với người có vấn đề ăn uống, việc đếm calo có thể gây hại. Theo nguyên tắc "an toàn thắng mục tiêu", app chỉ gợi ý ăn cân bằng và khuyên gặp chuyên gia.

## 8. Giới hạn & định hướng phát triển

- Số liệu món chưa kiểm chứng; mới có 15 món.
- Mức "nhiều" chỉ ×1,3 nên người ăn nhiều có thể thiếu món.
- Ngoài phạm vi MVP (SPEC mục 9): tài khoản, database máy chủ, chat tư vấn tự do, điều chỉnh calo theo cân nặng hằng tuần, nhận diện món qua ảnh, danh sách đi chợ, game/huy hiệu…
