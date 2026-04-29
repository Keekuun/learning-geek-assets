import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsRootDir = path.join(__dirname, 'docs');
const catalogFile = path.join(__dirname, 'catalog.json');

function sortEntries(items) {
  return items.sort((a, b) => {
    const numA = parseInt(a.match(/^\d+/)?.[0] || '999');
    const numB = parseInt(b.match(/^\d+/)?.[0] || '999');
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });
}

function addFilesToFolderNode({ folderNode, relativePath, files }) {
  const extToKey = {
    '.html': 'html',
    '.pdf': 'pdf',
    '.mp3': 'mp3',
  };

  const chapterOrder = [];
  const chapterMap = new Map();

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    const key = extToKey[ext];
    if (!key) continue;

    const rawStem = file.name.slice(0, -ext.length);
    const stem = rawStem.replace(/\(\d+\)$/, '');
    if (!chapterMap.has(stem)) {
      chapterMap.set(stem, { files: {} });
      chapterOrder.push(stem);
    }

    const chapter = chapterMap.get(stem);
    if (!chapter.files[key]) {
      chapter.files[key] = file.url;
    }
  }

  for (const stem of chapterOrder) {
    const chapter = chapterMap.get(stem);
    folderNode.children.push({
      id: path.join(relativePath, stem).split(path.sep).join('/'),
      title: stem,
      type: 'chapter',
      files: chapter.files,
    });
  }
}
function buildCatalogFromDocsRoot() {
  if (!fs.existsSync(docsRootDir)) {
    console.log('No docs directory found at ./docs. Skipping catalog generation.');
    return;
  }

  const catalog = [];

  const courseDirs = sortEntries(
    fs
      .readdirSync(docsRootDir)
      .filter(name => {
        if (name === '.DS_Store') return false;
        const full = path.join(docsRootDir, name);
        return fs.existsSync(full) && fs.statSync(full).isDirectory();
      })
  );

  if (courseDirs.length === 0) {
    console.log('No docs found under ./docs. Skipping catalog generation.');
    return;
  }

  const readDirToCatalog = (dir, relativePath, parentNode) => {
    const items = sortEntries(fs.readdirSync(dir));
    const files = [];

    for (const item of items) {
      if (item === '.DS_Store') continue;
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const folderNode = {
          title: item,
          path: path.join(relativePath, item),
          type: 'folder',
          children: [],
        };
        parentNode.children.push(folderNode);
        readDirToCatalog(itemPath, path.join(relativePath, item), folderNode);
        continue;
      }

      files.push({
        name: item,
        url: path.join(relativePath, item).split(path.sep).join('/'),
      });
    }

    addFilesToFolderNode({ folderNode: parentNode, relativePath, files });
  };

  for (const courseName of courseDirs) {
    const courseDir = path.join(docsRootDir, courseName);
    const courseNode = {
      title: courseName,
      path: courseName,
      type: 'folder',
      children: [],
    };
    readDirToCatalog(courseDir, courseName, courseNode);
    catalog.push(courseNode);
  }

  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2));
  console.log(`Catalog generated successfully at ${catalogFile}`);
}

buildCatalogFromDocsRoot();
