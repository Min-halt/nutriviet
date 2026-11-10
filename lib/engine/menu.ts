/**
 * Tạo thực đơn 7 ngày (rule-based, SPEC mục 6) và gợi ý "Đổi món".
 *
 * Cách làm (dễ trình bày):
 *  1. Chia calo mục tiêu cho từng bữa (30/35/35 hoặc 25/35/30/10).
 *  2. Lọc món theo luật an toàn, dị ứng, chế độ ăn, món ghét, ngân sách, thời gian nấu.
 *  3. Với mỗi bữa: thử MỌI món hợp lệ × 3 khẩu phần, tính "điểm" rồi chọn điểm thấp nhất.
 *     Điểm = độ lệch calo so với bữa + phạt món đã dùng + ưu tiên theo phong cách.
 *  4. Một món tối đa 2 lần/tuần, không lặp trong cùng một ngày.
 *     Bữa nào ít món phù hợp thì được xếp món trước cho cả tuần.
 *  5. Tổng ngày phải trong ±10% calo mục tiêu. Chưa đạt → thử đổi khẩu phần.
 *     Vẫn chưa đạt → ngày đó báo "chưa đủ món phù hợp" (không ép).
 */
import {
  DIEM_CHON_MON,
  SAI_LECH_CALO_NGAY,
  SO_LAN_TOI_DA_MOI_TUAN,
  SO_MON_THAY_THE,
  SO_NGAY_THUC_DON,
  TI_LE_BUA,
} from "@/lib/config";
import {
  CAC_KHAU_PHAN,
  dinhDuongKhauPhan,
  locMon,
  type BoLoc,
  type Bua,
  type DinhDuong,
  type KhauPhan,
  type Mon,
} from "./dishes";

export type PhongCach = "can_bang" | "high_protein" | "tiet_kiem";

export interface CaloBua {
  bua: Bua;
  kcal: number;
}

/** Bước 1: chia calo theo bữa (làm tròn từng bữa). */
export function chiaCaloTheoBua(kcalMucTieu: number, soBua: 3 | 4): CaloBua[] {
  const tiLe = TI_LE_BUA[soBua] as Partial<Record<Bua, number>>;
  return (Object.keys(tiLe) as Bua[]).map((bua) => ({
    bua,
    kcal: Math.round(kcalMucTieu * (tiLe[bua] ?? 0)),
  }));
}

export interface MonDaChon {
  bua: Bua;
  monId: string;
  khauPhan: KhauPhan;
  dinhDuong: DinhDuong;
  gia: number;
}

export interface NgayThucDon {
  bua: MonDaChon[]; // rỗng nếu ngày chưa đạt
  tong: DinhDuong & { gia: number };
  dat: boolean; // tổng calo trong ±10% mục tiêu
  buaThieuMon: Bua | null; // bữa không còn món hợp lệ nào (nếu có)
}

export interface ThucDonTuan {
  phongCach: PhongCach;
  kcalMucTieu: number;
  soBua: 3 | 4;
  caloBua: CaloBua[];
  ngay: NgayThucDon[];
  soMonHopLe: number;
  nguon?: "thuat_toan" | "ai"; // "ai" = AI chọn món, engine đã kiểm tra lại
}

export interface TuyChonThucDon {
  mons: Mon[];
  boLoc: BoLoc;
  kcalMucTieu: number;
  soBua: 3 | 4;
  phongCach: PhongCach;
  tagUuTien: string[]; // tầng 2, vd ["gi_thap"] với tiểu đường
  noiAn: "an_ngoai" | "nau_nha" | null;
}

