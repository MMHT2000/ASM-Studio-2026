import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT_DIR = path.resolve('d:/Emu8086');
const STAGING_DIR = path.join(ROOT_DIR, 'build-linux-staging');
const DIST_WEB = path.join(ROOT_DIR, 'asm-studio', 'dist');
const OUTPUT_DIR = path.join(ROOT_DIR, 'release-linux');
const VERSION = '1.0.0';
const PKG_NAME = 'asm-studio-2026';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('1. Preparing Linux application payload...');
const appBundleDir = path.join(OUTPUT_DIR, 'bundle');
if (fs.existsSync(appBundleDir)) {
  fs.rmSync(appBundleDir, { recursive: true, force: true });
}
fs.mkdirSync(appBundleDir, { recursive: true });

// Copy all electron files to appBundleDir
const electronFiles = fs.readdirSync(STAGING_DIR);
for (const file of electronFiles) {
  const src = path.join(STAGING_DIR, file);
  const destName = file === 'electron' ? 'asm-studio' : file;
  const dest = path.join(appBundleDir, destName);
  
  if (file === 'resources') {
    // We will customize resources/
    continue;
  }
  
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Create resources/app
const resourcesDir = path.join(appBundleDir, 'resources');
fs.mkdirSync(resourcesDir, { recursive: true });
const appDir = path.join(resourcesDir, 'app');
fs.mkdirSync(appDir, { recursive: true });

// Copy dist to resources/app/dist
fs.cpSync(DIST_WEB, path.join(appDir, 'dist'), { recursive: true });

// Copy main.cjs and package.json to resources/app
fs.copyFileSync(
  path.join(ROOT_DIR, 'asm-studio', 'electron', 'main.cjs'),
  path.join(appDir, 'main.cjs')
);

fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify({
    name: 'asm-studio',
    version: VERSION,
    main: 'main.cjs',
    description: 'ASM Studio 2026 - 8086 Assembly IDE'
  }, null, 2)
);

// Copy icon
fs.copyFileSync(
  path.join(DIST_WEB, 'icon.png'),
  path.join(appDir, 'icon.png')
);
fs.copyFileSync(
  path.join(DIST_WEB, 'icon.png'),
  path.join(appBundleDir, 'icon.png')
);

// Copy install.sh and desktop entry to portable bundle
fs.copyFileSync(
  path.join(ROOT_DIR, 'scripts', 'resources', 'install.sh'),
  path.join(appBundleDir, 'install.sh')
);
fs.copyFileSync(
  path.join(ROOT_DIR, 'scripts', 'resources', 'asm-studio.desktop'),
  path.join(appBundleDir, 'asm-studio.desktop')
);

// README for portable bundle
const portableReadme = `ASM Studio 2026 — Intel 8086 Assembly IDE (Linux x64)
======================================================
Version: ${VERSION}
Architecture: x86_64 (amd64)

RUNNING DIRECTLY:
1. Open a terminal in this directory.
2. Ensure executable permissions:
   chmod +x ./asm-studio
3. Launch:
   ./asm-studio

SYSTEM INSTALLATION (Optional):
To integrate with your Ubuntu / Linux desktop menu and add 'asm-studio' to your PATH:
   chmod +x ./install.sh
   ./install.sh
`;
fs.writeFileSync(path.join(appBundleDir, 'README.txt'), portableReadme);

console.log('2. Creating POSIX USTAR Tar/Gzip generator...');

