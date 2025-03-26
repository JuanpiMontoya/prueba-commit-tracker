const fs = require('fs');
const { execSync } = require('child_process');

const DATA_FILE = 'commit-history.json';

function getCurrentCommitInfo(commitMessageInput) {
  let sha, commitMessage, commitDate;

  try {
    sha = execSync('git rev-parse HEAD').toString().trim();
    commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
    commitDate = new Date(execSync('git log -1 --format=%cd').toString());
  } catch (error) {
    if (error.message.includes('unknown revision')) {
      // Si es el primer commit, asignar un sha especial
      sha = 'initial-commit';
      
      // Priorizar el mensaje del commit enviado
      commitMessage = commitMessageInput || 'Initial commit';
      commitDate = new Date();
    } else {
      throw error;
    }
  }

  // Obtener la URL del repositorio, si está disponible
  let repoUrl = '';
  try {
    repoUrl = execSync('git config --get remote.origin.url').toString().trim().replace(/\.git$/, '');
    if (repoUrl.startsWith('git@')) {
      repoUrl = repoUrl.replace(/^git@([^:]+):(.+)$/, 'https://$1/$2');
    }
  } catch {}

  // Obtener adiciones y eliminaciones
  let additions = 0, deletions = 0;
  try {
    execSync('git rev-parse HEAD~1', { stdio: 'pipe' });
    const diffStats = execSync('git diff --stat HEAD~1 HEAD').toString();
    const additionsMatch = diffStats.match(/(\d+) insertion/);
    const deletionsMatch = diffStats.match(/(\d+) deletion/);
    additions = additionsMatch ? parseInt(additionsMatch[1]) : 0;
    deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;
  } catch {}

  // Obtener el recuento de pruebas y cobertura
  let testCount = 0, coverage = 0;
  if (fs.existsSync('package.json')) {
    try {
      // Ejecutar Jest con formato JSON pero capturar la salida en lugar de guardarla
      const jestOutput = execSync('npx jest --json', { stdio: 'pipe' }).toString();
      try {
        // Intentar parsear la salida JSON directamente
        const jestResults = JSON.parse(jestOutput);
        testCount = jestResults.numTotalTests;
      } catch {
        // Si no se puede parsear, usar expresiones regulares más flexibles
        const testCountMatch = jestOutput.match(/numTotalTests['"]\s*:\s*(\d+)/);
        if (testCountMatch) {
          testCount = parseInt(testCountMatch[1]);
        }
      }

      // Obtener cobertura del comando separado
      const coverageOutput = execSync('npm test -- --coverage --verbose', { stdio: 'pipe' }).toString();
      const coverageMatch = coverageOutput.match(/All files\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(\d+(\.\d+)?)\s*\|/);
      if (coverageMatch) {
        coverage = parseFloat(coverageMatch[1]);
      }
    } catch {}
  }

  return {
    html_url: `${repoUrl}/commit/${sha}`,
    sha,
    stats: {
      total: additions + deletions,
      additions,
      deletions,
      date: commitDate.toISOString().split('T')[0]
    },
    commit: {
      date: commitDate,
      message: commitMessage,
      url: `${repoUrl}/commit/${sha}`,
      comment_count: 0
    },
    coverage,
    test_count: testCount
  };
}

function saveCommitData(commitData) {
  let commits = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      commits = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {}
  }

  const existingIndex = commits.findIndex(c => c.sha === commitData.sha);
  if (existingIndex >= 0) {
    commits[existingIndex] = commitData;
  } else {
    commits.push(commitData);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(commits, null, 2));
}

try {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  } catch {
    execSync('git init', { stdio: 'ignore' });
  }

  // Obtener el mensaje del commit enviado
  const commitMessageInput = process.argv[2] || 'Initial commit';

  const commitData = getCurrentCommitInfo(commitMessageInput);
  saveCommitData(commitData);
} catch (error) {
  console.error('Error en el pre-commit hook:', error);
  process.exit(1);
}
