const fs = require('fs');
const { execSync } = require('child_process');

const DATA_FILE = 'commit-history.json';

function getAllCommits() {
  let commits = [];
  const logCommand = 'git log --pretty=format:"%H|%an|%ad|%s" --date=iso --reverse';
  try {
    const logOutput = execSync(logCommand).toString();

    logOutput.split('\n').forEach((line) => {
      const [sha, author, date, message] = line.split('|');
      const commitDate = new Date(date);

      // Obtener adiciones y eliminaciones por commit
      let additions = 0, deletions = 0;
      try {
        const diffStats = execSync(`git show --stat ${sha}`).toString();
        const additionsMatch = diffStats.match(/(\d+) insertion/);
        const deletionsMatch = diffStats.match(/(\d+) deletion/);
        additions = additionsMatch ? parseInt(additionsMatch[1]) : 0;
        deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;
      } catch {}

      // Calcular test count y coverage
      let testCount = 0, coverage = 0;
      try {
        execSync(`git stash`); // Guardar cambios locales
        execSync(`git checkout ${sha}`);
        const jestOutput = execSync('npx jest --coverage --json').toString();
        const jestResults = JSON.parse(jestOutput);

        testCount = jestResults.numTotalTests;
        coverage = jestResults.coverageMap.__coverage_schema; // Ajusta según la estructura real de tu salida de Jest

        execSync(`git checkout -`); // Volver al estado anterior
        execSync(`git stash pop`); // Recuperar cambios guardados
      } catch (error) {
        console.error(`Error calculando coverage para ${sha}:`, error.message);
      }

      commits.push({
        sha,
        author,
        commit: {
          date: commitDate.toISOString(),
          message,
          url: '',
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
