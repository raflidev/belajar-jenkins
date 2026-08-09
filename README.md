# belajar-jenkins

Aplikasi contoh sengaja dibuat sesederhana mungkin (Node.js, tanpa dependency,
tanpa framework) — server HTTP kecil dengan 2 endpoint (`/` dan `/health`) dan
3 test. Fokus latihan ini bukan di aplikasinya, tapi di `Jenkinsfile`: pipeline
yang install, test, build image Docker, lalu deploy container-nya secara lokal.

## Struktur

- `server.js` — server HTTP pakai modul `http` bawaan Node, tanpa dependency.
- `test/server.test.js` — 3 test pakai `node --test` bawaan Node (tanpa Jest/Mocha).
- `Dockerfile` — multi-stage: stage `test` menjalankan `npm ci && npm test`
  (build gagal kalau test gagal), stage final cuma copy `server.js` + install
  dependency production untuk image yang dijalankan.
- `Jenkinsfile` — pipeline dengan stage: Checkout → Test → Build Image → Deploy → Smoke Test.
- `jenkins/Dockerfile` — image Jenkins custom (`jenkins/jenkins:lts` + docker CLI),
  dipakai supaya stage `docker build`/`docker run` di pipeline bisa jalan
  (lihat langkah 1 di bawah).

## Coba lokal dulu (tanpa Jenkins)

```bash
npm test          # jalankan test
npm start          # jalankan server di :3000
curl localhost:3000/health
```

## Setup Jenkins lokal

Butuh Docker Desktop (atau Docker Engine) sudah jalan, karena stage
Build/Deploy di `Jenkinsfile` memanggil `docker` langsung di host Jenkins.

### 1. Jalankan Jenkins via Docker, dengan akses ke Docker daemon host

Jenkins dijalankan sebagai container. Supaya stage `docker build`/`docker run`
di pipeline bisa jalan, container Jenkins butuh: (a) docker CLI, dan (b) akses
ke socket Docker daemon host.

**Docker CLI tidak bisa sekadar di-mount dari host** kalau host-nya macOS —
binary `docker` di Mac itu Mach-O, tidak bisa dieksekusi di container Linux.
Solusinya: build image Jenkins custom yang sudah include docker CLI Linux
(`jenkins/Dockerfile` di repo ini):

```bash
docker build -t jenkins-with-docker jenkins/
```

Lalu jalankan. Socket `/var/run/docker.sock` di Docker Desktop dimiliki
`root:root` mode 660, jadi container juga perlu jalan sebagai root
(`-u root`) supaya bisa mengaksesnya — untuk instance Jenkins lokal/belajar
ini bukan masalah keamanan yang berarti:

```bash
docker run -d --name jenkins-server \
  -p 8090:8080 -p 50000:50000 \
  -u root \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-with-docker
```

(Sesuaikan `-p 8090:8080` dan nama volume/container kalau kamu pakai port
atau nama lain.)

Buka `http://localhost:8090`, ambil password awal dengan:

```bash
docker exec jenkins-server cat /var/jenkins_home/secrets/initialAdminPassword
```

Lanjutkan wizard, pilih "Install suggested plugins".

### 2. Tidak perlu install Node.js atau plugin Docker Pipeline

Stage `Test` & `Build Image` di `Jenkinsfile` cuma memanggil `docker build`
(lewat socket yang sudah di-mount di langkah 1); `npm ci`/`npm test` jalan
*di dalam* build itu (lihat stage `test` di `Dockerfile`). Tidak butuh plugin
NodeJS ataupun Docker Pipeline sama sekali.

(Kenapa bukan `docker run -v $WORKSPACE:...` untuk jalanin test langsung?
Karena Jenkins di sini jalan di dalam container yang cuma numpang socket
Docker host — path `$WORKSPACE` di dalam container Jenkins itu tidak
otomatis nyambung ke path yang sama di host, jadi bind-mount volume akan
salah/kosong. `docker build` aman karena isi folder dikirim sebagai build
context, bukan bind-mount.)

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
