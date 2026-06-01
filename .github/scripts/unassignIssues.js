module.exports = async ({ github, context }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const PROTECTED_ASSIGNEES = [
    'ShantKhatri',
    'Harxhit',
    'blankirigaya'
  ];

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

    const onlyIssues = data.filter(
      item => !item.pull_request
    );

    issues = issues.concat(onlyIssues);

    if (data.length < 100) break;
    page++;
  }

  console.log(
    `Found ${issues.length} open issue(s) to check.`
  );

  for (const issue of issues) {
    const issueNumber = issue.number;

    // Skip if no assignees
    if (
      !issue.assignees ||
      issue.assignees.length === 0
    ) {
      console.log(
        `Issue #${issueNumber} has no assignees — skipping.`
      );
      continue;
    }

    const assigneeLogins =
      issue.assignees.map(a => a.login);

    // Skip protected assignees
    const hasProtectedAssignee =
      assigneeLogins.some(login =>
        PROTECTED_ASSIGNEES.includes(login)
      );

    if (hasProtectedAssignee) {
      console.log(
        `Issue #${issueNumber} has protected assignee(s) — skipping.`
      );
      continue;
    }

    let linkedPRFound = false;
    let assignedAt = null;

    try {
      const timeline =
        await github.rest.issues.listEventsForTimeline({
          owner,
          repo,
          issue_number: issueNumber,
          per_page: 100,
        });

      // Check linked PR
      linkedPRFound = timeline.data.some(event => {
        const pr = event.source?.issue;

        return (
          event.event === 'cross-referenced' &&
          pr?.pull_request &&
          pr.state === 'open'
        );
      });

      // Find latest assignment event
      const assignEvents =
        timeline.data.filter(
          event => event.event === 'assigned'
        );

      if (assignEvents.length > 0) {
        assignedAt =
          assignEvents[
            assignEvents.length - 1
          ].created_at;
      }
    } catch (err) {
      console.log(
        `Could not fetch timeline for issue #${issueNumber}: ${err.message}`
      );
      continue;
    }

    // Skip if no assignment timestamp
    if (!assignedAt) {
      console.log(
        `Issue #${issueNumber} has no assignment timestamp — skipping.`
      );
      continue;
    }

    const assignedDate =
      new Date(assignedAt);
    const now = new Date();

    const daysAssigned =
      (now - assignedDate) /
      (1000 * 60 * 60 * 24);

    console.log(
      `Issue #${issueNumber} assigned for ${daysAssigned.toFixed(
        1
      )} day(s).`
    );

    // Skip if assigned <= 5 days
    if (daysAssigned <= 5) {
      console.log(
        `Issue #${issueNumber} assigned less than 5 days ago — skipping.`
      );
      continue;
    }

    // Skip if linked PR exists
    if (linkedPRFound) {
      console.log(
        `Issue #${issueNumber} has linked open/draft PR — keeping assignment.`
      );
      continue;
    }

    // Remove assignees
    await github.rest.issues.removeAssignees({
      owner,
      repo,
      issue_number: issueNumber,
      assignees: assigneeLogins,
    });

    const assigneesMention =
      assigneeLogins
        .map(user => `@${user}`)
        .join(', ');

    // Comment
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `Hey @ShantKhatri (Project Admin) and @Harxhit (Maintainer),

This issue (previously assigned to ${assigneesMention}) has been **automatically unassigned** because no linked pull request was found within 5 days of assignment.

If work is in progress, please open and link a PR to keep the assignment active.`,
    });

    console.log(
      `Issue #${issueNumber} unassigned successfully.`
    );
  }
};
