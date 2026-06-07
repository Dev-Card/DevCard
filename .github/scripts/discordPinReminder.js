module.exports = async ({ github, context }) => {
  const pr = context.payload.pull_request;
  const ignoreUsers = [
    'ShantKhatri',
    'Harxhit',
    'blankirigaya',
  ];

  try {
    if (!pr || !pr.merged) {
      console.log('PR not merged.');
      return;
    }

    const prNumber = pr.number;
    const contributor = pr.user.login;

    if (ignoreUsers.includes(contributor)) {
      console.log(`Ignoring PR #${prNumber} by ${contributor}`);
      return;
    }

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: `Congratulations @${contributor} on getting PR #${prNumber} merged!

Thank you for your contribution to the project.

To receive the appropriate GSSoC labels and recognition, please mention @Harxhit in the **#get-labels** channel on our Discord server and share your merged PR link.`,
    });

    console.log(`Comment added to PR #${prNumber}`);
  } catch (error) {
    console.error(error);
  }
};