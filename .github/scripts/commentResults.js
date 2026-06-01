module.exports = async ({ github, context, backend, mobile, web }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pr = context.payload.pull_request;
  const prNumber = pr.number;

  const statusEmoji = (status) => {
    if (status === 'success') return '✅';
    if (status === 'failure') return '❌';
    if (status === 'skipped') return '⏭️';
    return '⚪';
  };

  const statusLabel = (status) => {
    if (status === 'skipped') return `${statusEmoji(status)} Skipped — no changes detected`;
    return `${statusEmoji(status)} ${status}`;
  };

  const results = [backend, mobile, web];
  const allSkipped = results.every((s) => s === 'skipped');
  const anyFailure = results.some((s) => s === 'failure');
  const allPassed = results.every((s) => s === 'success' || s === 'skipped');

  let title;
  if (allSkipped) {
    title = '⏭️ No changes detected — all checks skipped';
  } else if (anyFailure) {
    title = '❌ Some checks failed';
  } else if (allPassed) {
    title = '✅ All checks passed';
  } else {
    title = '⚪ Checks completed';
  }

  const timestamp = new Date().toUTCString();

  const body = `## CI Results — ${title}

| Check | Status |
|---|---|
| 🖥️ Backend | ${statusLabel(backend)} |
| 📱 Mobile | ${statusLabel(mobile)} |
| 🌐 Web | ${statusLabel(web)} |

> ⏭️ **Skipped** means no files were changed in that area — the check was not needed.

---
🕐 Last updated: \`${timestamp}\``;

  const COMMENT_MARKER = '## CI Results —';

  try {
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find(
      (c) => c.body && c.body.startsWith(COMMENT_MARKER)
    );

    if (existingComment) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
      console.log(`Updated existing comment: ${existingComment.id}`);
    } else {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      console.log('Created new CI results comment');
    }
  } catch (error) {
    console.error('Failed to post comment:', error);
  }
};