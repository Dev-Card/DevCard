module.exports = async ({
  github,
  context,
  backend,
  mobile,
  web,
  backendLint,
  backendTest,
  backendTypecheck,
  mobileLint,
  mobileTest,
  webCheck,
  webBuild,
  backendLintOutput,
  mobileLintOutput,
}) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prNumber = context.payload.pull_request.number;

  const status = (s) => {
    if (s === 'success') return 'PASS';
    if (s === 'failure') return 'FAIL';
    if (s === 'skipped') return 'SKIP';
    return '-';
  };

  const lintDetails = (output) => {
    if (!output || !output.trim()) return '';
    return `\n<details>\n<summary>View lint errors</summary>\n\n\`\`\`\n${output.trim()}\n\`\`\`\n</details>`;
  };

  const anyFailure = [backend, mobile, web].includes('failure');
  const title = anyFailure ? 'CI — Checks Failed' : 'CI — All Checks Passed';
  const timestamp = new Date().toUTCString();

  const body = `## ${title}

### Backend — ${status(backend)}

| Check | Result |
|---|---|
| Lint | ${status(backendLint)} |
| Test | ${status(backendTest)} |
| Typecheck | ${status(backendTypecheck)} |
${backendLint === 'failure' ? lintDetails(backendLintOutput) : ''}

### Mobile — ${status(mobile)}

| Check | Result |
|---|---|
| Lint | ${status(mobileLint)} |
| Test | ${status(mobileTest)} |
${mobileLint === 'failure' ? lintDetails(mobileLintOutput) : ''}

### Web — ${status(web)}

| Check | Result |
|---|---|
| Check | ${status(webCheck)} |
| Build | ${status(webBuild)} |

---
Last updated: \`${timestamp}\``;

  const COMMENT_MARKER = '## CI —';

  try {
    const comments = await github.paginate(
      github.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: prNumber
      }
    );

    const existing = comments.find(
      c => c.body && c.body.startsWith(COMMENT_MARKER)
    );

    if (existing) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body
      });
    } else {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body
      });
    }
  } catch (err) {
    console.error(err);
  }
};