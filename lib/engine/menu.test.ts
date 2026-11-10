import { describe, expect, it } from "vitest";
import { SO_LAN_TOI_DA_MOI_TUAN } from "@/lib/config";
import { DANH_SACH_MON } from "@/lib/monAn";
import { lyDoLoai, type BoLoc } from "./dishes";
import {
  chiaCaloTheoBua,
  doiMon,
  goiYDoiMon,
  taoThucDon,
  trongKhoangCho,
  type TuyChonThucDon,
} from "./menu";

const boLoc: BoLoc = {
  tagLoai: [],
  diUng: [],
  cheDoAn: "khong_kieng",
  monKhongThich: [],
  nganSachMoiBuaVnd: 50000,
  thoiGianNauToiDa: 60,
};
const tc: TuyChonThucDon = {
  mons: DANH_SACH_MON,
  boLoc,
  kcalMucTieu: 1650,
  soBua: 3,
  phongCach: "can_bang",
  tagUuTien: [],
  noiAn: null,
};

function demLuotDung(t: ReturnType<typeof taoThucDon>) {
  const dem = new Map<string, number>();
  t.ngay.forEach((n) =>
    n.bua.forEach((b) => dem.set(b.monId, (dem.get(b.monId) ?? 0) + 1)),
  );
  return dem;
}

describe("chiaCaloTheoBua", () => {
  it("3 bữa: 2000 → 600 / 700 / 700", () => {
    expect(chiaCaloTheoBua(2000, 3)).toEqual([
      { bua: "sang", kcal: 600 },
      { bua: "trua", kcal: 700 },
      { bua: "toi", kcal: 700 },
    ]);
  });
  it("4 bữa: 2000 → 500 / 700 / 600 / 200", () => {
    expect(chiaCaloTheoBua(2000, 4).map((x) => x.kcal)).toEqual([
      500, 700, 600, 200,
    ]);
  });
});

