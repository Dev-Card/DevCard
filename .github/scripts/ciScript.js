module.exports = async ({ github, context, core }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pr = context.payload.pull_request;
  const prNumber = pr.number;
  const prState = pr.state;

  const backendFiles = [];
  const backendTests = [];
  const mobileFiles = [];
  const webFiles = [];

  try {
    if (prState === 'closed') {
      console.log(`PR state is: ${prState}`);
      return {
        backendChanged: false,
        mobileChanged: false,
        webChanged: false
      };
    }

    const changedFiles = await github.paginate(
      github.rest.pulls.listFiles,
      {
        owner,
        repo,
        pull_number: prNumber
      }
    );

    changedFiles.forEach((file) => {
      const fileName = file.filename;

      if (fileName.startsWith('apps/backend/')) {
        backendFiles.push(fileName);

        const relative = fileName.replace('apps/backend/src/', '');
        const baseName = relative
          .split('/')
          .pop()
          ?.replace(/\.(ts|tsx|js|jsx)$/, '');

        if (baseName) {
          backendTests.push(`src/__tests__/${baseName}.test.ts`);
        }

      } else if (fileName.startsWith('apps/mobile/')) {
        mobileFiles.push(fileName);
      } else if (fileName.startsWith('apps/web/')) {
        webFiles.push(fileName);
      }
    });

    console.log({
      backendFiles,
      backendTests,
      mobileFiles,
      webFiles
    });

    core.setOutput(
      "backendFiles",
      backendFiles
        .map(file => file.replace("apps/backend/", ""))
        .join(" ")
    );

    core.setOutput(
      "backendTests",
      [...new Set(backendTests)].join(" ")
    );

    core.setOutput(
      "mobileFiles",
      mobileFiles
        .map(file => file.replace("apps/mobile/", ""))
        .join(" ")
    );

    core.setOutput(
      "webFiles",
      webFiles
        .map(file => file.replace("apps/web/", ""))
        .join(" ")
    );

    core.setOutput("backendChanged", backendFiles.length > 0);
    core.setOutput("mobileChanged", mobileFiles.length > 0);
    core.setOutput("webChanged", webFiles.length > 0);

  } catch (error) {
    console.error(error);

    return {
      backendChanged: false,
      mobileChanged: false,
      webChanged: false
    };
  }
};