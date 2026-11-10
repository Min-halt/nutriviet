import { describe, expect, it } from "vitest";
import { getSafetyTier, type SafetyInput } from "./safety";

// Hồ sơ "bình thường": 25 tuổi, không bệnh, BMI 22.5
const binhThuong: SafetyInput = {
  tuoi: 25,
  mangThaiChoConBu: false,
  benhNen: [],
  vanDeAnUong: "khong",
  canNangKg: 65,
  chieuCaoCm: 170,
};

describe("getSafetyTier — tầng 1", () => {
  it("hồ sơ bình thường → không thuộc tầng 1, được chọn mọi mục tiêu", () => {
    const r = getSafetyTier(binhThuong, "giam_mo");
    expect(r.tang1).toBe(false);
    expect(r.mucTieuDuocChon).toEqual([
      "giam_mo",
      "tang_co",
      "duy_tri",
      "an_lanh_manh",
    ]);
    expect(r.canGhiChuBacSi).toBe(false);
  });

  it("17 tuổi → tầng 1, chỉ được 'Ăn cân bằng'", () => {
    const r = getSafetyTier({ ...binhThuong, tuoi: 17 });
    expect(r.tang1).toBe(true);
    expect(r.lyDoTang1).toContain("duoi_18_tuoi");
    expect(r.mucTieuDuocChon).toEqual(["an_lanh_manh"]);
  });

  it("đúng 18 tuổi → không bị khóa vì tuổi", () => {
    expect(getSafetyTier({ ...binhThuong, tuoi: 18 }).tang1).toBe(false);
  });

  it("đang mang thai / cho con bú → tầng 1", () => {
    const r = getSafetyTier({ ...binhThuong, mangThaiChoConBu: true });
    expect(r.lyDoTang1).toEqual(["mang_thai_cho_con_bu"]);
  });

  it("bệnh thận → tầng 1 và có ghi chú bác sĩ", () => {
    const r = getSafetyTier({ ...binhThuong, benhNen: ["benh_than"] });
    expect(r.tang1).toBe(true);
    expect(r.lyDoTang1).toContain("benh_than");
    expect(r.canGhiChuBacSi).toBe(true);
    expect(r.anGoiYMacro).toBe(true); // không hiện gợi ý đạm
  });

  it("không có bệnh thận → vẫn hiện gợi ý macro", () => {
    expect(
      getSafetyTier({ ...binhThuong, benhNen: ["tieu_duong"] }).anGoiYMacro,
    ).toBe(false);
    expect(getSafetyTier(binhThuong).anGoiYMacro).toBe(false);
  });

  it("trả lời 'có' về vấn đề ăn uống → tầng 1", () => {
    expect(getSafetyTier({ ...binhThuong, vanDeAnUong: "co" }).tang1).toBe(
      true,
    );
  });

  it("'không muốn trả lời' → cũng tầng 1 (phương án an toàn hơn)", () => {
    const r = getSafetyTier({
      ...binhThuong,
      vanDeAnUong: "khong_muon_tra_loi",
    });
    expect(r.tang1).toBe(true);
    expect(r.lyDoTang1).toContain("van_de_an_uong");
  });

  it("BMI 17.5 + chọn giảm mỡ → tầng 1", () => {
    // 50.6kg, 170cm → BMI ≈ 17.5
    const r = getSafetyTier({ ...binhThuong, canNangKg: 50.6 }, "giam_mo");
    expect(r.tang1).toBe(true);
    expect(r.lyDoTang1).toEqual(["bmi_thap_giam_mo"]);
    expect(r.mucTieuDuocChon).toEqual(["an_lanh_manh"]);
  });

  it("BMI 17.5 + chọn duy trì → KHÔNG tầng 1, nhưng ẩn 'Giảm mỡ'", () => {
    const r = getSafetyTier({ ...binhThuong, canNangKg: 50.6 }, "duy_tri");
    expect(r.tang1).toBe(false);
    expect(r.mucTieuDuocChon).not.toContain("giam_mo");
    expect(r.mucTieuDuocChon).toContain("tang_co");
  });

  it("nhiều lý do cùng lúc được liệt kê đủ", () => {
    const r = getSafetyTier({
      ...binhThuong,
      tuoi: 16,
      mangThaiChoConBu: true,
      vanDeAnUong: "co",
    });
    expect(r.lyDoTang1).toEqual([
      "duoi_18_tuoi",
      "mang_thai_cho_con_bu",
      "van_de_an_uong",
    ]);
  });

  it("tuổi không hợp lệ → coi như tầng 1 (an toàn hơn)", () => {
    expect(getSafetyTier({ ...binhThuong, tuoi: NaN }).tang1).toBe(true);
  });
});

