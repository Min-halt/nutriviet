"use client";
/**
 * Bước 6 — Trang Kết quả: BMR, TDEE, calo mục tiêu, macro và "Vì sao ra con số này?".
 * Mọi con số do engine (lib/engine) tính; chữ giải thích do code ghép, không dùng AI.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GhiChuDiUngAnNgoai } from "@/components/onboarding/CacBuoc";
import {
  DangTai,
  HopGhiChu,
  KhungTrang,
  NutLienKet,
  ThanhTienDo,
} from "@/components/ui";
import { DIEU_CHINH_CALO, GHI_CHU_BAC_SI } from "@/lib/config";
import {
  LOI_DAM_BENH_THAN,
  LOI_KHUYEN_CHUYEN_GIA,
  giaiThichKeHoach,
  giaiThichMucTieuCan,
  giaiThichTang1,
  so,
} from "@/lib/engine/explain";
import { tinhKeHoach } from "@/lib/engine/plan";
import {
  LOI_BMI_CAN_BAC_SI,
  NHAN_AN_CAN_BANG,
  NHAN_MUC_TIEU,
  NHAN_NHOM_BMI,
} from "@/lib/labels";
import { SO_BUOC_NHAP, hoSoThanhTinhToan, type HoSo } from "@/lib/profile";
import { KHOA_THUC_DON, coThucDonDaDoi, luuHoSo } from "@/lib/storage";
import { useHoSo, useKhoa } from "@/lib/useHoSo";

export default function TrangKetQua() {
  const { daTai, hoSo } = useHoSo();
  const router = useRouter();

  // Chưa có hồ sơ → về onboarding
  useEffect(() => {
    if (daTai && !hoSo) router.replace("/onboarding");
  }, [daTai, hoSo, router]);

  if (!daTai || !hoSo) return <DangTai />;
  return <KetQua hoSo={hoSo} />;
}

function KetQua({ hoSo }: { hoSo: HoSo }) {
  // Có thực đơn đã đổi món không — để nhắc trước khi thanh trượt làm thực đơn tạo lại
  const coMonDaDoi = coThucDonDaDoi(useKhoa(KHOA_THUC_DON) ?? null, hoSo);
  const dauVao = hoSoThanhTinhToan(hoSo);
  const k = tinhKeHoach(dauVao);
  const buocGiaiThich = giaiThichKeHoach(dauVao, k);
  const biKhoa = k.an_toan.tang1;
  const tenMucTieu = biKhoa ? NHAN_AN_CAN_BANG : NHAN_MUC_TIEU[k.mucTieuApDung];

  // Lời nhắc khi mục tiêu cân nặng đi quá nhanh
  const kq = k.kiemTraCanNang;
  const loiCanNang =
    kq &&
    kq.trangThai === "qua_nhanh" &&
    hoSo.canMucTieuKg !== null &&
    hoSo.soTuan !== null
      ? giaiThichMucTieuCan(kq, {
          mucTieu: k.mucTieuApDung as "giam_mo" | "tang_co",
          canHienTaiKg: hoSo.canNangKg,
          canMucTieuKg: hoSo.canMucTieuKg,
          soTuan: hoSo.soTuan,
        })
      : null;

  // Thanh trượt chỉnh % calo (chỉ khi giảm mỡ / tăng cơ)
  const gioiHan =
    k.mucTieuApDung === "giam_mo"
      ? DIEU_CHINH_CALO.giam_mo
      : k.mucTieuApDung === "tang_co"
        ? DIEU_CHINH_CALO.tang_co
        : null;

  return (
    <KhungTrang rong>
      <ThanhTienDo buoc={SO_BUOC_NHAP + 1} tong={SO_BUOC_NHAP + 1} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kết quả của bạn</h1>
        <p className="mt-1 text-sm text-gray-600">Mục tiêu: {tenMucTieu}</p>
      </div>

      {biKhoa && (
        <HopGhiChu tieuDe={`Mình gợi ý chế độ "${NHAN_AN_CAN_BANG}"`}>
          {giaiThichTang1(k.an_toan.lyDoTang1).map((c) => (
            <p key={c} className="mb-1">
              {c}
            </p>
          ))}
          <p className="mt-2">{LOI_KHUYEN_CHUYEN_GIA}</p>
        </HopGhiChu>
      )}
      {k.an_toan.canGhiChuBacSi && (
        <HopGhiChu kieu="luu_y">
          {k.an_toan.bmiCanBacSi && !k.an_toan.anSoLieu && (
            <p className="mb-1">{LOI_BMI_CAN_BAC_SI}</p>
          )}
          <p>{GHI_CHU_BAC_SI}</p>
        </HopGhiChu>
      )}

      {/* Tầng 1: không hiển thị con số calo/macro (an toàn thắng) */}
      {k.an_toan.anSoLieu ? (
        <KhoiTang1 />
      ) : (
        /* Máy tính: 2 cột — số liệu bên trái, giải thích bên phải */
        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-6">
          <div className="flex flex-col gap-5">
            {/* Calo mục tiêu */}
            <section className="rounded-2xl bg-emerald-600 p-5 text-white">
              <p className="text-sm opacity-90">Calo mục tiêu mỗi ngày</p>
              <p className="text-4xl font-bold">
                {so(k.caloMucTieu)}{" "}
                <span className="text-lg font-medium">kcal</span>
              </p>
              {k.daNangLenMucSan && (
                <p className="mt-2 text-sm opacity-90">
                  Đã giữ ở mức sàn an toàn {so(k.mucSan)} kcal để cơ thể đủ năng
                  lượng.
                </p>
              )}
            </section>

            <section className="grid grid-cols-2 gap-3">
              <TheSo nhan="BMR" moTa="Năng lượng lúc nghỉ" giaTri={k.bmr} />
              <TheSo
                nhan="TDEE"
                moTa="Tổng năng lượng mỗi ngày"
                giaTri={k.tdee}
              />
            </section>

            {/* BMI theo chuẩn châu Á — lời nhẹ nhàng, không phán xét */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Chỉ số khối cơ thể</p>
              <p className="text-sm font-semibold text-gray-700">BMI</p>
              <p className="text-2xl font-bold text-gray-900">{so(k.bmi, 1)}</p>
              <p className="mt-1 text-sm text-gray-600">
                {NHAN_NHOM_BMI[k.nhomBMI].charAt(0).toUpperCase() +
                  NHAN_NHOM_BMI[k.nhomBMI].slice(1)}{" "}
                theo chuẩn châu Á (khoảng khỏe mạnh: 18,5–22,9).
              </p>
            </section>

            {/* Macro — ẩn với bệnh thận (lượng đạm do bác sĩ chỉ định) */}
            {k.an_toan.anGoiYMacro ? (
              <HopGhiChu tieuDe="Chia theo nhóm chất">
                {LOI_DAM_BENH_THAN}
              </HopGhiChu>
            ) : (
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 font-semibold text-gray-900">
                  Chia theo nhóm chất
                </h2>
                <DongMacro
                  ten="Chất đạm (protein)"
                  gam={k.macro.proteinG}
                  kcal={k.macro.proteinKcal}
                  tong={k.caloMucTieu}
                />
                <DongMacro
                  ten="Chất béo"
                  gam={k.macro.fatG}
                  kcal={k.macro.fatKcal}
                  tong={k.caloMucTieu}
                />
                <DongMacro
                  ten="Tinh bột (carb)"
                  gam={k.macro.carbG}
                  kcal={k.macro.carbKcal}
                  tong={k.caloMucTieu}
                />
              </section>
            )}

            {gioiHan && (
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <label htmlFor="tiLe" className="font-semibold text-gray-900">
                  {k.mucTieuApDung === "giam_mo"
                    ? "Mức bớt calo"
                    : "Mức thêm calo"}
                  : {so(Math.abs(k.tiLeDieuChinh) * 100, 1)}%
                </label>
                <input
                  id="tiLe"
                  type="range"
                  min={gioiHan.toiThieu}
                  max={gioiHan.toiDa}
                  step={0.01}
                  value={Math.abs(k.tiLeDieuChinh)}
                  onChange={(e) =>
                    luuHoSo({ ...hoSo, tiLeDieuChinh: Number(e.target.value) })
                  }
                  className="mt-1 h-11 w-full cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{so(gioiHan.toiThieu * 100)}%</span>
                  <span>{so(gioiHan.toiDa * 100)}%</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Bạn có thể chỉnh trong khoảng an toàn. Calo không bao giờ
                  xuống dưới mức sàn.
                </p>
                {coMonDaDoi && (
                  <p className="mt-2 text-xs text-amber-700">
                    Lưu ý: chỉnh mức này sẽ tạo lại thực đơn theo calo mới, các
                    món bạn đã đổi sẽ quay về gợi ý ban đầu.
                  </p>
                )}
              </section>
            )}

            {loiCanNang && kq?.soTuanDeXuat && (
              <HopGhiChu kieu="luu_y" tieuDe="Về thời hạn của bạn">
                <p>{loiCanNang}</p>
                <button
                  type="button"
                  onClick={() => luuHoSo({ ...hoSo, soTuan: kq.soTuanDeXuat })}
                  className="mt-3 rounded-lg bg-white px-3 py-2 font-semibold text-amber-900 shadow-sm"
                >
                  Dùng thời hạn {kq.soTuanDeXuat} tuần
                </button>
              </HopGhiChu>
            )}

            {hoSo.noiAn === "an_ngoai" && hoSo.diUng.length > 0 && (
              <GhiChuDiUngAnNgoai />
            )}
          </div>
          <div className="flex flex-col gap-5">
            {/* Giải thích từng bước */}
            <details className="rounded-2xl border border-gray-200 bg-white p-4">
              <summary className="cursor-pointer font-semibold text-emerald-700">
                Vì sao ra con số này?
              </summary>
              <ol className="mt-3 flex flex-col gap-3">
                {buocGiaiThich.map((b) => (
                  <li key={b.tieuDe}>
                    <p className="font-medium text-gray-900">{b.tieuDe}</p>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {b.noiDung}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-gray-500">
                Đây là ước lượng theo công thức phổ biến, mỗi người có thể chênh
                lệch một chút.
              </p>
            </details>

            <div className="flex flex-col gap-2">
              <NutLienKet href="/thuc-don">Xem thực đơn 7 ngày</NutLienKet>
              <NutLienKet href="/onboarding" chinh={false}>
                Sửa hồ sơ
              </NutLienKet>
            </div>
          </div>
        </div>
      )}
    </KhungTrang>
  );
}

function TheSo({
  nhan,
  moTa,
  giaTri,
}: {
  nhan: string;
  moTa: string;
  giaTri: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{moTa}</p>
      <p className="text-sm font-semibold text-gray-700">{nhan}</p>
      <p className="text-2xl font-bold text-gray-900">
        {so(giaTri)}{" "}
        <span className="text-sm font-normal text-gray-500">kcal</span>
      </p>
    </div>
  );
}

function DongMacro({
  ten,
  gam,
  kcal,
  tong,
}: {
  ten: string;
  gam: number;
  kcal: number;
  tong: number;
}) {
  const phanTram = tong > 0 ? Math.round((kcal / tong) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{ten}</span>
        <span className="font-semibold text-gray-900">
          {so(gam)} g{" "}
          <span className="font-normal text-gray-500">· {phanTram}%</span>
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${phanTram}%` }}
        />
      </div>
    </div>
  );
}

/** Thay phần số liệu cho người thuộc tầng 1 — không hiện calo, chỉ hướng tới ăn cân bằng */
function KhoiTang1() {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
      <p>
        Vì lý do an toàn, mình <strong>không hiển thị con số calo</strong> cho
        bạn. Thực đơn sẽ gợi ý các bữa ăn cân bằng, đủ chất, và bạn không cần
        đếm calo.
      </p>
      <p>
        Lượng ăn phù hợp nhất với bạn nên được bác sĩ hoặc chuyên gia dinh dưỡng
        tư vấn trực tiếp.
      </p>
      <NutLienKet href="/thuc-don">Xem thực đơn gợi ý</NutLienKet>
      <NutLienKet href="/onboarding" chinh={false}>
        Sửa hồ sơ
      </NutLienKet>
    </section>
  );
}
