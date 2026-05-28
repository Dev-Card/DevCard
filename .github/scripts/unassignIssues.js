module.exports = async ({ github, context }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  // Fetch all open issues (excluding PRs)
  let page = 1;
  let issues = [];

  while (true) {
    const { data } = await github.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
      page,
    });

    const onlyIssues = data.filter(i => !i.pull_request);
    issues = issues.concat(onlyIssues);

    if (data.length < 100) break;
    page++;
  }

  console.log(`Found ${issues.length} open issue(s) to check.`);

  for (const issue of issues) {
    const issueNumber = issue.number;

    if (!issue.assignees || issue.assignees.length === 0) {
      console.log(
        `Issue #${issueNumber} has no assignees — skipping.`
      );
      continue;
    }

    let linkedPRFound = false;

    try {
      const timeline =
        await github.rest.issues.listEventsForTimeline({
          owner,
          repo,
          issue_number: issueNumber,
          per_page: 100,
        });

      linkedPRFound = timeline.data.some(
        event =>
          event.event === 'cross-referenced' &&
          event.source?.issue?.pull_request &&
          event.source?.issue?.state === 'open'
      );
    } catch (err) {
      console.log(
        `Could not fetch timeline for issue #${issueNumber}: ${err.message}`
      );
    }

    if (!linkedPRFound) {
      const assigneeLogins =
        issue.assignees.map(a => a.login);

      await github.rest.issues.removeAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees: assigneeLogins,
      });

      const assigneesMention =
        assigneeLogins.map(u => `@${u}`).join(', ');

      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `Hey @ShantKhatri (Project Admin) and @Harxhit (Maintainer),

This issue (previously assigned to ${assigneesMention}) has been **automatically unassigned** because no linked pull request was found after the scheduled check.

If work is in progress, please open a PR and link it to this issue to keep the assignment.`,
      });
    }
  }
};