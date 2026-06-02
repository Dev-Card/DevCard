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
  webBuild
}) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prNumber = context.payload.pull_request.number;

  const emoji = (status) => {
    if (status === 'success') return '✅';
    if (status === 'failure') return '❌';
    if (status === 'skipped') return '⏭️';
    return '⚪';
  };

  const label = (status) => {
    if (!status) return '⚪ unknown';
    return `${emoji(status)} ${status}`;
  };

  const anyFailure = [
    backend,
    mobile,
    web
  ].includes('failure');

  const title = anyFailure
    ? '❌ Some checks failed'
    : '✅ CI completed';

  const timestamp = new Date().toUTCString();

  const body = `## CI Results — ${title}

### 🖥️ Backend (${label(backend)})
| Check | Status |
|---|---|
| Lint | ${label(backendLint)} |
| Test | ${label(backendTest)} |
| Typecheck | ${label(backendTypecheck)} |

### 📱 Mobile (${label(mobile)})
| Check | Status |
|---|---|
| Lint | ${label(mobileLint)} |
| Test | ${label(mobileTest)} |

### 🌐 Web (${label(web)})
| Check | Status |
|---|---|
| Check | ${label(webCheck)} |
| Build | ${label(webBuild)} |

---
🕐 Last updated: \`${timestamp}\``;

  const COMMENT_MARKER = '## CI Results —';

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