function createTarHeader(name, size, mode, typeflag = '0', mtime = Math.floor(Date.now() / 1000)) {
  const buf = Buffer.alloc(512);
  // name (100)
  buf.write(name, 0, 100, 'utf8');
  // mode (8)
  buf.write(mode.toString(8).padStart(6, '0') + ' \0', 100, 8, 'ascii');
  // uid (8)
  buf.write('0000000 \0', 108, 8, 'ascii');
  // gid (8)
  buf.write('0000000 \0', 116, 8, 'ascii');
  // size (12)
  buf.write(size.toString(8).padStart(11, '0') + ' ', 124, 12, 'ascii');
  // mtime (12)
  buf.write(mtime.toString(8).padStart(11, '0') + ' ', 136, 12, 'ascii');
  // chksum blank (8)
  buf.fill(0x20, 148, 156);
  // typeflag (1)
  buf.write(typeflag, 156, 1, 'ascii');
  // magic (6) + version (2)
  buf.write('ustar\0', 257, 6, 'ascii');
  buf.write('00', 263, 2, 'ascii');
  // uname (32)
  buf.write('root', 265, 32, 'ascii');
  // gname (32)
  buf.write('root', 297, 32, 'ascii');

  // calculate checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += buf[i];
  }
  buf.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return buf;
}

class TarArchive {
  constructor() {
    this.chunks = [];
  }

  addDirectory(tarPath, mode = 0o755) {
    let p = tarPath.replace(/\\/g, '/');
    if (!p.endsWith('/')) p += '/';
    if (p.startsWith('/')) p = p.substring(1);
    const header = createTarHeader(p, 0, mode, '5');
    this.chunks.push(header);
  }

  addFile(tarPath, buffer, mode = 0o644) {
    let p = tarPath.replace(/\\/g, '/');
    if (p.startsWith('/')) p = p.substring(1);
    const header = createTarHeader(p, buffer.length, mode, '0');
    this.chunks.push(header);
    this.chunks.push(buffer);
    const padding = (512 - (buffer.length % 512)) % 512;
    if (padding > 0) {
      this.chunks.push(Buffer.alloc(padding));
    }
  }

