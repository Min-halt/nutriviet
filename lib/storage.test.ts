import { describe, expect, it } from "vitest";
import { DRAFT_TRONG, draftThanhHoSo, type Draft } from "./profile";
import {
  KHOA_HO_SO,
  docHoSo,
  luuHoSo,
  xoaHoSo,
  type KhoLuuTru,
} from "./storage";

/** localStorage giả để test (chạy trong Node không có trình duyệt) */
function taoKhoGia(): KhoLuuTru & { duLieu: Map<string, string> } {
  const duLieu = new Map<string, string>();
  return {
    duLieu,
    getItem: (k) => duLieu.get(k) ?? null,
    setItem: (k, v) => void duLieu.set(k, v),
    removeItem: (k) => void duLieu.delete(k),
  };
}

const draft: Draft = {
  ...DRAFT_TRONG,
  tuoi: "25",
  mangThaiChoConBu: false,
  khongCoBenh: true,
  vanDeAnUong: "khong",
  gioiTinh: "nu",
  chieuCaoCm: "160",
  canNangKg: "55",
  congViec: "ngoi_nhieu",
  coTheThao: false,
  mucTieu: "duy_tri",
  cheDoAn: "chay",
  thoiGianNauToiDa: 15,
  soBua: 4,
  noiAn: "nau_nha",
};

describe("storage", () => {
  it("lưu rồi đọc lại đúng hồ sơ", () => {
    const kho = taoKhoGia();
    const h = draftThanhHoSo(draft)!;
    luuHoSo(h, kho);
    expect(docHoSo(kho)).toEqual(h);
  });

  it("chưa có hồ sơ → null", () => {
    expect(docHoSo(taoKhoGia())).toBeNull();
  });

  it("dữ liệu hỏng → null (không làm sập app)", () => {
    const kho = taoKhoGia();
    kho.setItem(KHOA_HO_SO, "{không phải json");
    expect(docHoSo(kho)).toBeNull();
    kho.setItem(KHOA_HO_SO, JSON.stringify({ phienBan: 99 }));
    expect(docHoSo(kho)).toBeNull();
  });

  it("xóa hồ sơ", () => {
    const kho = taoKhoGia();
    luuHoSo(draftThanhHoSo(draft)!, kho);
    xoaHoSo(kho);
    expect(docHoSo(kho)).toBeNull();
  });

  it("không có kho (đang chạy trên server) → không lỗi", () => {
    expect(docHoSo(null)).toBeNull();
    expect(() => luuHoSo(draftThanhHoSo(draft)!, null)).not.toThrow();
  });
});

import {
  doiNuoc,
  luuCaiDat,
  phanTichCaiDat,
  phanTichNhatKy,
  themMonDaAn,
  xoaMonDaAn,
  KHOA_CAI_DAT,
  KHOA_NHAT_KY,
} from "./storage";
import type { MonDaAn } from "@/lib/engine/tracking";

const monAn: MonDaAn = {
  id: "a1",
  monId: "pho-bo",
  khauPhan: "vua",
  bua: "sang",
  ngoaiKeHoach: false,
  dinhDuong: { kcal: 450, protein: 25, carb: 60, fat: 12 },
};

