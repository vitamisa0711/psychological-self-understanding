import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-stone-500">Khám phá tâm lý</p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 pb-16">
        <section className="flex flex-col gap-6 pt-8">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            Hiểu điều gì đang xảy ra bên trong bạn
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-stone-600">
            Một không gian giúp bạn nhìn lại suy nghĩ, cảm xúc và những mẫu hình
            tâm lý có thể đang xuất hiện trong một trải nghiệm của mình.
          </p>
          <div>
            <Link
              href="/analyze"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-stone-900 px-6 text-base font-medium text-stone-50 transition hover:bg-stone-800"
            >
              Bắt đầu khám phá
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">
            Website này làm gì?
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            Bạn kể lại một trải nghiệm. Hệ thống giúp phân tách:
          </p>
          <ul className="mt-4 space-y-2 text-stone-700">
            <li>• điều đã xảy ra</li>
            <li>• cách bạn diễn giải nó</li>
            <li>• cảm xúc và suy nghĩ tự động</li>
            <li>• phản ứng và nhu cầu có thể liên quan</li>
            <li>• những mẫu hình tâm lý có thể liên quan</li>
            <li>• những khả năng giải thích khác và điều còn chưa rõ</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-amber-100 bg-amber-50/80 p-6">
          <h2 className="text-base font-semibold text-stone-900">Giới hạn</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            Đây không phải công cụ chẩn đoán tâm lý và không thay thế chuyên gia
            sức khỏe tâm thần. Kết quả là một cách diễn giải dựa trên thông tin
            bạn cung cấp và có thể không phản ánh đầy đủ trải nghiệm của bạn.
          </p>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-center text-xs text-stone-400">
        Không đưa lời khuyên · Không chẩn đoán · Bảo mật nội dung bạn chia sẻ
      </footer>
    </div>
  );
}
