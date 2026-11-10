import { describe, expect, it } from "vitest";
import {
  DRAFT_TRONG,
  chuanHoaMucTieu,
  docSo,
  draftThanhHoSo,
  hoSoThanhDraft,
  kiemTraBuoc,
  laHoSoHopLe,
  type Draft,
} from "./profile";

/** Bản nháp đã điền đủ cả 5 bước (hồ sơ Ca A) */
const draftDu: Draft = {
  ...DRAFT_TRONG,
  tuoi: "20",
  mangThaiChoConBu: false,
  khongCoBenh: true,
  vanDeAnUong: "khong",
  gioiTinh: "nam",
  chieuCaoCm: "170",
  canNangKg: "65",
  congViec: "ngoi_nhieu",
  coTheThao: false,
  mucTieu: "giam_mo",
  canMucTieuKg: "60",
  soTuan: "12",
  cheDoAn: "khong_kieng",
  nganSachMoiBuaVnd: "35.000",
  thoiGianNauToiDa: 30,
  soBua: 3,
  noiAn: "an_ngoai",
};

describe("docSo", () => {
  it("đọc dấu phẩy thập phân", () => expect(docSo("65,5")).toBe(65.5));
  it("đọc tiền có dấu chấm ngăn nghìn", () =>
    expect(docSo("35.000", true)).toBe(35000));
  it("chữ lạ hoặc rỗng → NaN", () => {
    expect(docSo("")).toBeNaN();
    expect(docSo("abc")).toBeNaN();
    expect(docSo("-5")).toBeNaN();
  });
});

describe("kiemTraBuoc", () => {
  it("bản nháp đầy đủ → không có lỗi ở bước nào", () => {
    for (let b = 1; b <= 5; b++) expect(kiemTraBuoc(b, draftDu)).toEqual({});
  });

  it("bước 1 — bản nháp trống báo đủ 4 lỗi (giới tính hỏi trước, câu mang thai chưa hiện)", () => {
    expect(Object.keys(kiemTraBuoc(1, DRAFT_TRONG)).sort()).toEqual([
      "benhNen",
      "gioiTinh",
      "tuoi",
      "vanDeAnUong",
    ]);
  });

  it("bước 1 — tuổi ngoài khoảng 13–100", () => {
    expect(kiemTraBuoc(1, { ...draftDu, tuoi: "12" }).tuoi).toBeDefined();
    expect(kiemTraBuoc(1, { ...draftDu, tuoi: "101" }).tuoi).toBeDefined();
  });

  it("bước 2 — chiều cao/cân nặng ngoài khoảng", () => {
    const loi = kiemTraBuoc(2, {
      ...draftDu,
      chieuCaoCm: "300",
      canNangKg: "20",
    });
    expect(loi.chieuCaoCm).toBeDefined();
    expect(loi.canNangKg).toBeDefined();
  });

  it("bước 3 — có thể thao thì phải điền đủ chi tiết", () => {
    const loi = kiemTraBuoc(3, { ...draftDu, coTheThao: true });
    expect(Object.keys(loi).sort()).toEqual([
      "cuongDo",
      "monTheThao",
      "phutMoiBuoi",
      "soBuoiMoiTuan",
    ]);
  });

  it("bước 4 — cân mục tiêu làm BMI < 18.5 → chưa nhận", () => {
    expect(
      kiemTraBuoc(4, { ...draftDu, canMucTieuKg: "50" }).canMucTieuKg,
    ).toBe("MUC_TIEU_CHUA_NHAN");
  });

  it("bước 4 — giảm mỡ mà cân mục tiêu cao hơn → chưa nhận", () => {
    expect(
      kiemTraBuoc(4, { ...draftDu, canMucTieuKg: "70" }).canMucTieuKg,
    ).toBe("MUC_TIEU_CHUA_NHAN");
  });

  it("bước 4 — giảm quá nhanh vẫn cho đi tiếp (trang Kết quả sẽ đề xuất)", () => {
    expect(
      kiemTraBuoc(4, { ...draftDu, canMucTieuKg: "56", soTuan: "3" }),
    ).toEqual({});
  });

  it("bước 4 — tầng 1 mà chọn giảm mỡ → báo lỗi", () => {
    expect(kiemTraBuoc(4, { ...draftDu, tuoi: "17" }).mucTieu).toBeDefined();
  });

  it("bước 5 — ngân sách ngoài khoảng, thiếu lựa chọn", () => {
    const loi = kiemTraBuoc(5, {
      ...draftDu,
      nganSachMoiBuaVnd: "1000",
      soBua: null,
    });
    expect(loi.nganSachMoiBuaVnd).toBeDefined();
    expect(loi.soBua).toBeDefined();
  });
});

