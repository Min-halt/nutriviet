import { describe, expect, it } from "vitest";
import {
  DANH_SACH_DI_UNG,
  SO_MON_TOI_DA,
  SO_MON_TOI_THIEU,
} from "@/lib/config";
import { DANH_SACH_MON } from "@/lib/monAn";
import {
  demLyDoLoai,
  dinhDuongKhauPhan,
  locMon,
  lyDoLoai,
  type BoLoc,
  type Mon,
} from "./dishes";

const boLocRong: BoLoc = {
  tagLoai: [],
  diUng: [],
  cheDoAn: "khong_kieng",
  monKhongThich: [],
  nganSachMoiBuaVnd: 100000,
  thoiGianNauToiDa: 120,
};
const mon = (id: string) => DANH_SACH_MON.find((m) => m.id === id)!;

describe("data/dishes.json — đúng schema SPEC mục 5", () => {
  const MA_DI_UNG: string[] = DANH_SACH_DI_UNG.map((x) => x.ma);

  it("số món nằm trong giới hạn ở lib/config.ts, id không trùng", () => {
    expect(DANH_SACH_MON.length).toBeGreaterThanOrEqual(SO_MON_TOI_THIEU);
    expect(DANH_SACH_MON.length).toBeLessThanOrEqual(SO_MON_TOI_DA);
    expect(new Set(DANH_SACH_MON.map((m) => m.id)).size).toBe(
      DANH_SACH_MON.length,
    );
  });

  it.each(DANH_SACH_MON.map((m) => [m.id, m] as [string, Mon]))(
    "%s đúng schema",
    (_, m) => {
      // Món đã kiểm tra (verified: true) bắt buộc phải ghi nguồn số liệu
      if (m.verified) expect(m.source?.trim()).toBeTruthy();
      expect(m.meal.length).toBeGreaterThan(0);
      m.meal.forEach((b) =>
        expect(["sang", "trua", "toi", "phu"]).toContain(b),
      );
      m.diet.forEach((x) => expect(["chay", "khong_heo"]).toContain(x));
      m.health_tags.forEach((x) =>
        expect([
          "nhieu_duong",
          "gi_thap",
          "nhieu_purine",
          "nhieu_muoi",
        ]).toContain(x),
      );
      m.style_tags.forEach((x) =>
        expect(["high_protein", "tiet_kiem", "nhanh_15p"]).toContain(x),
      );
      m.allergens.forEach((x) => expect(MA_DI_UNG).toContain(x));
      expect(Object.keys(m.portion_factor).sort()).toEqual([
        "it",
        "nhieu",
        "vua",
      ]);
      expect(m.portion_factor.vua).toBe(1);
      expect(m.price_vnd).toBeGreaterThan(0);
      expect(m.ingredients.length).toBeGreaterThan(0);
      // Kiểm tra chéo: 4×protein + 4×carb + 9×fat ≈ kcal (lệch ≤ 10%)
      const v = m.per_serving_vua;
      expect(
        Math.abs(4 * v.protein + 4 * v.carb + 9 * v.fat - v.kcal),
      ).toBeLessThanOrEqual(v.kcal * 0.1);
      // Món có nước mắm/mắm tôm trong nguyên liệu phải khai báo allergen tương ứng
      if (m.ingredients.some((i) => i.includes("nước mắm")))
        expect(m.allergens).toContain("nuoc_mam");
      if (m.ingredients.some((i) => i.includes("đậu phộng")))
        expect(m.allergens).toContain("dau_phong");
    },
  );

  it("đủ bữa sáng/trưa/tối/phụ và có ít nhất 3 món chay", () => {
    for (const b of ["sang", "trua", "toi", "phu"] as const)
      expect(DANH_SACH_MON.some((m) => m.meal.includes(b))).toBe(true);
    expect(
      DANH_SACH_MON.filter((m) => m.diet.includes("chay")).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("có đủ các tag để test bộ lọc", () => {
    const tat = DANH_SACH_MON.flatMap((m) => [
      ...m.health_tags,
      ...m.style_tags,
      ...m.allergens,
    ]);
    for (const t of [
      "nhieu_duong",
      "gi_thap",
      "nhieu_purine",
      "nhieu_muoi",
      "high_protein",
      "tiet_kiem",
      "nhanh_15p",
      "nuoc_mam",
      "mam_tom",
      "dau_phong",
    ])
      expect(tat).toContain(t);
  });
});

describe("dinhDuongKhauPhan", () => {
  it("cơm tấm sườn (600 kcal phần vừa): ít 420 · vừa 600 · nhiều 780", () => {
    expect(dinhDuongKhauPhan(mon("com-tam-suon"), "it").kcal).toBe(420);
    expect(dinhDuongKhauPhan(mon("com-tam-suon"), "vua").kcal).toBe(600);
    expect(dinhDuongKhauPhan(mon("com-tam-suon"), "nhieu").kcal).toBe(780);
  });
  it("protein cũng nhân theo hệ số: 30g × 1.3 = 39g", () => {
    expect(dinhDuongKhauPhan(mon("com-tam-suon"), "nhieu").protein).toBe(39);
  });
});

describe("lyDoLoai / locMon", () => {
  it("không lọc gì → giữ đủ món", () => {
    expect(locMon(DANH_SACH_MON, boLocRong)).toHaveLength(DANH_SACH_MON.length);
  });
  it("tiểu đường (loại nhieu_duong) → loại cá kho, bún thịt nướng", () => {
    const b = { ...boLocRong, tagLoai: ["nhieu_duong"] };
    expect(lyDoLoai(mon("bun-thit-nuong"), b)).toBe("benh_nen");
    expect(lyDoLoai(mon("com-ca-kho-to"), b)).toBe("benh_nen");
    expect(lyDoLoai(mon("com-ga-luoc"), b)).toBeNull();
  });
  it("gout (loại nhieu_purine) → loại phở bò, bún bò Huế", () => {
    const b = { ...boLocRong, tagLoai: ["nhieu_purine"] };
    expect(lyDoLoai(mon("pho-bo"), b)).toBe("benh_nen");
    expect(lyDoLoai(mon("bun-bo-hue"), b)).toBe("benh_nen");
  });
  it("dị ứng nước mắm (allergen ẩn) → loại cơm tấm", () => {
    expect(
      lyDoLoai(mon("com-tam-suon"), { ...boLocRong, diUng: ["nuoc_mam"] }),
    ).toBe("di_ung");
  });
  it("dị ứng mắm tôm → loại bún bò Huế; dị ứng đậu phộng → loại bún thịt nướng", () => {
    expect(
      lyDoLoai(mon("bun-bo-hue"), { ...boLocRong, diUng: ["mam_tom"] }),
    ).toBe("di_ung");
    expect(
      lyDoLoai(mon("bun-thit-nuong"), { ...boLocRong, diUng: ["dau_phong"] }),
    ).toBe("di_ung");
  });
  it("ăn chay → chỉ còn món có diet 'chay'", () => {
    const con = locMon(DANH_SACH_MON, { ...boLocRong, cheDoAn: "chay" });
    expect(con.length).toBeGreaterThanOrEqual(3);
    con.forEach((m) => expect(m.diet).toContain("chay"));
  });
  it("không thịt heo → loại cơm tấm sườn, giữ món chay và cơm gà", () => {
    const b = { ...boLocRong, cheDoAn: "khong_heo" as const };
    expect(lyDoLoai(mon("com-tam-suon"), b)).toBe("che_do_an");
    expect(lyDoLoai(mon("xoi-dau-xanh"), b)).toBeNull();
    expect(lyDoLoai(mon("com-ga-luoc"), b)).toBeNull();
  });
  it("món không thích, ngân sách, thời gian nấu", () => {
    expect(
      lyDoLoai(mon("pho-bo"), { ...boLocRong, monKhongThich: ["pho-bo"] }),
    ).toBe("khong_thich");
    expect(
      lyDoLoai(mon("pho-bo"), { ...boLocRong, nganSachMoiBuaVnd: 25000 }),
    ).toBe("ngan_sach");
    expect(
      lyDoLoai(mon("com-ga-luoc"), { ...boLocRong, thoiGianNauToiDa: 15 }),
    ).toBe("thoi_gian_nau");
    expect(
      lyDoLoai(mon("pho-bo"), { ...boLocRong, thoiGianNauToiDa: 15 }),
    ).toBeNull(); // ăn ngoài, không cần nấu
  });
  it("an toàn được kiểm tra trước sở thích", () => {
    const b = {
      ...boLocRong,
      tagLoai: ["nhieu_purine"],
      monKhongThich: ["pho-bo"],
    };
    expect(lyDoLoai(mon("pho-bo"), b)).toBe("benh_nen");
  });
  it("demLyDoLoai đếm đúng", () => {
    const dem = demLyDoLoai(DANH_SACH_MON, {
      ...boLocRong,
      nganSachMoiBuaVnd: 20000,
    });
    expect(dem.ngan_sach).toBe(
      DANH_SACH_MON.filter((m) => m.price_vnd > 20000 * 1.5).length,
    );
  });
});

describe("Ngân sách là trung bình mỗi bữa (linh hoạt tới 1,5 lần)", () => {
  it("ngân sách 30k: phở 40k vẫn được nhận (≤ 45k); ngân sách 25k: phở bị loại (> 37,5k)", () => {
    expect(
      lyDoLoai(mon("pho-bo"), { ...boLocRong, nganSachMoiBuaVnd: 30000 }),
    ).toBeNull();
    expect(
      lyDoLoai(mon("pho-bo"), { ...boLocRong, nganSachMoiBuaVnd: 25000 }),
    ).toBe("ngan_sach");
  });
});
