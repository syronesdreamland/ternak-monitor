import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Leaf, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onOpenCatalog: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onOpenCatalog }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tidak dapat masuk. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <img
          src="/login-bg.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Overlay hijau hutan: gelapkan foto agar teks kontras + identitas brand tetap hijau */}
        <div className="absolute inset-0 bg-[#1B5E20]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E10]/85 via-transparent to-[#0B2E10]/40" />
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#C9971C]/12" />
        <div className="absolute -bottom-44 -left-24 h-[34rem] w-[34rem] rounded-full border border-white/15" />

        <div className="relative flex items-center gap-3.5">
          <img
            src="/petedahnu-logo.png"
            alt="Logo PT Duta Agri Nusantara"
            className="h-12 w-12 rounded-xl bg-white p-0.5"
            style={{ objectFit: 'contain' }}
          />
          <div>
            <p className="text-lg font-bold tracking-tight">PT DUTA AGRI NUSANTARA</p>
            <p className="text-xs font-medium tracking-wide text-[#E4C25E]">One Land. One System. One Future.</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <span className="mb-5 inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-[#E4C25E]">
            INTEGRATED FARM MANAGEMENT
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Satu lahan, satu sistem,{' '}
            <span className="text-[#E4C25E]">satu masa depan.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/85">
            Pantau populasi, kesehatan, dan arus keuangan seluruh divisi · peternakan, pertanian, perikanan, dan agrowisata · dari satu ruang kerja.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-white/75">
          <ShieldCheck className="h-4 w-4 text-[#E4C25E]" />
          <span>Akses dilindungi dan disesuaikan dengan peran pengguna.</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src="/petedahnu-logo.png"
              alt="Logo PT Duta Agri Nusantara"
              className="h-11 w-11 rounded-xl bg-white p-0.5 shadow-sm"
              style={{ objectFit: 'contain' }}
            />
            <div>
              <p className="font-bold tracking-tight">PT DUTA AGRI NUSANTARA</p>
              <p className="text-[11px] font-medium text-[#1B5E20]">One Land. One System. One Future.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1B5E20]">Selamat datang</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Masuk ke dashboard</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun yang telah diberikan oleh administrator.</p>
            </div>

            {errorMessage && (
              <div role="alert" className="mb-5 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="nama@perusahaan.com"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B5E20] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1B5E20]/20 transition hover:bg-[#123D18] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> atau <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={onOpenCatalog}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1B5E20]/30 bg-[#ECF5ED] px-4 py-3 text-sm font-semibold text-[#1B5E20] transition hover:bg-[#D5EAD8]"
            >
              <Leaf className="h-4 w-4" />
              Lihat Katalog Sapi Tanpa Login
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">Akses khusus customer untuk melihat sapi yang tersedia.</p>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">© 2026 PT Duta Agri Nusantara · One Land. One System. One Future.</p>
        </div>
      </section>
    </main>
  );
};
