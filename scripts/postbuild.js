const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = async function () {
  const distDir = path.join(__dirname, '..', 'dist');
  const desktopDir = path.join(os.homedir(), '.local', 'share', 'applications');
  const desktopFile = path.join(desktopDir, 'textmage.desktop');
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

  let appImagePath;
  try {
    const files = fs.readdirSync(distDir)
      .filter(f => f.endsWith('.AppImage'))
      .map(f => path.join(distDir, f))
      .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);

    if (files.length === 0) throw new Error('AppImage не найден в dist/');
    appImagePath = files[0];
  } catch (err) {
    console.error('❌ Ошибка поиска AppImage:', err);
    return;
  }

  const content = `[Desktop Entry]
Version=1.0
Name=TextMage
Comment=Universal AI Assistant
Exec=${appImagePath} %U
Icon=${iconPath}
Terminal=false
Type=Application
Categories=Network;Internet;
StartupWMClass=TextMage
`;

  try {
    fs.mkdirSync(desktopDir, { recursive: true });
    fs.writeFileSync(desktopFile, content, 'utf-8');
    fs.chmodSync(desktopFile, 0o755);
    console.log('✅ .desktop файл успешно создан:', desktopFile);
  } catch (err) {
    console.error('❌ Ошибка при создании .desktop файла:', err);
  }
};
