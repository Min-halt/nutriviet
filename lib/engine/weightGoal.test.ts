import { describe, expect, it } from "vitest";
import { calcCanToiThieu, checkWeightGoal } from "./weightGoal";

describe("checkWeightGoal", () => {
  it("Ca D — 70 → 62kg trong 4 tuần: 2kg/tuần = 2.86% > 1% → đề xuất ⌈8 / 0.7⌉ = 12 tuần", () => {
    const r = checkWeightGoal({
      mucTieu: "giam_mo",
      canHienTaiKg: 70,
      canMucTieuKg: 62,
      soTuan: 4,
      chieuCaoCm: 170,
    });
    expect(r.trangThai).toBe("qua_nhanh");
    expect(r.kgMoiTuan).toBeCloseTo(2, 6);
    expect(r.tiLeMoiTuan).toBeCloseTo(0.02857, 4);
    expect(r.soTuanDeXuat).toBe(12);
  });

  it("Ca E — cao 160cm, mục tiêu 46kg → BMI 17.97 < 18.5 → không nhận", () => {
    const r = checkWeightGoal({
      mucTieu: "giam_mo",
      canHienTaiKg: 52,
      canMucTieuKg: 46,
      soTuan: 30,
      chieuCaoCm: 160,
    });
    expect(r.trangThai).toBe("bmi_thap");
    expect(r.bmiMucTieu).toBeCloseTo(17.97, 2);
    expect(r.soTuanDeXuat).toBeNull();
    // 18.5 × 1.6² = 47.36 → làm tròn lên 47.4 kg
    expect(r.canToiThieuKg).toBe(47.4);
  });

  it("calcCanToiThieu — 170cm: 18.5 × 1.7² = 53.465 → 53.5 kg", () => {
    expect(calcCanToiThieu(170)).toBe(53.5);
  });

  it("Ca F — 60 → 66kg trong 10 tuần: 0.6kg/tuần = 1% > 0.5% → đề xuất 6 / 0.3 = 20 tuần", () => {
    const r = checkWeightGoal({
      mucTieu: "tang_co",
      canHienTaiKg: 60,
      canMucTieuKg: 66,
      soTuan: 10,
      chieuCaoCm: 170,
    });
    expect(r.trangThai).toBe("qua_nhanh");
    expect(r.soTuanDeXuat).toBe(20); // không bị thành 21 do sai số làm tròn
  });

  it("giảm đúng 1%/tuần (ngay ngưỡng) → ok", () => {
    const r = checkWeightGoal({
      mucTieu: "giam_mo",
      canHienTaiKg: 70,
      canMucTieuKg: 63,
      soTuan: 10,
      chieuCaoCm: 170,
    });
    expect(r.trangThai).toBe("ok");
  });

  it("tăng chậm, an toàn → ok", () => {
    const r = checkWeightGoal({
      mucTieu: "tang_co",
      canHienTaiKg: 60,
      canMucTieuKg: 63,
      soTuan: 12,
      chieuCaoCm: 170,
    });
    expect(r.trangThai).toBe("ok");
    expect(r.tiLeMoiTuan).toBeCloseTo(0.25 / 60, 9);
  });

  it("BMI thấp được ưu tiên báo trước cả lỗi tốc độ", () => {
    const r = checkWeightGoal({
      mucTieu: "giam_mo",
      canHienTaiKg: 55,
      canMucTieuKg: 45,
      soTuan: 2,
      chieuCaoCm: 165,
    });
    expect(r.trangThai).toBe("bmi_thap");
  });

  it("ngược chiều (giảm mỡ mà cân mục tiêu cao hơn) → khong_hop_le", () => {
    const r = checkWeightGoal({
      mucTieu: "giam_mo",
      canHienTaiKg: 60,
      canMucTieuKg: 65,
      soTuan: 10,
      chieuCaoCm: 170,
    });
    expect(r.trangThai).toBe("khong_hop_le");
  });

  it("tăng cơ mà cân mục tiêu bằng cân hiện tại → khong_hop_le", () => {
    const r = checkWeightGoal({
      mucTieu: "tang_co",
      canHienTaiKg: 60,
      canMucTieuKg: 60,
      soTuan: 10,
      chieuCaoCm: 170,
    });
    expect(r.trangThai).toBe("khong_hop_le");
  });

  it("số tuần = 0 hoặc thiếu → khong_hop_le", () => {
    expect(
      checkWeightGoal({
        mucTieu: "giam_mo",
        canHienTaiKg: 70,
        canMucTieuKg: 65,
        soTuan: 0,
        chieuCaoCm: 170,
      }).trangThai,
    ).toBe("khong_hop_le");
    expect(
      checkWeightGoal({
        mucTieu: "giam_mo",
        canHienTaiKg: 70,
        canMucTieuKg: 65,
        soTuan: NaN,
        chieuCaoCm: 170,
      }).trangThai,
    ).toBe("khong_hop_le");
  });
});

describe("checkWeightGoal — giảm tối đa 1 kg/tuần (góp ý của nhóm)", () => {
  it("150 kg → 120 kg trong 20 tuần: 1,5 kg/tuần > 1 kg → đề xuất 30 tuần", () => {
    const r = checkWeightGoal({
      mucTieu: "giam_mo",
      canHienTaiKg: 150,
      canMucTieuKg: 120,
      soTuan: 20,
      chieuCaoCm: 175,
    });
    expect(r.trangThai).toBe("qua_nhanh");
    expect(r.kgToiDaMoiTuan).toBe(1);
    expect(r.soTuanDeXuat).toBe(30);
  });
  it("150 kg → 140 kg trong 10 tuần: đúng 1 kg/tuần → ok", () => {
    expect(
      checkWeightGoal({
        mucTieu: "giam_mo",
        canHienTaiKg: 150,
        canMucTieuKg: 140,
        soTuan: 10,
        chieuCaoCm: 175,
      }).trangThai,
    ).toBe("ok");
  });
  it("người nhẹ cân hơn vẫn theo mức 1%: 70 kg → tối đa 0,7 kg/tuần", () => {
    expect(
      checkWeightGoal({
        mucTieu: "giam_mo",
        canHienTaiKg: 70,
        canMucTieuKg: 62,
        soTuan: 4,
        chieuCaoCm: 170,
      }).kgToiDaMoiTuan,
    ).toBeCloseTo(0.7, 9);
  });
});
