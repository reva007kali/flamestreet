import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const UPDATED_AT = "21 April 2026";
const APP_NAME = "FlameStreet";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-900/30 via-zinc-900 to-black p-6 md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/20 p-2">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                Data Privacy Policy
              </h1>
              <p className="mt-1 text-sm font-medium text-white/60">
                Terakhir diperbarui: {UPDATED_AT}
              </p>
            </div>
          </div>

          <div className="space-y-6 text-sm leading-7 text-white/85">
            <section>
              <h2 className="text-base font-black text-white">1. Ringkasan</h2>
              <p>
                Kebijakan ini menjelaskan bagaimana {APP_NAME} mengumpulkan,
                menggunakan, menyimpan, dan melindungi data pribadi pengguna
                pada layanan web dan mobile kami.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                2. Data Yang Kami Kumpulkan
              </h2>
              <p>Kami dapat mengumpulkan data berikut:</p>
              <ul className="list-disc space-y-1 pl-5 text-white/80">
                <li>Data akun: nama, email, nomor telepon, username.</li>
                <li>Data profil: role pengguna (member/trainer/dll), foto profil.</li>
                <li>Data transaksi: pesanan, metode pembayaran, status pesanan.</li>
                <li>Data pengantaran: alamat pengiriman, gym coverage yang dipilih.</li>
                <li>Data perangkat: token push notification, jenis perangkat.</li>
                <li>
                  Data komunikasi: pesan chat dalam konteks pesanan (termasuk
                  lampiran yang dikirim pengguna).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                3. Tujuan Penggunaan Data
              </h2>
              <p>Data digunakan untuk:</p>
              <ul className="list-disc space-y-1 pl-5 text-white/80">
                <li>Membuat dan mengelola akun pengguna.</li>
                <li>Memproses pesanan, pembayaran, dan pengantaran.</li>
                <li>Mengirim notifikasi status pesanan dan pesan penting.</li>
                <li>Menyediakan dukungan pelanggan dan penyelesaian kendala.</li>
                <li>Meningkatkan keamanan, performa, dan kualitas layanan.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                4. Pembagian Data Ke Pihak Ketiga
              </h2>
              <p>
                Kami hanya membagikan data yang diperlukan untuk operasional,
                misalnya:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-white/80">
                <li>Penyedia payment gateway untuk proses pembayaran.</li>
                <li>Penyedia layanan notifikasi push.</li>
                <li>Penyedia infrastruktur cloud dan analitik operasional.</li>
              </ul>
              <p>
                Kami tidak menjual data pribadi pengguna kepada pihak lain.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                5. Penyimpanan Dan Keamanan
              </h2>
              <p>
                Kami menerapkan kontrol akses, autentikasi, dan langkah
                keamanan teknis yang wajar untuk melindungi data dari akses
                tidak sah, perubahan, atau pengungkapan yang tidak semestinya.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                6. Retensi Data
              </h2>
              <p>
                Data disimpan selama akun aktif atau selama diperlukan untuk
                keperluan operasional, kepatuhan hukum, penyelesaian sengketa,
                dan penegakan kebijakan internal.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-white">7. Hak Pengguna</h2>
              <p>Pengguna dapat mengajukan permintaan untuk:</p>
              <ul className="list-disc space-y-1 pl-5 text-white/80">
                <li>Mengakses dan memperbarui data profil.</li>
                <li>Memperbaiki data yang tidak akurat.</li>
                <li>Meminta penghapusan akun sesuai ketentuan yang berlaku.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                8. Privasi Anak
              </h2>
              <p>
                Layanan kami tidak ditujukan untuk anak di bawah usia minimum
                yang ditetapkan oleh hukum setempat tanpa persetujuan orang
                tua/wali.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-white">
                9. Perubahan Kebijakan
              </h2>
              <p>
                Kami dapat memperbarui kebijakan ini dari waktu ke waktu.
                Tanggal "Terakhir diperbarui" pada halaman ini akan disesuaikan
                sebagai referensi versi terbaru.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-white">10. Kontak</h2>
              <p>
                Untuk pertanyaan terkait privasi data, silakan hubungi tim kami
                melalui kanal resmi layanan pelanggan {APP_NAME}.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
