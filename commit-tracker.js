const fs = require('fs');
const { execSync } = require('child_process');

const DATA_FILE = 'commit-history.json';

function getAllCommits() {
  console.log('Recuperando historial de commits...');
  let commits = [];
  const logCommand = 'git log --pretty=format:"%H|%an|%ad|%s" --date=iso --reverse';
  const repoUrl = execSync('git config --get remote.origin.url', { stdio: 'pipe' }).toString().trim();
  const repoBaseUrl = repoUrl.replace(/\.git$/, '').replace('git@github.com:', 'https://github.com/');

  try {
    const logOutput = execSync(logCommand, { stdio: 'pipe' }).toString();

    logOutput.split('\n').forEach((line) => {
      const [sha, author, date, message] = line.split('|');
      const commitDate = new Date(date);

      // Obtener adiciones y eliminaciones por commit
      let additions = 0, deletions = 0;
      try {
        const diffStats = execSync(`git show --stat ${sha}`, { stdio: 'pipe' }).toString();
        const additionsMatch = diffStats.match(/(\d+) insertion/);
        const deletionsMatch = diffStats.match(/(\d+) deletion/);
        additions = additionsMatch ? parseInt(additionsMatch[1]) : 0;
        deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;
      } catch {}

      // Calcular test count y coverage
      let testCount = 0, coverage = 0;
      try {
        execSync(`git reset --hard`, { stdio: 'pipe' }); // Limpiar el índice y el directorio de trabajo
        execSync(`git checkout ${sha}`, { stdio: 'pipe' });

        // Obtener cobertura del comando separado
        const coverageOutput = execSync('npm test -- --coverage --verbose', { stdio: 'pipe' }).toString();
        const coverageMatch = coverageOutput.match(/All files\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(\d+(\.\d+)?)\s*\|/);
        if (coverageMatch) {
          coverage = parseFloat(coverageMatch[1]);
        }

        const jestOutput = execSync('npx jest --coverage --json', { stdio: 'pipe' }).toString();
        const jestResults = JSON.parse(jestOutput);

        testCount = jestResults.numTotalTests;

        execSync(`git checkout -`, { stdio: 'pipe' }); // Volver al estado anterior
      } catch (error) {
        console.error(`Error calculando coverage para ${sha}:`, error.message);
      }

      // Construir la URL del commit
      const commitUrl = `${repoBaseUrl}/commit/${sha}`;

      commits.push({
        sha,
        author,
        commit: {
          date: commitDate.toISOString(),
          message,
          url: commitUrl,
        },
        stats: {
          total: additions + deletions,
          additions,
          deletions,
          date: commitDate.toISOString().split('T')[0]
        },
        coverage,
        test_count: testCount
      });
    });
  } catch (error) {
    console.error('Error obteniendo commits:', error);
  }
  return commits;
}

function saveCommitData(commits) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(commits, null, 2));
}

try {
  const commits = getAllCommits();
  saveCommitData(commits);
  console.log('Historial de commits actualizado correctamente.');
} catch (error) {
  console.error('Error en la ejecución:', error);
}
