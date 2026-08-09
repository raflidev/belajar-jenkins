# belajar-jenkins

Aplikasi contoh sengaja dibuat sesederhana mungkin (Node.js, tanpa dependency,
tanpa framework) — server HTTP kecil dengan 2 endpoint (`/` dan `/health`) dan
3 test. Fokus latihan ini bukan di aplikasinya, tapi di `Jenkinsfile`: pipeline
yang install, test, build image Docker, lalu deploy container-nya secara lokal.

## Struktur

- `server.js` — server HTTP pakai modul `http` bawaan Node, tanpa dependency.
- `test/server.test.js` — 3 test pakai `node --test` bawaan Node (tanpa Jest/Mocha).
- `Dockerfile` — build image image `node:20-alpine` yang menjalankan `server.js`.
- `Jenkinsfile` — pipeline dengan stage: Checkout → Install → Test → Build Image → Deploy → Smoke Test.

## Coba lokal dulu (tanpa Jenkins)

```bash
npm test          # jalankan test
npm start          # jalankan server di :3000
curl localhost:3000/health
```

## Setup Jenkins lokal

Butuh Docker Desktop (atau Docker Engine) sudah jalan, karena stage
Build/Deploy di `Jenkinsfile` memanggil `docker` langsung di host Jenkins.

### 1. Jalankan Jenkins via Docker (paling cepat untuk belajar)

Jenkins dijalankan sebagai container, tapi diberi akses ke Docker CLI + socket
Docker Desktop di host supaya stage `docker build` / `docker run` di pipeline
bisa jalan:

```bash
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(which docker):/usr/bin/docker \
  jenkins/jenkins:lts
```

Buka `http://localhost:8080`, ambil password awal dengan:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Lanjutkan wizard, pilih "Install suggested plugins".

### 2. Install & konfigurasi Node.js sebagai global tool

Image `jenkins/jenkins:lts` cuma berisi JDK + git, tidak ada Node.js/npm. Stage
`Install`/`Test` di `Jenkinsfile` butuh `npm` ada di PATH, jadi ini wajib
sebelum build pertama:

1. **Manage Jenkins → Plugins → Available plugins** → cari **NodeJS** → install
   (centang "Restart Jenkins after install" kalau ditawarkan).
2. **Manage Jenkins → Tools** → scroll ke **NodeJS installations** → **Add NodeJS**:
   - Name: `NodeJS 20` (harus persis sama dengan yang dipakai di `Jenkinsfile`,
     lihat blok `tools { nodejs 'NodeJS 20' }`).
   - Version: pilih versi 20.x apa saja.
   - Biarkan "Install automatically" tercentang — Jenkins akan download
     Node sendiri saat build pertama jalan, tidak perlu install manual di
     container.
3. Save.

Kalau nama tool di Jenkins beda dengan yang ada di `Jenkinsfile`, build akan
gagal dengan error `Tool type "nodejs" does not have an install of "NodeJS 20"` —
tinggal samakan namanya di salah satu sisi.

### 3. Init git repo ini

Jenkins job akan pull dari repo git lokal ini:

```bash
git init
git add .
git commit -m "init: aplikasi sederhana + Jenkinsfile"
```

### 4. Buat Pipeline job

1. Jenkins dashboard → **New Item** → nama bebas → pilih **Pipeline** → OK.
2. Di bagian **Pipeline**, Definition pilih **Pipeline script from SCM**.
3. SCM: **Git**, Repository URL isi path absolut repo ini dengan prefix
   `file://`, misalnya `file:///Users/chain/Documents/DEV/hobby/code/belajar-jenkins`.
   (Kalau Jenkins jalan di container seperti langkah 1, mount repo ini juga
   ke container Jenkins, atau lebih gampang: push repo ke GitHub dan pakai
   URL itu supaya tidak perlu mount path.)
4. Branch: `*/main` (atau `*/master`, sesuaikan dengan branch default kamu).
5. Script Path biarkan default: `Jenkinsfile`.
6. Save → **Build Now**.

### 5. Lihat hasilnya

Setelah build sukses, cek dari host:

```bash
curl http://localhost:3000/health
```

Setiap kali klik **Build Now** lagi, pipeline akan rebuild image, replace
container lama dengan yang baru (rolling redeploy sederhana), lalu smoke-test
otomatis lewat `curl`.

## Kalau mau otomatis tiap ada commit

Tambahkan trigger **Poll SCM** (`H/2 * * * *`) atau **GitHub hook trigger**
kalau repo sudah di-push ke GitHub, supaya build jalan otomatis tanpa klik
manual.