describe("taoThucDon", () => {
  const t = taoThucDon(tc);

  it("đủ 7 ngày, mỗi ngày đạt có đúng 3 bữa theo thứ tự", () => {
    expect(t.ngay).toHaveLength(7);
    t.ngay
      .filter((n) => n.dat)
      .forEach((n) =>
        expect(n.bua.map((b) => b.bua)).toEqual(["sang", "trua", "toi"]),
      );
  });

  it("hồ sơ thông thường → cả 7 ngày đều đạt", () => {
    expect(t.ngay.every((n) => n.dat)).toBe(true);
  });

  it("mỗi ngày đạt có tổng calo trong ±10% mục tiêu", () => {
    t.ngay
      .filter((n) => n.dat)
      .forEach((n) => {
        expect(n.tong.kcal).toBeGreaterThanOrEqual(1650 * 0.9);
        expect(n.tong.kcal).toBeLessThanOrEqual(1650 * 1.1);
      });
  });

  it("không món nào quá 2 lần/tuần, không lặp trong cùng ngày", () => {
    for (const v of demLuotDung(t).values())
      expect(v).toBeLessThanOrEqual(SO_LAN_TOI_DA_MOI_TUAN);
    t.ngay.forEach((n) =>
      expect(new Set(n.bua.map((b) => b.monId)).size).toBe(n.bua.length),
    );
  });

  it("món đúng loại bữa", () => {
    t.ngay.forEach((n) =>
      n.bua.forEach((b) =>
        expect(DANH_SACH_MON.find((m) => m.id === b.monId)!.meal).toContain(
          b.bua,
        ),
      ),
    );
  });

  it("cùng đầu vào → cùng kết quả", () => {
    expect(taoThucDon(tc)).toEqual(t);
  });

  it("4 bữa → có bữa phụ, vẫn đạt", () => {
    const t4 = taoThucDon({ ...tc, soBua: 4, kcalMucTieu: 2000 });
    expect(t4.ngay.every((n) => n.dat)).toBe(true);
    t4.ngay.forEach((n) =>
      expect(n.bua.map((b) => b.bua)).toEqual(["sang", "trua", "toi", "phu"]),
    );
  });

  it("mức sàn 1200 kcal: 3 bữa đủ 7 ngày, 4 bữa ít nhất 6 ngày", () => {
    expect(
      taoThucDon({ ...tc, kcalMucTieu: 1200, soBua: 3 }).ngay.every(
        (n) => n.dat,
      ),
    ).toBe(true);
    expect(
      taoThucDon({ ...tc, kcalMucTieu: 1200, soBua: 4 }).ngay.filter(
        (n) => n.dat,
      ).length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("calo rất cao (2600) mà món không đủ lớn → báo chưa đủ món, không ép", () => {
    const x = taoThucDon({ ...tc, kcalMucTieu: 2600, soBua: 3 });
    x.ngay.forEach((n) => {
      if (n.dat) expect(trongKhoangCho(n.tong.kcal, 2600)).toBe(true);
      else expect(n.bua).toEqual([]);
    });
  });

  it("KHÔNG BAO GIỜ chọn món vi phạm bộ lọc (tiểu đường + dị ứng nước mắm)", () => {
    const b = { ...boLoc, tagLoai: ["nhieu_duong"], diUng: ["nuoc_mam"] };
    const x = taoThucDon({ ...tc, boLoc: b, tagUuTien: ["gi_thap"] });
    x.ngay.forEach((n) =>
      n.bua.forEach((m) =>
        expect(
          lyDoLoai(DANH_SACH_MON.find((d) => d.id === m.monId)!, b),
        ).toBeNull(),
      ),
    );
  });

  it("Tiết kiệm rẻ hơn Cân bằng; High-protein nhiều đạm hơn Cân bằng", () => {
    // So theo trung bình mỗi ngày đạt (công bằng nếu số ngày đạt khác nhau)
    const tongTuan = (
      x: ReturnType<typeof taoThucDon>,
      k: "gia" | "protein",
    ) => {
      const dat = x.ngay.filter((n) => n.dat);
      return dat.reduce((s, n) => s + n.tong[k], 0) / dat.length;
    };
    const tk = taoThucDon({ ...tc, phongCach: "tiet_kiem" });
    const hp = taoThucDon({ ...tc, phongCach: "high_protein" });
    expect(tongTuan(tk, "gia")).toBeLessThan(tongTuan(t, "gia"));
    expect(tongTuan(hp, "protein")).toBeGreaterThan(tongTuan(t, "protein"));
  });

  it("ăn chay + ngân sách thấp → báo chưa đủ món, không ép", () => {
    const x = taoThucDon({
      ...tc,
      boLoc: { ...boLoc, cheDoAn: "chay", nganSachMoiBuaVnd: 15000 },
    });
    const khongDat = x.ngay.filter((n) => !n.dat);
    expect(khongDat.length).toBeGreaterThan(0);
    khongDat.forEach((n) => expect(n.bua).toEqual([])); // ngày chưa đạt không hiện món
  });

  it("không còn món nào cho một bữa → ghi rõ bữa thiếu", () => {
    const x = taoThucDon({
      ...tc,
      boLoc: {
        ...boLoc,
        monKhongThich: DANH_SACH_MON.filter((m) => m.meal.includes("sang")).map(
          (m) => m.id,
        ),
      },
    });
    expect(x.ngay[0].dat).toBe(false);
    expect(x.ngay[0].buaThieuMon).toBe("sang");
  });
});

describe("goiYDoiMon / doiMon", () => {
  const t = taoThucDon(tc);

  it("tối đa 3 món, cùng bữa, khác món hiện tại, không trùng trong ngày", () => {
    for (let d = 0; d < 7; d++) {
      for (let b = 0; b < 3; b++) {
        const hienTai = t.ngay[d].bua[b];
        const goiY = goiYDoiMon(t, d, b, DANH_SACH_MON, boLoc);
        expect(goiY.length).toBeLessThanOrEqual(3);
        const cungNgay = t.ngay[d].bua.map((x) => x.monId);
        goiY.forEach((g) => {
          expect(g.mon.meal).toContain(hienTai.bua);
          expect(cungNgay).not.toContain(g.mon.id);
          expect(lyDoLoai(g.mon, boLoc)).toBeNull();
        });
      }
    }
  });

  it("sắp theo calo gần với món hiện tại nhất", () => {
    const hienTai = t.ngay[0].bua[1];
    const lech = goiYDoiMon(t, 0, 1, DANH_SACH_MON, boLoc).map((g) =>
      Math.abs(g.dinhDuong.kcal - hienTai.dinhDuong.kcal),
    );
    expect(lech).toEqual([...lech].sort((a, b) => a - b));
  });

  it("đổi xong vẫn không quá 2 lần/tuần và tổng ngày được tính lại", () => {
    const g = goiYDoiMon(t, 0, 1, DANH_SACH_MON, boLoc)[0];
    const moi = doiMon(t, 0, 1, g.mon, g.khauPhan);
    expect(moi.ngay[0].bua[1].monId).toBe(g.mon.id);
    expect(moi.ngay[0].tong.kcal).toBe(
      moi.ngay[0].bua.reduce((s, b) => s + b.dinhDuong.kcal, 0),
    );
    expect(moi.ngay[0].dat).toBe(trongKhoangCho(moi.ngay[0].tong.kcal, 1650));
    for (const v of demLuotDung(moi).values())
      expect(v).toBeLessThanOrEqual(SO_LAN_TOI_DA_MOI_TUAN);
    expect(t.ngay[0].bua[1].monId).not.toBe(g.mon.id); // bản cũ không bị sửa
  });

  it("bữa không tồn tại → không gợi ý", () => {
    expect(goiYDoiMon(t, 0, 9, DANH_SACH_MON, boLoc)).toEqual([]);
  });
});

describe("taoThucDon — ngân sách cả ngày", () => {
  it.each([15000, 20000, 25000, 30000])(
    "ngân sách %i đ/bữa: mọi ngày có thực đơn đều không vượt ngân sách × số bữa",
    (gia) => {
      const b = { ...boLoc, nganSachMoiBuaVnd: gia };
      const x = taoThucDon({ ...tc, boLoc: b });
      x.ngay
        .filter((n) => n.dat)
        .forEach((n) => {
          expect(n.tong.gia).toBeLessThanOrEqual(gia * 3);
          n.bua.forEach((m) => expect(m.gia).toBeLessThanOrEqual(gia * 1.5));
        });
    },
  );

  it("Đổi món không làm tổng tiền ngày vượt ngân sách", () => {
    const b = { ...boLoc, nganSachMoiBuaVnd: 25000 };
    const x = taoThucDon({ ...tc, boLoc: b });
    const d = x.ngay.findIndex((n) => n.dat);
    for (let i = 0; i < 3; i++) {
      for (const g of goiYDoiMon(x, d, i, DANH_SACH_MON, b)) {
        const moi = doiMon(x, d, i, g.mon, g.khauPhan);
        expect(moi.ngay[d].tong.gia).toBeLessThanOrEqual(25000 * 3);
      }
    }
  });
});
