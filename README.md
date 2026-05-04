# Marketplace Health Check - Next.js

Versi Next.js dari Marketplace Health Check tool oleh Growlab. Dikonversi dari Express + Vite ke Next.js agar bisa di-deploy ke Vercel.

## Cara Deploy ke Vercel

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "Initial Next.js version"
git remote add origin https://github.com/username/marketplace-health-check.git
git push -u origin main
```

### 2. Import ke Vercel
- Buka https://vercel.com/new
- Import repository GitHub kamu
- Vercel akan otomatis detect Next.js

### 3. Set Environment Variables di Vercel
Di dashboard Vercel → Settings → Environment Variables, tambahkan:

| Key | Value |
|-----|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account kamu |
| `GOOGLE_PRIVATE_KEY` | Private key (paste lengkap termasuk `-----BEGIN...-----`) |

> ⚠️ **Penting:** Untuk `GOOGLE_PRIVATE_KEY`, paste langsung di Vercel dashboard — jangan pakai quotes tambahan. Vercel akan handle escape otomatis.

### 4. Deploy!
Vercel akan otomatis build dan deploy.

## Development Lokal

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local dengan credentials Google kamu

# Run development server
npm run dev
```

Buka http://localhost:3000

## Kenapa Harus Next.js untuk Vercel?

Vercel **tidak support** server Node.js yang berjalan terus-menerus (seperti Express). Yang didukung Vercel adalah:
- **Frontend**: React/Next.js static pages
- **Backend**: Serverless Functions (Next.js API Routes)

Dengan Next.js App Router, file di `app/api/*/route.ts` otomatis menjadi Serverless Function di Vercel — tidak perlu konfigurasi tambahan.

## Perubahan dari Versi Lama

| Sebelum (Express + Vite) | Sekarang (Next.js) |
|---|---|
| `server.ts` (Express) | `app/api/save-to-sheet/route.ts` (Next.js API Route) |
| `src/App.tsx` | `components/MarketplaceHealthCheck.tsx` |
| `vite.config.ts` | Tidak diperlukan (Next.js built-in) |
| `index.html` | `app/layout.tsx` |
| Deploy butuh VPS/Docker | Deploy langsung ke Vercel ✅ |