describe("storage — nhật ký", () => {
  it("thêm, xóa món theo ngày", () => {
    const kho = taoKhoGia();
    themMonDaAn("2026-11-01", monAn, kho);
    themMonDaAn("2026-11-01", { ...monAn, id: "a2" }, kho);
    expect(
      phanTichNhatKy(kho.getItem(KHOA_NHAT_KY))["2026-11-01"].mon,
    ).toHaveLength(2);
    xoaMonDaAn("2026-11-01", "a1", kho);
    expect(
      phanTichNhatKy(kho.getItem(KHOA_NHAT_KY))["2026-11-01"].mon.map(
        (m) => m.id,
      ),
    ).toEqual(["a2"]);
  });

  it("nước: không âm, không quá 30 ly", () => {
    const kho = taoKhoGia();
    doiNuoc("2026-11-01", -1, kho);
    expect(phanTichNhatKy(kho.getItem(KHOA_NHAT_KY))["2026-11-01"].nuoc).toBe(
      0,
    );
    for (let i = 0; i < 40; i++) doiNuoc("2026-11-01", 1, kho);
    expect(phanTichNhatKy(kho.getItem(KHOA_NHAT_KY))["2026-11-01"].nuoc).toBe(
      30,
    );
  });

  it("dữ liệu hỏng → bỏ qua phần hỏng, không lỗi", () => {
    expect(phanTichNhatKy("{hỏng")).toEqual({});
    const nk = phanTichNhatKy(
      JSON.stringify({
        "2026-11-01": { mon: [monAn, { id: 1 }], nuoc: 3 },
        "ngày-lạ": { mon: [], nuoc: 1 },
      }),
    );
    expect(Object.keys(nk)).toEqual(["2026-11-01"]);
    expect(nk["2026-11-01"].mon).toHaveLength(1);
  });
});

describe("storage — cài đặt", () => {
  it("mặc định tắt chế độ Đơn giản; lưu rồi đọc lại", () => {
    const kho = taoKhoGia();
    expect(phanTichCaiDat(null).cheDoDonGian).toBe(false);
    luuCaiDat({ cheDoDonGian: true }, kho);
    expect(phanTichCaiDat(kho.getItem(KHOA_CAI_DAT)).cheDoDonGian).toBe(true);
    expect(phanTichCaiDat("rác").cheDoDonGian).toBe(false);
  });
});

import { coThucDonDaDoi, luuThucDon } from "./storage";
import { taoThucDon } from "@/lib/engine/menu";
import { DANH_SACH_MON } from "@/lib/monAn";

describe("storage — nhắc khi sắp mất món đã đổi", () => {
  it("chưa đổi → false; đã lưu thực đơn đổi món → true; hồ sơ khác → false", () => {
    const kho = taoKhoGia();
    const h = draftThanhHoSo(draft)!;
    expect(coThucDonDaDoi(kho.getItem("nutriviet.thucDon"), h)).toBe(false);
    const td = taoThucDon({
      mons: DANH_SACH_MON,
      boLoc: {
        tagLoai: [],
        diUng: [],
        cheDoAn: "chay",
        monKhongThich: [],
        nganSachMoiBuaVnd: 35000,
        thoiGianNauToiDa: 15,
      },
      kcalMucTieu: 1600,
      soBua: 4,
      phongCach: "can_bang",
      tagUuTien: [],
      noiAn: "nau_nha",
    });
    luuThucDon(h, td, kho);
    expect(coThucDonDaDoi(kho.getItem("nutriviet.thucDon"), h)).toBe(true);
    expect(
      coThucDonDaDoi(kho.getItem("nutriviet.thucDon"), { ...h, canNangKg: 56 }),
    ).toBe(false);
  });
});

import { xoaToanBoDuLieu } from "./storage";

describe("storage — xóa toàn bộ dữ liệu", () => {
  it("xóa hết khóa nutriviet., giữ dữ liệu của trang khác", () => {
    const kho = taoKhoGia();
    luuHoSo(draftThanhHoSo(draft)!, kho);
    themMonDaAn("2026-11-01", monAn, kho);
    luuCaiDat({ cheDoDonGian: true }, kho);
    kho.setItem("trang-khac", "giu-nguyen");
    xoaToanBoDuLieu(kho);
    expect([...kho.duLieu.keys()]).toEqual(["trang-khac"]);
    expect(docHoSo(kho)).toBeNull();
  });
});

describe("storage — hồ sơ cũ 'nam + mang thai'", () => {
  it("đọc ra đã được chuẩn hóa thành 'không'", () => {
    const kho = taoKhoGia();
    const h = {
      ...draftThanhHoSo(draft)!,
      gioiTinh: "nam" as const,
      mangThaiChoConBu: true,
    };
    kho.setItem(KHOA_HO_SO, JSON.stringify(h));
    expect(docHoSo(kho)!.mangThaiChoConBu).toBe(false);
  });
});
