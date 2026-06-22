module.exports = async ({ github, context }) => {
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    const EXCLUDED = new Set([
        'shantkhatri',
        'harxhit',
        'blankirigaya'
    ]);

    const contributors = new Map();

    const ensure = (login, avatarUrl, profileUrl) => {
        if (!contributors.has(login)) {
            contributors.set(login, {
                login,
                avatarUrl,
                profileUrl,
                mergedPrs: 0,
                openPrs: 0,
                issues: 0
            });
        }

        return contributors.get(login);
    };

    const mergedPrs = await github.paginate(
        github.rest.pulls.list,
        {
            owner,
            repo,
            state: 'closed',
            per_page: 100
        }
    );

    for (const pr of mergedPrs) {
        if (!pr.merged_at) continue;
        if (!pr.user) continue;

        const login = pr.user.login;

        if (EXCLUDED.has(login.toLowerCase())) continue;

        const user = ensure(
            login,
            pr.user.avatar_url,
            pr.user.html_url
        );

        user.mergedPrs++;
    }

    const openPrs = await github.paginate(
        github.rest.pulls.list,
        {
            owner,
            repo,
            state: 'open',
            per_page: 100
        }
    );

    for (const pr of openPrs) {
        if (!pr.user) continue;

        const login = pr.user.login;

        if (EXCLUDED.has(login.toLowerCase())) continue;

        const user = ensure(
            login,
            pr.user.avatar_url,
            pr.user.html_url
        );

        user.openPrs++;
    }

    const issues = await github.paginate(
        github.rest.issues.listForRepo,
        {
            owner,
            repo,
            state: 'all',
            per_page: 100
        }
    );

    for (const issue of issues) {
        if (issue.pull_request) continue;
        if (!issue.user) continue;

        const login = issue.user.login;

        if (EXCLUDED.has(login.toLowerCase())) continue;

        const user = ensure(
            login,
            issue.user.avatar_url,
            issue.user.html_url
        );

        user.issues++;
    }

    const leaderboard = [...contributors.values()].sort(
        (a, b) =>
            b.mergedPrs - a.mergedPrs ||
            b.issues - a.issues ||
            b.openPrs - a.openPrs ||
            a.login.localeCompare(b.login)
    );

    const fs = require('fs');

    fs.mkdirSync('public', { recursive: true });

    fs.writeFileSync(
        'public/leaderboard.json',
        JSON.stringify(leaderboard, null, 2)
    );

    console.log(`Generated ${leaderboard.length} contributors`);
};