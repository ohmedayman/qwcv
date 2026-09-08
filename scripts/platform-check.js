const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'package.json',
  'index.html',
  'login.html',
  'editor.html',
  'admin.html',
  'js/config.js',
  'js/site-settings.js',
  'js/maintenance.js',
  'scss/main.scss'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing required files:');
  for (const file of missing) console.error(' -', file);
  process.exit(1);
}

const htmlFiles = ['index.html', 'about.html', 'login.html', 'editor.html', 'admin.html'];
const htmlIssues = [];
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const hasSharedConfig = content.includes('js/config.js') || content.includes('js/site-settings.js');
  if (!hasSharedConfig) {
    htmlIssues.push(`${file} does not include the shared runtime config bridge.`);
  }
}

if (htmlIssues.length) {
  console.error('HTML runtime issues:');
  for (const issue of htmlIssues) console.error(' -', issue);
  process.exit(1);
}

const candidateCss = path.join(root, 'styles.css');
if (!fs.existsSync(candidateCss)) {
  console.error('styles.css is missing; run the Sass build first.');
  process.exit(1);
}

console.log('Platform check passed: required files exist, shared config is wired, and compiled CSS is present.');
