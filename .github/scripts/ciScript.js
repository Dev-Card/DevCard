const isTestFile = (file) => /\.(test|spec)\.[jt]sx?$/.test(file);

const deriveTestFiles = (files) => {
  return files.map((file) => {
    if (isTestFile(file)) return file;

    const withoutExt = file.replace(/\.[jt]sx?$/, '');
    const parts = withoutExt.split('/');
    const baseName = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join('/');

    return `${dir}/__tests__/${baseName}.test.ts`;
  });
};

module.exports = async ({ github, context, core }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pr = context.payload.pull_request;
  const prNumber = pr.number;
  const prState = pr.state;

  const backendFiles = [];
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
      } else if (fileName.startsWith('apps/mobile/')) {
        mobileFiles.push(fileName);
      } else if (fileName.startsWith('apps/web/')) {
        webFiles.push(fileName);
      }
    });

    const strippedBackend = backendFiles.map(f => f.replace('apps/backend/', ''));
    const strippedMobile  = mobileFiles.map(f => f.replace('apps/mobile/', ''));

    console.log({ backendFiles, mobileFiles, webFiles });

    core.setOutput('backendFiles',     strippedBackend.join(' '));
    core.setOutput('mobileFiles',      strippedMobile.join(' '));
    core.setOutput('webFiles',         webFiles.map(f => f.replace('apps/web/', '')).join(' '));
    core.setOutput('backendTestFiles', deriveTestFiles(strippedBackend).join(' '));
    core.setOutput('mobileTestFiles',  deriveTestFiles(strippedMobile).join(' '));
    core.setOutput('backendChanged',   backendFiles.length > 0);
    core.setOutput('mobileChanged',    mobileFiles.length > 0);
    core.setOutput('webChanged',       webFiles.length > 0);

  } catch (error) {
    console.error(error);

    return {
      backendChanged: false,
      mobileChanged: false,
      webChanged: false
    };
  }
};