/**
 * Dấu trường DUE: hình mờ nền (watermark) và chân trang.
 *
 * Watermark nằm sau toàn bộ nội dung (z-index âm) và không bắt chuột
 * (pointer-events-none), nên không bao giờ che chữ hay chặn nút bấm.
 * Độ mờ để rất thấp (4%) để không ảnh hưởng người đọc trên điện thoại.
 */

/** Lớp hình mờ — đặt ngay trong <body>, trước nội dung. */
export function HinhMoTruong() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: "url('/due-watermark.png')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "min(70vw, 320px) auto",
        opacity: 0.04,
      }}
    />
  );
}

/** Chân trang: logo nhỏ + ghi chú đây là đồ án môn học. */
export function ChanTrang() {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pt-2 pb-24 md:max-w-4xl md:px-8">
      <div className="flex items-center justify-center gap-3 border-t border-gray-200 pt-4">
        {/* Dùng thẻ img thường để trang vẫn hiện đúng khi xuất ra file HTML tĩnh */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/due-logo.png"
          alt="Logo Đại học Kinh tế - Đại học Đà Nẵng"
          width={21}
          height={28}
          className="shrink-0"
        />
        <p className="text-center text-xs leading-relaxed text-gray-500">
          NutriViet · Đồ án môn học — Đại học Kinh tế, Đại học Đà Nẵng
          <br />
          <span className="text-gray-400">
            Sản phẩm của nhóm sinh viên, không phải sản phẩm chính thức của nhà
            trường.
          </span>
        </p>
      </div>
    </footer>
  );
}
