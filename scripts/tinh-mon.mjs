/**
 * Tính số liệu dinh dưỡng của món từ KHỐI LƯỢNG NGUYÊN LIỆU.
 *
 * Đọc:  data/nguyen-lieu-100g.json  (giá trị /100 g của từng nguyên liệu)
 *       data/mon-cong-thuc.json     (mỗi món = danh sách nguyên liệu + số gam)
 * Ghi:  data/dishes.json            (giữ nguyên các món đã có, thêm/cập nhật món có công thức)
 *
 * Vì sao làm vậy: nhóm không tự nghĩ ra con số calo của món. Con số được cộng
 * từ khối lượng nguyên liệu, nên ai cũng kiểm tra lại được, và khi thay bảng
 * nguyên liệu bằng số liệu Bảng thành phần thực phẩm Việt Nam thì chỉ cần
 * chạy lại lệnh này.
 *
 * Chạy: npm run tinh-mon
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const GOC = process.cwd();
const F_NGUYEN_LIEU = join(GOC, "data/nguyen-lieu-100g.json");
const F_CONG_THUC = join(GOC, "data/mon-cong-thuc.json");
const F_DISHES = join(GOC, "data/dishes.json");

const LECH_CHO_PHEP = 0.1; // 4×đạm + 4×tinh bột + 9×béo được lệch tối đa 10% so với kcal

/** Nguyên liệu nào kéo theo mã dị ứng nào. Thà báo dư còn hơn bỏ sót (CLAUDE.md: an toàn thắng). */
const DI_UNG_THEO_NGUYEN_LIEU = {
  "trung-ga": ["trung"],
  "trung-vit": ["trung"],
  "trung-cut": ["trung"],
  "sua-tuoi": ["sua"],
  "sua-dac": ["sua"],
  "sua-chua": ["sua"],
  "pho-mai": ["sua"],
  "ca-loc": ["ca"],
  "ca-nuc": ["ca"],
  "ca-thu": ["ca"],
  "ca-basa": ["ca"],
  "cha-ca": ["ca"],
  tom: ["hai_san_vo"],
  "cua-dong": ["hai_san_vo"],
  ngheu: ["hai_san_vo"],
  muc: ["hai_san_vo"],
  "dau-hu": ["dau_nanh"],
  "dau-hu-chien": ["dau_nanh"],
  "nuoc-tuong": ["dau_nanh"],
  "banh-mi": ["gluten"],
  "bot-mi": ["gluten"],
  "mi-trung-kho": ["gluten", "trung"],
  "mi-goi": ["gluten"],
  "nuoc-mam": ["nuoc_mam"],
  "mam-tom": ["mam_tom", "hai_san_vo"],
  "dau-phong": ["dau_phong"],
};

const doc = (f) => JSON.parse(readFileSync(f, "utf8"));
const lamTron = (x, n = 0) => {
  const h = 10 ** n;
  return Math.round(x * h) / h;
};

// ── 1. Đọc và kiểm tra bảng nguyên liệu ──────────────────────────
const bang = doc(F_NGUYEN_LIEU).nguyen_lieu;
const loiBang = [];
for (const [ma, n] of Object.entries(bang)) {
  const tinh = 4 * n.dam + 4 * n.tinh_bot + 9 * n.beo;
  if (n.kcal <= 0) {
    loiBang.push(`${ma}: kcal phải lớn hơn 0`);
    continue;
  }
  const lech = Math.abs(tinh - n.kcal) / n.kcal;
  if (lech > LECH_CHO_PHEP) {
    loiBang.push(
      `${ma}: 4×${n.dam} + 4×${n.tinh_bot} + 9×${n.beo} = ${lamTron(tinh, 1)} kcal, ` +
        `lệch ${(lech * 100).toFixed(1)}% so với ${n.kcal} kcal đã ghi`,
    );
  }
}
if (loiBang.length) {
  console.error("Bảng nguyên liệu có số chưa khớp:\n- " + loiBang.join("\n- "));
  process.exit(1);
}

// ── 2. Tính từng món ─────────────────────────────────────────────
const congThuc = doc(F_CONG_THUC).mon;
const loiMon = [];
const monMoi = new Map();