/** Tổng dinh dưỡng + giá của một ngày */
export function tinhTongNgay(bua: MonDaChon[]): DinhDuong & { gia: number } {
  return bua.reduce(
    (t, b) => ({
      kcal: t.kcal + b.dinhDuong.kcal,
      protein: t.protein + b.dinhDuong.protein,
      carb: t.carb + b.dinhDuong.carb,
      fat: t.fat + b.dinhDuong.fat,
      gia: t.gia + b.gia,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0, gia: 0 },
  );
}

/** Tổng calo ngày có nằm trong ±10% mục tiêu không */
export function trongKhoangCho(tongKcal: number, kcalMucTieu: number): boolean {
  return Math.abs(tongKcal - kcalMucTieu) <= kcalMucTieu * SAI_LECH_CALO_NGAY;
}

/**
 * Điểm của một lựa chọn (món + khẩu phần) cho một bữa. Điểm càng THẤP càng tốt.
 * Hệ số nằm trong lib/config.ts (DIEM_CHON_MON).
 */
export function diemLuaChon(
  mon: Mon,
  khauPhan: KhauPhan,
  kcalBua: number,
  soLanDaDung: number,
  tc: Pick<TuyChonThucDon, "phongCach" | "tagUuTien" | "noiAn" | "boLoc">,
): number {
  const kcal = dinhDuongKhauPhan(mon, khauPhan).kcal;
  let diem = Math.abs(kcal - kcalBua) / kcalBua; // độ lệch calo (0.1 = lệch 10%)
  diem += DIEM_CHON_MON.phatMoiLanDaDung * soLanDaDung;
  if (
    tc.phongCach === "high_protein" &&
    mon.style_tags.includes("high_protein")
  )
    diem -= DIEM_CHON_MON.thuongHighProtein;
  if (tc.phongCach === "tiet_kiem")
    diem +=
      DIEM_CHON_MON.phatGiaTietKiem *
      (mon.price_vnd / tc.boLoc.nganSachMoiBuaVnd);
  if (mon.health_tags.some((t) => tc.tagUuTien.includes(t)))
    diem -= DIEM_CHON_MON.thuongTagUuTien;
  if (tc.noiAn !== null && mon.eat_out === (tc.noiAn === "an_ngoai"))
    diem -= DIEM_CHON_MON.thuongDungNoiAn;
  // Món đắt hơn ngân sách bữa (trong mức linh hoạt) → cộng điểm theo phần vượt, để ưu tiên món vừa túi tiền
  const nganSach = tc.boLoc.nganSachMoiBuaVnd;
  if (mon.price_vnd > nganSach)
    diem +=
      DIEM_CHON_MON.phatVuotNganSachBua *
      ((mon.price_vnd - nganSach) / nganSach);
  return diem;
}

function taoMonDaChon(mon: Mon, bua: Bua, khauPhan: KhauPhan): MonDaChon {
  return {
    bua,
    monId: mon.id,
    khauPhan,
    dinhDuong: dinhDuongKhauPhan(mon, khauPhan),
    gia: mon.price_vnd,
  };
}

/**
 * Khi tổng ngày lệch quá 10%: thử mọi tổ hợp khẩu phần (3^số bữa, tối đa 81 cách)
 * của các món đã chọn, lấy tổ hợp có tổng gần mục tiêu nhất.
 */
function toiUuKhauPhan(
  chon: { mon: Mon; bua: Bua; khauPhan: KhauPhan }[],
  kcalMucTieu: number,
) {
  let tot = chon.map((c) => c.khauPhan);
  let lechTot = Infinity;
  const n = chon.length;
  for (let ma = 0; ma < 3 ** n; ma++) {
    const thu: KhauPhan[] = [];
    let x = ma;
    for (let i = 0; i < n; i++) {
      thu.push(CAC_KHAU_PHAN[x % 3]);
      x = Math.floor(x / 3);
    }
    const tong = chon.reduce(
      (s, c, i) => s + dinhDuongKhauPhan(c.mon, thu[i]).kcal,
      0,
    );
    const lech = Math.abs(tong - kcalMucTieu);
    if (lech < lechTot) {
      lechTot = lech;
      tot = thu;
    }
  }
  return chon.map((c, i) => ({ ...c, khauPhan: tot[i] }));
}

const NGAY_RONG = (buaThieuMon: Bua | null): NgayThucDon => ({
  bua: [],
  tong: { kcal: 0, protein: 0, carb: 0, fat: 0, gia: 0 },
  dat: false,
  buaThieuMon,
});

/**
 * Tạo thực đơn 7 ngày. Cùng đầu vào → luôn cùng kết quả (dễ kiểm tra, dễ trình bày).
 *
 * Giai đoạn A — Xếp món cho cả tuần theo TỪNG LOẠI BỮA:
 *   bữa nào có ÍT món phù hợp nhất thì xếp trước (thường là bữa phụ → sáng → tối/trưa).
 *   Nhờ vậy các món dùng được cho nhiều bữa (vd bánh mì: sáng hoặc phụ) không bị
 *   bữa trưa "dùng hết" trước, khiến cuối tuần thiếu món cho bữa sáng.
 * Giai đoạn B — Từng ngày: kiểm tra tổng calo ±10% và tổng tiền ≤ ngân sách cả ngày.
 *   Chưa đạt thì thử đổi khẩu phần, rồi thay dần từng món; vẫn không được → báo chưa đủ món.
 */
export function taoThucDon(tc: TuyChonThucDon): ThucDonTuan {
  const hopLe = locMon(tc.mons, tc.boLoc);
  const caloBua = chiaCaloTheoBua(tc.kcalMucTieu, tc.soBua);
  const daDung = new Map<string, number>(); // số lần mỗi món đã dùng trong tuần

  // Bảng xếp món: chon[ngày][vị trí bữa]
  const chon: ({ mon: Mon; khauPhan: KhauPhan } | null)[][] = Array.from(
    { length: SO_NGAY_THUC_DON },
    () => caloBua.map(() => null),
  );

  // Thứ tự xếp: bữa ít ứng viên trước; bằng nhau thì theo thứ tự sáng → trưa → tối → phụ
  const thuTuBua = caloBua
    .map((cb, viTri) => ({
      ...cb,
      viTri,
      soUngVien: hopLe.filter((m) => m.meal.includes(cb.bua)).length,
    }))
    .sort((a, b) => a.soUngVien - b.soUngVien || a.viTri - b.viTri);

  // ── Giai đoạn A ──
  for (const { bua, kcal, viTri } of thuTuBua) {
    for (let d = 0; d < SO_NGAY_THUC_DON; d++) {
      const cungNgay = chon[d].filter((c) => c !== null).map((c) => c!.mon.id);
      const ungVien = hopLe.filter(
        (m) =>
          m.meal.includes(bua) &&
          (daDung.get(m.id) ?? 0) < SO_LAN_TOI_DA_MOI_TUAN &&
          !cungNgay.includes(m.id), // không lặp trong cùng ngày
      );
      let tot: { mon: Mon; khauPhan: KhauPhan; diem: number } | null = null;
      for (const mon of ungVien) {
        for (const khauPhan of CAC_KHAU_PHAN) {
          const diem = diemLuaChon(
            mon,
            khauPhan,
            kcal,
            daDung.get(mon.id) ?? 0,
            tc,
          );
          if (!tot || diem < tot.diem - 1e-9) tot = { mon, khauPhan, diem };
        }
      }
      if (tot) {
        chon[d][viTri] = { mon: tot.mon, khauPhan: tot.khauPhan };
        daDung.set(tot.mon.id, (daDung.get(tot.mon.id) ?? 0) + 1);
      }
    }
  }

  // ── Giai đoạn B ──
  // Một ngày "đạt" khi: tổng calo trong ±10% VÀ tổng tiền ≤ ngân sách cả ngày (ngân sách TB mỗi bữa × số bữa)
  const nganSachNgay = tc.boLoc.nganSachMoiBuaVnd * tc.soBua;
  type O = { mon: Mon; khauPhan: KhauPhan; bua: Bua };
  const tongKcal = (x: O[]) =>
    x.reduce((s, c) => s + dinhDuongKhauPhan(c.mon, c.khauPhan).kcal, 0);
  const tongGia = (x: O[]) => x.reduce((s, c) => s + c.mon.price_vnd, 0);
  const datNgay = (x: O[]) =>
    trongKhoangCho(tongKcal(x), tc.kcalMucTieu) && tongGia(x) <= nganSachNgay;
  const chinhKhauPhan = (x: O[]) =>
    trongKhoangCho(tongKcal(x), tc.kcalMucTieu)
      ? x
      : toiUuKhauPhan(x, tc.kcalMucTieu);
  // Điểm của một ngày (càng thấp càng tốt): ngày đạt luôn tốt hơn ngày chưa đạt
  const diemNgay = (x: O[]) => {
    const lechKcal = Math.abs(tongKcal(x) - tc.kcalMucTieu) / tc.kcalMucTieu;
    const vuotGia = Math.max(0, tongGia(x) - nganSachNgay) / nganSachNgay;
    return datNgay(x) ? lechKcal - 10 : lechKcal + 2 * vuotGia;
  };

  const ngay: NgayThucDon[] = chon.map((hang) => {
    const viTriThieu = hang.findIndex((c) => c === null);
    if (viTriThieu >= 0) return NGAY_RONG(caloBua[viTriThieu].bua);

    let ds: O[] = chinhKhauPhan(
      hang.map((c, i) => ({
        mon: c!.mon,
        khauPhan: c!.khauPhan,
        bua: caloBua[i].bua,
      })),
    );

    // Chưa đạt (lệch calo hoặc vượt ngân sách ngày) → thay dần từng món bằng món khác
    // còn lượt dùng (giữ luật 2 lần/tuần, không trùng trong ngày), mỗi lần chọn cách thay tốt nhất
    for (let lan = 0; lan < ds.length && !datNgay(ds); lan++) {
      let totNhat: { ds: O[]; diem: number; cu: string; moi: string } | null =
        null;
      for (let i = 0; i < ds.length; i++) {
        const cungNgay = ds.filter((_, j) => j !== i).map((c) => c.mon.id);
        for (const mon of hopLe) {
          if (
            !mon.meal.includes(ds[i].bua) ||
            mon.id === ds[i].mon.id ||
            cungNgay.includes(mon.id)
          )
            continue;
          if ((daDung.get(mon.id) ?? 0) >= SO_LAN_TOI_DA_MOI_TUAN) continue;
          const thu = chinhKhauPhan(
            ds.map((c, j) => (j === i ? { ...c, mon } : c)),
          );
          const diem = diemNgay(thu);
          if (!totNhat || diem < totNhat.diem)
            totNhat = { ds: thu, diem, cu: ds[i].mon.id, moi: mon.id };
        }
      }
      if (!totNhat || totNhat.diem >= diemNgay(ds)) break; // không còn cách thay nào tốt hơn
      // Cập nhật lượt dùng: trả lượt món cũ, tính lượt món mới
      daDung.set(totNhat.cu, (daDung.get(totNhat.cu) ?? 1) - 1);
      daDung.set(totNhat.moi, (daDung.get(totNhat.moi) ?? 0) + 1);
      ds = totNhat.ds;
    }

    // Không ép: vẫn chưa đạt thì ngày này báo "chưa đủ món phù hợp" và trả lượt cho ngày sau
    if (!datNgay(ds)) {
      for (const c of ds) daDung.set(c.mon.id, (daDung.get(c.mon.id) ?? 1) - 1);
      return NGAY_RONG(null);
    }
    const bua = ds.map((c) => taoMonDaChon(c.mon, c.bua, c.khauPhan));
    return { bua, tong: tinhTongNgay(bua), dat: true, buaThieuMon: null };
  });

  return {
    phongCach: tc.phongCach,
    kcalMucTieu: tc.kcalMucTieu,
    soBua: tc.soBua,
    caloBua,
    ngay,
    soMonHopLe: hopLe.length,
  };
}

// ─────────────────────────────────────────────
// Đổi món
// ─────────────────────────────────────────────

export interface LuaChonThayThe {
  mon: Mon;
  khauPhan: KhauPhan;
  dinhDuong: DinhDuong;
}

/**
 * Gợi ý tối đa 3 món thay thế cho một bữa:
 * cùng bữa, cùng bộ lọc, khác món hiện tại, vẫn giữ luật 2 lần/tuần và không trùng trong ngày,
 * sắp theo calo gần với món hiện tại nhất (mỗi món chọn khẩu phần gần nhất).
 */
export function goiYDoiMon(
  thucDon: ThucDonTuan,
  ngayIdx: number,
  buaIdx: number,
  mons: Mon[],
  boLoc: BoLoc,
): LuaChonThayThe[] {
  const hienTai = thucDon.ngay[ngayIdx]?.bua[buaIdx];
  if (!hienTai) return [];

  // Đếm lượt dùng trong tuần, KHÔNG tính chính ô đang đổi
  const daDung = new Map<string, number>();
  thucDon.ngay.forEach((n, i) =>
    n.bua.forEach((b, j) => {
      if (i === ngayIdx && j === buaIdx) return;
      daDung.set(b.monId, (daDung.get(b.monId) ?? 0) + 1);
    }),
  );
  const cungNgay = thucDon.ngay[ngayIdx].bua
    .filter((_, j) => j !== buaIdx)
    .map((b) => b.monId);

  // Đổi xong, tổng tiền cả ngày vẫn không vượt ngân sách ngày (ngân sách TB mỗi bữa × số bữa)
  const giaNgayConLai = thucDon.ngay[ngayIdx].tong.gia - hienTai.gia;
  const nganSachNgay = boLoc.nganSachMoiBuaVnd * thucDon.soBua;

  const ungVien = locMon(mons, boLoc).filter(
    (m) =>
      m.meal.includes(hienTai.bua) &&
      m.id !== hienTai.monId &&
      (daDung.get(m.id) ?? 0) < SO_LAN_TOI_DA_MOI_TUAN &&
      !cungNgay.includes(m.id) &&
      giaNgayConLai + m.price_vnd <= nganSachNgay,
  );

  return ungVien
    .map((mon) => {
      let tot: LuaChonThayThe & { lech: number } = {
        mon,
        khauPhan: "vua",
        dinhDuong: dinhDuongKhauPhan(mon, "vua"),
        lech: Infinity,
      };
      for (const khauPhan of CAC_KHAU_PHAN) {
        const dd = dinhDuongKhauPhan(mon, khauPhan);
        const lech = Math.abs(dd.kcal - hienTai.dinhDuong.kcal);
        if (lech < tot.lech) tot = { mon, khauPhan, dinhDuong: dd, lech };
      }
      return tot;
    })
    .sort((a, b) => a.lech - b.lech || a.mon.id.localeCompare(b.mon.id))
    .slice(0, SO_MON_THAY_THE)
    .map(({ mon, khauPhan, dinhDuong }) => ({ mon, khauPhan, dinhDuong }));
}

/** Thay món ở một bữa, tính lại tổng ngày (trả về thực đơn MỚI, không sửa bản cũ). */
export function doiMon(
  thucDon: ThucDonTuan,
  ngayIdx: number,
  buaIdx: number,
  mon: Mon,
  khauPhan: KhauPhan,
): ThucDonTuan {
  const ngay = thucDon.ngay.map((n, i) => {
    if (i !== ngayIdx) return n;
    const bua = n.bua.map((b, j) =>
      j === buaIdx ? taoMonDaChon(mon, b.bua, khauPhan) : b,
    );
    const tong = tinhTongNgay(bua);
    return {
      ...n,
      bua,
      tong,
      dat: trongKhoangCho(tong.kcal, thucDon.kcalMucTieu),
    };
  });
  return { ...thucDon, ngay };
}

// ─────────────────────────────────────────────
// Dùng cho AI "chọn món đa dạng" (SPEC mục 8.3)
// ─────────────────────────────────────────────

/** Danh sách món hợp lệ (đã qua mọi bộ lọc) cho từng bữa — đây là thứ DUY NHẤT gửi cho AI chọn. */
export function ungVienTheoBua(
  tc: Pick<TuyChonThucDon, "mons" | "boLoc" | "soBua" | "kcalMucTieu">,
) {
  const hopLe = locMon(tc.mons, tc.boLoc);
  return chiaCaloTheoBua(tc.kcalMucTieu, tc.soBua).map(({ bua, kcal }) => ({
    bua,
    kcal,
    mon: hopLe.filter((m) => m.meal.includes(bua)),
  }));
}

/**
 * Nhận món AI chọn (luaChon[ngày][vị trí bữa] = id món) → engine KIỂM TRA LẠI rồi tự tính khẩu phần.
 * Trả về null (→ dùng thực đơn rule-based) nếu vi phạm bất kỳ luật nào:
 *  - sai số ngày / số bữa
 *  - món không nằm trong danh sách ứng viên của bữa đó (tức là vi phạm bộ lọc)
 *  - một món quá 2 lần/tuần, hoặc trùng trong cùng ngày
 *  - tổng calo một ngày lệch quá ±10% dù đã thử mọi tổ hợp khẩu phần
 */
export function dungThucDonTuLuaChon(
  luaChon: unknown,
  tc: TuyChonThucDon,
): ThucDonTuan | null {
  const ungVien = ungVienTheoBua(tc);
  if (!Array.isArray(luaChon) || luaChon.length !== SO_NGAY_THUC_DON)
    return null;

  const daDung = new Map<string, number>();
  const ngay: NgayThucDon[] = [];

  for (const hang of luaChon) {
    if (!Array.isArray(hang) || hang.length !== ungVien.length) return null;
    const chon: { mon: Mon; bua: Bua; khauPhan: KhauPhan }[] = [];
    for (let i = 0; i < ungVien.length; i++) {
      const id = hang[i];
      const mon = ungVien[i].mon.find((m) => m.id === id);
      if (!mon) return null; // món không có trong danh sách được phép
      if (chon.some((c) => c.mon.id === mon.id)) return null; // trùng trong ngày
      const lan = (daDung.get(mon.id) ?? 0) + 1;
      if (lan > SO_LAN_TOI_DA_MOI_TUAN) return null; // quá 2 lần/tuần
      daDung.set(mon.id, lan);
      // Engine chọn khẩu phần có calo gần mục tiêu bữa nhất (AI không quyết định số liệu)
      let khauPhan: KhauPhan = "vua";
      let lechTot = Infinity;
      for (const kp of CAC_KHAU_PHAN) {
        const lech = Math.abs(
          dinhDuongKhauPhan(mon, kp).kcal - ungVien[i].kcal,
        );
        if (lech < lechTot) {
          lechTot = lech;
          khauPhan = kp;
        }
      }
      chon.push({ mon, bua: ungVien[i].bua, khauPhan });
    }
    let ds = chon;
    const tongTam = ds.reduce(
      (s, c) => s + dinhDuongKhauPhan(c.mon, c.khauPhan).kcal,
      0,
    );
    if (!trongKhoangCho(tongTam, tc.kcalMucTieu))
      ds = toiUuKhauPhan(ds, tc.kcalMucTieu);
    const bua = ds.map((c) => taoMonDaChon(c.mon, c.bua, c.khauPhan));
    const tong = tinhTongNgay(bua);
    if (!trongKhoangCho(tong.kcal, tc.kcalMucTieu)) return null; // không đạt ±10%
    if (tong.gia > tc.boLoc.nganSachMoiBuaVnd * tc.soBua) return null; // vượt ngân sách cả ngày
    ngay.push({ bua, tong, dat: true, buaThieuMon: null });
  }

  return {
    phongCach: tc.phongCach,
    kcalMucTieu: tc.kcalMucTieu,
    soBua: tc.soBua,
    caloBua: chiaCaloTheoBua(tc.kcalMucTieu, tc.soBua),
    ngay,
    soMonHopLe: locMon(tc.mons, tc.boLoc).length,
    nguon: "ai",
  };
}