describe("chuanHoaMucTieu", () => {
  it("tầng 1 → tự chọn 'Ăn cân bằng'", () => {
    expect(chuanHoaMucTieu({ ...draftDu, tuoi: "17" }).mucTieu).toBe(
      "an_lanh_manh",
    );
  });
  it("BMI thấp mà đang chọn giảm mỡ → bỏ chọn", () => {
    expect(chuanHoaMucTieu({ ...draftDu, canNangKg: "50" }).mucTieu).toBeNull();
  });
  it("bình thường → giữ nguyên", () => {
    expect(chuanHoaMucTieu(draftDu).mucTieu).toBe("giam_mo");
  });
});

describe("draftThanhHoSo / hoSoThanhDraft", () => {
  it("bản nháp đầy đủ → hồ sơ đúng kiểu số", () => {
    const h = draftThanhHoSo(draftDu)!;
    expect(h).not.toBeNull();
    expect(h.tuoi).toBe(20);
    expect(h.nganSachMoiBuaVnd).toBe(35000);
    expect(h.benhNen).toEqual([]);
    expect(h.theThao).toBeNull();
  });

  it("thiếu bước → null", () => {
    expect(draftThanhHoSo({ ...draftDu, soBua: null })).toBeNull();
  });

  it("chuyển qua lại không mất dữ liệu", () => {
    const h = draftThanhHoSo(draftDu)!;
    expect(draftThanhHoSo(hoSoThanhDraft(h))).toEqual(h);
  });

  it("không giữ cân mục tiêu khi mục tiêu là duy trì", () => {
    const h = draftThanhHoSo({ ...draftDu, mucTieu: "duy_tri" })!;
    expect(h.canMucTieuKg).toBeNull();
    expect(h.soTuan).toBeNull();
  });
});

describe("laHoSoHopLe", () => {
  it("nhận hồ sơ đúng, từ chối dữ liệu hỏng", () => {
    expect(laHoSoHopLe(draftThanhHoSo(draftDu))).toBe(true);
    expect(laHoSoHopLe(null)).toBe(false);
    expect(laHoSoHopLe({ phienBan: 1 })).toBe(false);
    expect(laHoSoHopLe({ ...draftThanhHoSo(draftDu)!, tuoi: -3 })).toBe(false);
  });
});

describe("Giới tính & câu mang thai (góp ý của nhóm)", () => {
  it("Nam: không cần trả lời câu mang thai; hồ sơ luôn ghi 'không'", () => {
    const d = { ...draftDu, gioiTinh: "nam" as const, mangThaiChoConBu: null };
    expect(kiemTraBuoc(1, d)).toEqual({});
    expect(draftThanhHoSo(d)!.mangThaiChoConBu).toBe(false);
  });
  it("Nữ: bắt buộc trả lời câu mang thai", () => {
    expect(
      kiemTraBuoc(1, { ...draftDu, gioiTinh: "nu", mangThaiChoConBu: null })
        .mangThaiChoConBu,
    ).toBeDefined();
  });
  it("hồ sơ cũ lỡ lưu 'nam + mang thai' → được sửa thành 'không'", () => {
    const h = {
      ...draftThanhHoSo(draftDu)!,
      gioiTinh: "nam" as const,
      mangThaiChoConBu: true,
    };
    expect(draftThanhHoSo(hoSoThanhDraft(h))!.mangThaiChoConBu).toBe(false);
  });
});

describe("Số đo vô lý (góp ý của nhóm)", () => {
  it("120 cm / 220 kg (BMI ≈ 153) → báo kiểm tra lại, chưa cho đi tiếp", () => {
    const loi = kiemTraBuoc(2, {
      ...draftDu,
      chieuCaoCm: "120",
      canNangKg: "220",
    });
    expect(loi.canNangKg).toContain("chưa khớp (BMI ≈ 153)");
  });
  it("200 cm / 40 kg (BMI 10) → cũng báo", () => {
    expect(
      kiemTraBuoc(2, { ...draftDu, chieuCaoCm: "200", canNangKg: "40" })
        .canNangKg,
    ).toBeDefined();
  });
  it("170 cm / 140 kg (BMI 48,4 — cao nhưng có thật) → vẫn nhận", () => {
    expect(
      kiemTraBuoc(2, { ...draftDu, chieuCaoCm: "170", canNangKg: "140" }),
    ).toEqual({});
  });
  it("cân mục tiêu làm BMI > 60 → báo", () => {
    const d = {
      ...draftDu,
      chieuCaoCm: "150",
      canNangKg: "120",
      mucTieu: "tang_co" as const,
      canMucTieuKg: "140",
      soTuan: "100",
    };
    expect(kiemTraBuoc(4, d).canMucTieuKg).toContain("chưa khớp với chiều cao");
  });
});

describe("Ngân sách dưới 10.000 đ", () => {
  it("báo rõ lý do (không đủ món đủ chất), không chỉ báo 'sai'", () => {
    expect(
      kiemTraBuoc(5, { ...draftDu, nganSachMoiBuaVnd: "8000" })
        .nganSachMoiBuaVnd,
    ).toContain("chưa tìm được món đủ chất");
    expect(
      kiemTraBuoc(5, { ...draftDu, nganSachMoiBuaVnd: "10000" })
        .nganSachMoiBuaVnd,
    ).toBeUndefined();
  });
});
