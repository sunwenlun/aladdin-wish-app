const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
const OWNER = 'sunwenlun';
const REPO = 'aladdin-wish-app';
const PROJECT_DIR = path.resolve(__dirname, '..');

// Directories/files to skip (from .gitignore)
const SKIP_DIRS = ['node_modules', '.next', '.git', '.vercel', 'out', 'build', 'coverage', 'generated-images'];
const SKIP_PATTERNS = [/\.env/, /\.pem$/, /\.DS_Store$/, /npm-debug\.log/, /yarn-debug\.log/, /yarn-error\.log/, /\.pnpm-debug\.log/, /\.tsbuildinfo$/, /next-env\.d\.ts/];

function shouldSkip(filePath, isDir) {
  const base = path.basename(filePath);
  if (SKIP_DIRS.includes(base)) return true;
  if (isDir) return false;
  for (const p of SKIP_PATTERNS) {
    if (p.test(base)) return true;
  }
  return false;
}

function getAllFiles(dir, base = dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = path.relative(base, fullPath).replace(/\\/g, '/');
    if (shouldSkip(fullPath, item.isDirectory())) continue;
    if (item.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, base));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

function apiCall(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${endpoint}`,
      method: method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'aladdin-deploy',
        'Content-Type': 'application/json',
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks);
          if (res.statusCode >= 400) {
            reject(new Error(`API ${res.statusCode}: ${json.message || chunks}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`API ${res.statusCode}: ${chunks}`));
          } else {
            resolve(chunks);
          }
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('1. Collecting files...');
  const files = getAllFiles(PROJECT_DIR);
  console.log(`   Found ${files.length} files`);

  // Filter out this script itself
  const uploadFiles = files.filter(f => !f.startsWith('scripts/upload-to-github'));
  console.log(`   Uploading ${uploadFiles.length} files`);

  // Create blobs in batches
  console.log('2. Creating blobs...');
  const treeItems = [];
  const batchSize = 10;
  for (let i = 0; i < uploadFiles.length; i += batchSize) {
    const batch = uploadFiles.slice(i, i + batchSize);
    const promises = batch.map(async (filePath) => {
      const absPath = path.join(PROJECT_DIR, filePath);
      const content = fs.readFileSync(absPath);
      const isBinary = content.some(b => b === 0);
      const blob = await apiCall('POST', '/git/blobs', {
        content: isBinary ? content.toString('base64') : content.toString('utf-8'),
        encoding: isBinary ? 'base64' : 'utf-8'
      });
      return {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      };
    });
    const items = await Promise.all(promises);
    treeItems.push(...items);
    console.log(`   Blobs: ${Math.min(i + batchSize, uploadFiles.length)}/${uploadFiles.length}`);
    await sleep(500); // Rate limit friendly
  }

  // Create tree
  console.log('3. Creating tree...');
  const tree = await apiCall('POST', '/git/trees', {
    tree: treeItems
  });
  console.log(`   Tree SHA: ${tree.sha}`);

  // Get current commit (main branch from auto_init)
  console.log('4. Getting current commit...');
  let parentSha;
  try {
    const ref = await apiCall('GET', '/git/refs/heads/main');
    parentSha = ref.object.sha;
  } catch (e) {
    const ref = await apiCall('GET', '/git/refs/heads/master');
    parentSha = ref.object.sha;
  }
  console.log(`   Parent SHA: ${parentSha}`);

  // Create commit
  console.log('5. Creating commit...');
  const commit = await apiCall('POST', '/git/commits', {
    message: 'Aladdin Wish App - MVP Complete',
    tree: tree.sha,
    parents: [parentSha]
  });
  console.log(`   Commit SHA: ${commit.sha}`);

  // Update ref
  console.log('6. Updating branch ref...');
  let branchName = 'main';
  try {
    await apiCall('PATCH', '/git/refs/heads/main', { sha: commit.sha });
  } catch (e) {
    branchName = 'master';
    await apiCall('PATCH', '/git/refs/heads/master', { sha: commit.sha });
  }

  console.log(`\n✅ Done! Code pushed to https://github.com/${OWNER}/${REPO}`);
  console.log(`   Branch: ${branchName}`);
  console.log(`   Files: ${uploadFiles.length}`);
  console.log(`   Commit: ${commit.sha}`);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