for (const ct of congThuc) {
  const tong = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const tenNguyenLieu = [];
  const diUng = new Set(ct.allergens ?? []);

  for (const [ma, gam] of ct.nguyen_lieu) {
    const n = bang[ma];
    if (!n) {
      loiMon.push(`${ct.id}: không có nguyên liệu "${ma}" trong bảng`);
      continue;
    }
    const k = gam / 100;
    tong.kcal += n.kcal * k;
    tong.protein += n.dam * k;
    tong.carb += n.tinh_bot * k;
    tong.fat += n.beo * k;
    tenNguyenLieu.push(`${n.ten} ${gam} g`);
    for (const d of DI_UNG_THEO_NGUYEN_LIEU[ma] ?? []) diUng.add(d);
  }

  // Làm tròn: kcal về bội số 5 cho dễ đọc, macro về số nguyên
  const ds = {
    kcal: Math.round(tong.kcal / 5) * 5,
    protein: Math.round(tong.protein),
    carb: Math.round(tong.carb),
    fat: lamTron(tong.fat, 1), // béo để 1 số lẻ: làm tròn về số nguyên sẽ lệch nhiều ở món ít béo (trái cây)
  };

  // Kiểm lại sau khi làm tròn (chính là phép kiểm của công cụ nhập CSV)
  const tinh = 4 * ds.protein + 4 * ds.carb + 9 * ds.fat;
  const lech = Math.abs(tinh - ds.kcal) / ds.kcal;
  if (lech > LECH_CHO_PHEP) {
    loiMon.push(
      `${ct.id}: sau khi làm tròn lệch ${(lech * 100).toFixed(1)}% (${tinh} vs ${ds.kcal} kcal)`,
    );
  }

  // Nhãn phong cách suy ra theo luật rõ ràng, không gán tay từng món:
  //   tiet_kiem   — giá ≤ 15.000 đ
  //   nhanh_15p   — tự nấu trong 15 phút trở xuống
  //   high_protein— đạm ≥ 30 g hoặc đạm chiếm ≥ 25% calo của món
  const nhan = new Set(ct.style_tags ?? []);
  if (ct.price_vnd <= 15000) nhan.add("tiet_kiem");
  if (!ct.eat_out && ct.cook_minutes <= 15) nhan.add("nhanh_15p");
  if (ds.protein >= 30 || (4 * ds.protein) / ds.kcal >= 0.25)
    nhan.add("high_protein");

  monMoi.set(ct.id, {
    id: ct.id,
    name: ct.name,
    meal: ct.meal,
    per_serving_vua: ds,
    portion_factor: ct.portion_factor ?? { it: 0.7, vua: 1, nhieu: 1.3 },
    price_vnd: ct.price_vnd,
    cook_minutes: ct.cook_minutes,
    eat_out: ct.eat_out,
    diet: ct.diet ?? [],
    allergens: [...diUng].sort(),
    health_tags: ct.health_tags ?? [],
    style_tags: [...nhan],
    ingredients: tenNguyenLieu,
    source: "Ước lượng từ khối lượng nguyên liệu (data/nguyen-lieu-100g.json)",
    verified: false,
  });
}

if (loiMon.length) {
  console.error("Có món chưa tính được:\n- " + loiMon.join("\n- "));
  process.exit(1);
}

// ── 3. Gộp vào dishes.json ───────────────────────────────────────
// Món đã có mà không có công thức thì giữ nguyên (số liệu nhóm đặt tay từ trước).
const cu = doc(F_DISHES);
const ketQua = [];
for (const m of cu) ketQua.push(monMoi.get(m.id) ?? m);
for (const [id, m] of monMoi) if (!cu.some((c) => c.id === id)) ketQua.push(m);

writeFileSync(F_DISHES, JSON.stringify(ketQua, null, 2) + "\n", "utf8");

// ── 4. Báo cáo ───────────────────────────────────────────────────
const dem = (loc) => ketQua.filter(loc).length;
console.log(`Đã ghi ${ketQua.length} món vào data/dishes.json`);
console.log(`  trong đó ${monMoi.size} món tính từ nguyên liệu`);
console.log(
  `  bữa sáng ${dem((m) => m.meal.includes("sang"))} ·` +
    ` trưa ${dem((m) => m.meal.includes("trua"))} ·` +
    ` tối ${dem((m) => m.meal.includes("toi"))} ·` +
    ` phụ ${dem((m) => m.meal.includes("phu"))}`,
);
console.log(
  `  chay ${dem((m) => m.diet.includes("chay"))} ·` +
    ` dưới 15.000 đ ${dem((m) => m.price_vnd <= 15000)} ·` +
    ` trên 700 kcal ${dem((m) => m.per_serving_vua.kcal > 700)}`,
);