  addDirectoryRecursive(baseDiskDir, tarPrefix = '') {
    const isExecutable = (name) => {
      const execs = ['asm-studio', 'chrome-sandbox', 'chrome_crashpad_handler', 'install.sh'];
      return execs.includes(name) || name.endsWith('.so') || name.endsWith('.so.1');
    };

    const walk = (currentDir, relTarPath) => {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const itemTarPath = relTarPath ? `${relTarPath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          this.addDirectory(itemTarPath, 0o755);
          walk(fullPath, itemTarPath);
        } else {
          const content = fs.readFileSync(fullPath);
          const mode = isExecutable(item) ? 0o755 : 0o644;
          this.addFile(itemTarPath, content, mode);
        }
      }
    };

    if (tarPrefix) {
      this.addDirectory(tarPrefix, 0o755);
    }
    walk(baseDiskDir, tarPrefix);
  }

  toBuffer() {
    // 2 empty 512-byte blocks at end
    this.chunks.push(Buffer.alloc(1024));
    return Buffer.concat(this.chunks);
  }

  toGzipBuffer() {
    return zlib.gzipSync(this.toBuffer(), { level: 9 });
  }
}

console.log('3. Generating Portable Linux Tarball (.tar.gz)...');
const portableTar = new TarArchive();
portableTar.addDirectoryRecursive(appBundleDir, `ASM-Studio-2026-v${VERSION}-Linux-x64`);
const portableGzip = portableTar.toGzipBuffer();
const portableTarPath = path.join(ROOT_DIR, `ASM-Studio-2026-v${VERSION}-Linux-x64.tar.gz`);
fs.writeFileSync(portableTarPath, portableGzip);
console.log(`-> Created: ${portableTarPath} (${(portableGzip.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('4. Generating Debian / Ubuntu Package (.deb)...');

// 4a. Control archive
const controlTar = new TarArchive();
const installedSizeKb = Math.ceil(fs.statSync(portableTarPath).size / 1024) * 3; // Approx uncompressed KB

const controlContent = `Package: ${PKG_NAME}
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libasound2, libxtst6
Installed-Size: ${installedSizeKb}
Maintainer: MMHT2000 <tashinggara129@gmail.com>
Homepage: https://github.com/MMHT2000/ASM-Studio-2026
Description: Modern Intel 8086 Assembly IDE, Visual Emulator & AI Tutor
 ASM Studio 2026 is a next-generation 8086 Assembly IDE featuring a visual
 real-mode register and memory emulator, step-by-step instruction visualizer,
 dynamic stack frame inspector, virtual hardware device controllers (Traffic
 lights, 7-Segment displays, LED ports), and a multi-provider AI assembly tutor.
`;

controlTar.addFile('./control', Buffer.from(controlContent, 'utf8'), 0o644);
const controlGzip = controlTar.toGzipBuffer();

// 4b. Data archive
const dataTar = new TarArchive();

// Directories in deb
dataTar.addDirectory('./opt', 0o755);
dataTar.addDirectory('./opt/asm-studio', 0o755);
dataTar.addDirectoryRecursive(appBundleDir, './opt/asm-studio');

// /usr/bin/asm-studio launcher
dataTar.addDirectory('./usr', 0o755);
dataTar.addDirectory('./usr/bin', 0o755);
const launcherScript = `#!/bin/sh\nexec /opt/asm-studio/asm-studio "$@"\n`;
dataTar.addFile('./usr/bin/asm-studio', Buffer.from(launcherScript, 'utf8'), 0o755);

// /usr/share/applications/asm-studio.desktop
dataTar.addDirectory('./usr/share', 0o755);
dataTar.addDirectory('./usr/share/applications', 0o755);
const desktopFile = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'resources', 'asm-studio.desktop'));
dataTar.addFile('./usr/share/applications/asm-studio.desktop', desktopFile, 0o644);

// /usr/share/icons/hicolor/512x512/apps/asm-studio.png
dataTar.addDirectory('./usr/share/icons', 0o755);
dataTar.addDirectory('./usr/share/icons/hicolor', 0o755);
dataTar.addDirectory('./usr/share/icons/hicolor/512x512', 0o755);
dataTar.addDirectory('./usr/share/icons/hicolor/512x512/apps', 0o755);
const iconFile = fs.readFileSync(path.join(DIST_WEB, 'icon.png'));
dataTar.addFile('./usr/share/icons/hicolor/512x512/apps/asm-studio.png', iconFile, 0o644);

const dataGzip = dataTar.toGzipBuffer();

// 4c. Assemble Debian AR archive
function createArHeader(name, size) {
  const buf = Buffer.alloc(60, 0x20); // space padded
  buf.write(name, 0, 16, 'ascii');
  buf.write(Math.floor(Date.now() / 1000).toString(), 16, 12, 'ascii');
  buf.write('0', 28, 6, 'ascii'); // owner
  buf.write('0', 34, 6, 'ascii'); // group
  buf.write('100644', 40, 8, 'ascii'); // mode
  buf.write(size.toString(), 48, 10, 'ascii'); // size
  buf[58] = 0x60; // '`'
  buf[59] = 0x0A; // '\n'
  return buf;
}

const debChunks = [];
// Global AR Magic
debChunks.push(Buffer.from('!<arch>\n', 'ascii'));

// Member 1: debian-binary
const debBinary = Buffer.from('2.0\n', 'ascii');
debChunks.push(createArHeader('debian-binary', debBinary.length));
debChunks.push(debBinary);

// Member 2: control.tar.gz
debChunks.push(createArHeader('control.tar.gz', controlGzip.length));
debChunks.push(controlGzip);
if (controlGzip.length % 2 !== 0) {
  debChunks.push(Buffer.from('\n', 'ascii')); // 2-byte alignment padding
}

// Member 3: data.tar.gz
debChunks.push(createArHeader('data.tar.gz', dataGzip.length));
debChunks.push(dataGzip);
if (dataGzip.length % 2 !== 0) {
  debChunks.push(Buffer.from('\n', 'ascii'));
}

const debBuffer = Buffer.concat(debChunks);
const debPath = path.join(ROOT_DIR, `${PKG_NAME}_${VERSION}_amd64.deb`);
fs.writeFileSync(debPath, debBuffer);
console.log(`-> Created: ${debPath} (${(debBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('✅ ALL LINUX PACKAGES GENERATED SUCCESSFULLY!');