describe("getSafetyTier — tầng 2", () => {
  it("tiểu đường → loại nhieu_duong, ưu tiên gi_thap, có ghi chú bác sĩ", () => {
    const r = getSafetyTier({ ...binhThuong, benhNen: ["tieu_duong"] });
    expect(r.tang1).toBe(false);
    expect(r.tang2).toBe(true);
    expect(r.tagLoai).toEqual(["nhieu_duong"]);
    expect(r.tagUuTien).toEqual(["gi_thap"]);
    expect(r.canGhiChuBacSi).toBe(true);
  });

  it("gout + huyết áp cao → loại nhieu_purine và nhieu_muoi", () => {
    const r = getSafetyTier({
      ...binhThuong,
      benhNen: ["gout", "huyet_ap_cao"],
    });
    expect(r.tagLoai).toEqual(["nhieu_purine", "nhieu_muoi"]);
    expect(r.tagUuTien).toEqual([]);
  });

  it("bệnh thận + tiểu đường → vừa tầng 1 vừa lọc món tầng 2", () => {
    const r = getSafetyTier({
      ...binhThuong,
      benhNen: ["benh_than", "tieu_duong"],
    });
    expect(r.tang1).toBe(true);
    expect(r.tang2).toBe(true);
    expect(r.tagLoai).toEqual(["nhieu_duong"]);
  });

  it("không có bệnh nền → không lọc gì", () => {
    const r = getSafetyTier(binhThuong);
    expect(r.tang2).toBe(false);
    expect(r.tagLoai).toEqual([]);
  });
});

describe("getSafetyTier — ẩn số liệu & tắt giảm bù cho tầng 1", () => {
  it("tầng 1 (mang thai, dưới 18, vấn đề ăn uống) → ẩn số liệu, tắt giảm bù", () => {
    for (const thayDoi of [
      { mangThaiChoConBu: true },
      { tuoi: 16 },
      { vanDeAnUong: "co" as const },
      { vanDeAnUong: "khong_muon_tra_loi" as const },
    ]) {
      const r = getSafetyTier({ ...binhThuong, ...thayDoi });
      expect(r.anSoLieu).toBe(true);
      expect(r.tatGiamBu).toBe(true);
    }
  });
  it("tầng 2 hoặc bình thường → vẫn hiện số liệu", () => {
    expect(
      getSafetyTier({ ...binhThuong, benhNen: ["tieu_duong"] }).anSoLieu,
    ).toBe(false);
    expect(getSafetyTier(binhThuong).tatGiamBu).toBe(false);
  });
});

import { mucTieuGoiY } from "./safety";

describe("mucTieuGoiY — gợi ý mục tiêu theo BMI", () => {
  const tatCa = ["giam_mo", "tang_co", "duy_tri", "an_lanh_manh"] as const;
  it("BMI 22,5 → Duy trì, Ăn lành mạnh", () =>
    expect(mucTieuGoiY(65, 170, [...tatCa])).toEqual([
      "duy_tri",
      "an_lanh_manh",
    ]));
  it("BMI 25,9 → Giảm mỡ", () =>
    expect(mucTieuGoiY(75, 170, [...tatCa])).toEqual(["giam_mo"]));
  it("BMI 17,3 → Ăn lành mạnh, Tăng cơ", () =>
    expect(mucTieuGoiY(50, 170, [...tatCa])).toEqual([
      "an_lanh_manh",
      "tang_co",
    ]));
  it("chỉ gợi ý trong số mục tiêu được phép; số đo vô lý → không gợi ý", () => {
    expect(mucTieuGoiY(75, 170, ["an_lanh_manh"])).toEqual([]);
    expect(mucTieuGoiY(220, 120, [...tatCa])).toEqual([]);
  });
});
