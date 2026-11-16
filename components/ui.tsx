/**
 * Các khối giao diện dùng lại: thanh tiến độ, nút chọn dạng thẻ, ô nhập số, hộp ghi chú.
 * Màu: xanh lá (chính), xám (trung tính), xanh dương/vàng nhạt (ghi chú). KHÔNG dùng màu đỏ.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export function ThanhTienDo({ buoc, tong }: { buoc: number; tong: number }) {
  return (
    <div className="w-full" aria-label={`Bước ${buoc} trên ${tong}`}>
      <div className="mb-1 text-xs font-medium text-gray-500">
        Bước {buoc}/{tong}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${(buoc / tong) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function NhanO({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-gray-800"
    >
      {children}
    </label>
  );
}

export function LoiNhac({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-amber-700">{children}</p>;
}

/** Nhóm lựa chọn — chọn một (radio) */
export function ChonMot<T extends string | number | boolean>({
  tuyChon,
  giaTri,
  onChon,
  cot = 1,
}: {
  tuyChon: { giaTri: T; nhan: string; moTa?: string }[];
  giaTri: T | null;
  onChon: (v: T) => void;
  cot?: 1 | 2;
}) {
  return (
    <div
      className={`grid gap-2 ${cot === 2 ? "grid-cols-2" : "grid-cols-1"}`}
      role="radiogroup"
    >
      {tuyChon.map((t) => {
        const dangChon = t.giaTri === giaTri;
        return (
          <button
            key={String(t.giaTri)}
            type="button"
            role="radio"
            aria-checked={dangChon}
            onClick={() => onChon(t.giaTri)}
            className={`rounded-xl border-2 px-4 py-3 text-left transition ${
              dangChon
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-gray-200 bg-white text-gray-800 active:bg-gray-50"
            }`}
          >
            <span className="font-medium">{t.nhan}</span>
            {t.moTa && (
              <span className="mt-0.5 block text-xs text-gray-500">
                {t.moTa}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Nhóm lựa chọn — chọn nhiều (checkbox) */
export function ChonNhieu({
  tuyChon,
  giaTri,
  onDoi,
  cot = 2,
}: {
  tuyChon: { giaTri: string; nhan: string }[];
  giaTri: string[];
  onDoi: (v: string[]) => void;
  cot?: 1 | 2;
}) {
  return (
    <div className={`grid gap-2 ${cot === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {tuyChon.map((t) => {
        const dangChon = giaTri.includes(t.giaTri);
        return (
          <button
            key={t.giaTri}
            type="button"
            role="checkbox"
            aria-checked={dangChon}
            onClick={() =>
              onDoi(
                dangChon
                  ? giaTri.filter((x) => x !== t.giaTri)
                  : [...giaTri, t.giaTri],
              )
            }
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm transition ${
              dangChon
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-gray-200 bg-white text-gray-800"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                dangChon
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-gray-300"
              }`}
              aria-hidden
            >
              {dangChon ? "✓" : ""}
            </span>
            {t.nhan}
          </button>
        );
      })}
    </div>
  );
}

/** Ô nhập số (giữ dạng chữ để gõ "65,5" thoải mái) */
export function ONhapSo({
  id,
  giaTri,
  onDoi,
  donVi,
  placeholder,
  thapPhan = false,
}: {
  id: string;
  giaTri: string;
  onDoi: (v: string) => void;
  donVi?: string;
  placeholder?: string;
  thapPhan?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        inputMode={thapPhan ? "decimal" : "numeric"}
        value={giaTri}
        placeholder={placeholder}
        onChange={(e) => onDoi(e.target.value)}
        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-emerald-500"
      />
      {donVi && <span className="shrink-0 text-gray-500">{donVi}</span>}
    </div>
  );
}

/** Hộp ghi chú. kieu "thong_tin" = xanh dương nhạt, "luu_y" = vàng nhạt. */
export function HopGhiChu({
  children,
  kieu = "thong_tin",
  tieuDe,
}: {
  children: ReactNode;
  kieu?: "thong_tin" | "luu_y";
  tieuDe?: string;
}) {
  const mau =
    kieu === "luu_y"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-sky-200 bg-sky-50 text-sky-900";
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${mau}`}
    >
      {tieuDe && <p className="mb-1 font-semibold">{tieuDe}</p>}
      {children}
    </div>
  );
}

export function NutChinh({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white active:bg-emerald-700"
    >
      {children}
    </button>
  );
}

export function NutPhu({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 active:bg-gray-50"
    >
      {children}
    </button>
  );
}

/**
 * Khung trang: điện thoại là một cột hẹp (mobile-first).
 * rong = true → trên máy tính (từ 768px) khung rộng hơn để chia 2 cột.
 */
export function KhungTrang({
  children,
  rong = false,
}: {
  children: ReactNode;
  rong?: boolean;
}) {
  return (
    <main
      className={`mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-6 ${rong ? "md:max-w-4xl md:px-8" : ""}`}
    >
      {children}
    </main>
  );
}

export function DangTai() {
  return (
    <KhungTrang>
      <p className="py-20 text-center text-gray-500">Đang tải…</p>
    </KhungTrang>
  );
}

/** Liên kết trông như nút (không lồng <button> trong <a>) */
export function NutLienKet({
  href,
  children,
  chinh = true,
}: {
  href: string;
  children: ReactNode;
  chinh?: boolean;
}) {
  const kieu = chinh
    ? "bg-emerald-600 text-white active:bg-emerald-700"
    : "border-2 border-gray-200 bg-white text-gray-700 active:bg-gray-50";
  return (
    <Link
      href={href}
      className={`block w-full rounded-xl px-4 py-3 text-center font-semibold ${kieu}`}
    >
      {children}
    </Link>
  );
}
