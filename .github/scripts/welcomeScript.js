module.exports = async ({ github, context }) => {
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const issueNumber = context.issue.number;
    const eventName = context.eventName;
    const ghUsername = context.payload.sender.login;

    try {
        const issueAssociation =
            context.payload.issue?.author_association;

        if (
            eventName === 'issues' &&
            issueAssociation === 'FIRST_TIMER'
        ) {
            return await github.rest.issues.createComment({
                owner,
                repo,
                issue_number: issueNumber,
                body: `👋 Thanks for opening your first issue, @${ghUsername}!

We appreciate your contribution and are excited to have you here. Please make sure to follow the contribution guidelines and provide as much detail as possible.

To stay updated, ask questions, and connect with maintainers and contributors, please join our Discord community:
https://discord.gg/QueQN83wn

Looking forward to collaborating with you!`
            });
        }

        const prAssociation =
            context.payload.pull_request?.author_association;

        if (
            eventName === 'pull_request_target' &&
            (
                prAssociation === 'FIRST_TIMER' ||
                prAssociation === 'FIRST_TIME_CONTRIBUTOR'
            )
        ) {
            return await github.rest.issues.createComment({
                owner,
                repo,
                issue_number: issueNumber,
                body: `🎉 Thanks for your first contribution, @${ghUsername}!

We're excited to have you here. A maintainer will review your PR soon. Please check CI results and review any feedback if needed.

To stay updated, ask questions, and connect with maintainers and contributors, please join our Discord community:
https://discord.gg/QueQN83wn

Looking forward to collaborating with you!`
            });
        }

    } catch (error) {
        console.error(error);
    }
};