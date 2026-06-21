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
  const dbFiles = [];

  let backendChanged = false;
  let mobileChanged = false;
  let webChanged = false;

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
        backendChanged = true;
        if (/\.(js|jsx|ts|tsx)$/.test(fileName)) {
          backendFiles.push(fileName);
        }
      } else if (fileName.startsWith('apps/mobile/')) {
        mobileChanged = true;
        if (/\.(js|jsx|ts|tsx)$/.test(fileName)) {
          mobileFiles.push(fileName);
        }
      } else if (fileName.startsWith('apps/web/')) {
        webChanged = true;
        if (/\.(js|jsx|ts|tsx)$/.test(fileName)) {
          webFiles.push(fileName);
        }
      }else if(fileName.startsWith('apps/backend/prisma')){
        dbFiles.push(fileName)
      }else if(fileName.includes('schema.prisma') || fileName.includes('/migrations/')){
        dbFiles.push(fileName)
      }
    });

    const strippedBackend = backendFiles.map(f => f.replace('apps/backend/', ''));
    const strippedMobile  = mobileFiles.map(f => f.replace('apps/mobile/', ''));

    console.log({ backendFiles, mobileFiles, webFiles, dbFiles });

    core.setOutput('backendFiles',     strippedBackend.join(' '));
    core.setOutput('mobileFiles',      strippedMobile.join(' '));
    core.setOutput('dbFiles', dbFiles.join(' '));
    core.setOutput('webFiles',         webFiles.map(f => f.replace('apps/web/', '')).join(' '));
    core.setOutput('backendTestFiles', deriveTestFiles(strippedBackend).join(' '));
    core.setOutput('mobileTestFiles',  deriveTestFiles(strippedMobile).join(' '));
    core.setOutput('backendChanged',   backendChanged);
    core.setOutput('mobileChanged',    mobileChanged);
    core.setOutput('webChanged',       webChanged);

  } catch (error) {
    console.error(error);

    return {
      backendChanged: false,
      mobileChanged: false,
      webChanged: false
    };
  }
};