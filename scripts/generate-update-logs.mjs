import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const outFile = resolve(rootDir, 'src/data/generatedLogs.json');

// Commit where manual v2.0.0 changelog ended
const BASE_COMMIT = '3f511b3';

function stripPrefix(subject) {
  return subject.replace(/^(feat|fix|chore|refactor|perf|style|docs|build|ci)(\([^)]+\))?:\s*/i, '').trim();
}

function classifyCommit(subject) {
  const lower = subject.toLowerCase();
  if (lower.startsWith('feat')) return 'feat';
  if (lower.startsWith('fix')) return 'fix';
  if (lower.startsWith('style') || lower.includes('design') || lower.includes('ui')) return 'design';
  return 'chore';
}

function generate() {
  let raw = '';
  try {
    // Check if BASE_COMMIT exists in current git history (shallow clones might not have it)
    execSync(`git cat-file -e ${BASE_COMMIT}`, { cwd: rootDir, stdio: 'ignore' });
    raw = execSync(`git log ${BASE_COMMIT}..HEAD --reverse --format="%h|%ad|%s" --date=short`, {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim();
  } catch {
    // Fallback: if git is unavailable or shallow clone, keep existing file or write empty array
    if (!existsSync(outFile)) {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, '[]\n', 'utf8');
    }
    console.log('[update-logs] Git history unavailable; keeping existing generatedLogs.json');
    return;
  }

  if (!raw) {
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, '[]\n', 'utf8');
    console.log('[update-logs] No new commits since v2.0.0');
    return;
  }

  const commits = raw
    .split('\n')
    .map((line) => {
      const [hash, date, ...rest] = line.split('|');
      return { hash, date, subject: rest.join('|').trim() };
    })
    .filter((c) => c.hash && c.date && c.subject && !c.subject.startsWith('Merge '));

  // Group commits by date in chronological order
  const byDate = new Map();
  for (const c of commits) {
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date).push(c);
  }

  let major = 2;
  let minor = 0;
  let patch = 0;

  const generated = [];

  for (const [date, list] of byDate.entries()) {
    const types = new Set(list.map((c) => classifyCommit(c.subject)));

    if (types.has('feat')) {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }

    const version = `v${major}.${minor}.${patch}`;

    let tag = '최적화 및 보안';
    let tagColor = 'blue';
    if (types.has('feat')) {
      tag = '기능 추가';
      tagColor = 'emerald';
    } else if (types.has('fix')) {
      tag = '버그 수정';
      tagColor = 'rose';
    } else if (types.has('design')) {
      tag = '디자인 개선';
      tagColor = 'amber';
    }

    // Prefer feat/fix commit as headline title
    const primary =
      list.find((c) => classifyCommit(c.subject) === 'feat') ||
      list.find((c) => classifyCommit(c.subject) === 'fix') ||
      list[0];

    const title = stripPrefix(primary.subject);
    const highlights = list.map((c) => `${stripPrefix(c.subject)} (${c.hash})`);

    const featItems = list.filter((c) => classifyCommit(c.subject) === 'feat').map((c) => `${stripPrefix(c.subject)} [${c.hash}]`);
    const fixItems = list.filter((c) => classifyCommit(c.subject) === 'fix').map((c) => `${stripPrefix(c.subject)} [${c.hash}]`);
    const otherItems = list
      .filter((c) => !['feat', 'fix'].includes(classifyCommit(c.subject)))
      .map((c) => `${stripPrefix(c.subject)} [${c.hash}]`);

    const details = [];
    if (featItems.length > 0) details.push({ category: '✨ 신규 기능', items: featItems });
    if (fixItems.length > 0) details.push({ category: '🛠️ 버그 수정', items: fixItems });
    if (otherItems.length > 0) details.push({ category: '⚙️ 인프라 및 개선', items: otherItems });

    generated.push({
      version,
      title: list.length > 1 ? `${title} 외 ${list.length - 1}건` : title,
      releaseDate: date,
      isLatest: false,
      tag,
      tagColor,
      summary: `${date}에 반영된 ${list.length}건의 자동 업데이트 내역입니다.`,
      highlights,
      details,
    });
  }

  // Newest first
  generated.reverse();
  if (generated.length > 0) {
    generated[0].isLatest = true;
  }

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(generated, null, 2) + '\n', 'utf8');
  console.log(`[update-logs] Generated ${generated.length} release(s), latest: ${generated[0]?.version ?? 'v2.0.0'}`);
}

generate();
