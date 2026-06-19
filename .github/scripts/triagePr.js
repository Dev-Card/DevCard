module.exports = async ({github, context}) => {
    const owner = context.repo.owner; 
    const repo = context.repo.repo;
    const pr = context.payload.pull_request;
    const prNumber = pr.number;  
    const username = pr.user.login; 

    const backendFiles = []; 
    const webFiles = []; 
    const mobileFiles = []; 
    const devopsFiles = []; 

    const labels = ['gssoc:approved']; 
    let primaryArea = null;
    let reviewer = null; 

    try {
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
            
            if(fileName.startsWith('apps/backend/')){
                backendFiles.push(fileName); 
            }else if(fileName.startsWith('apps/web/')){
                webFiles.push(fileName); 
            }else if(fileName.startsWith('apps/mobile/')){
                mobileFiles.push(fileName)
            }else if(fileName.startsWith('.github/') || fileName.startsWith('infra/') || fileName.startsWith('terraform/')){
                devopsFiles.push(fileName)
            }
        })


        if(backendFiles.length > 0){
            labels.push('backend')

            if(!primaryArea){
                primaryArea = 'backend'; 
                reviewer = '@Harxhit'
            }
        }
        if(mobileFiles.length > 0){
          labels.push('mobile'); 
          if(!primaryArea){
            primaryArea = 'mobile'; 
            reviewer = '@blankirigaya'
          }
        }
        if(webFiles.length > 0){
            labels.push('web'); 
            if(!primaryArea){
                primaryArea = 'web'; 
                reviewer = '@ShantKhatri'
            }
        }
        if(devopsFiles.length > 0){
            labels.push('devops')
            if(!primaryArea){
                primaryArea = 'devops'
                reviewer = '@ShantKhatri'
            }
        }

        if(labels.length === 0){
            return; 
        }

        await github.rest.issues.addLabels({
            owner,
            repo,
            issue_number: prNumber,
            labels
        });
    const body = `Hi @${username},

Thanks for opening this pull request.

This PR has been automatically classified based on the files modified.

### Applied Labels

${labels.map(label => `- ${label}`).join('\n')}

### Primary Review Area

* ${primaryArea}

### Reviewer

${reviewer} has been identified as the primary reviewer for this pull request.

If you have any questions regarding the affected area or implementation details, feel free to reach out to the assigned reviewer.

Thank you for your contribution! `;


        await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body: body
        });

    } catch (error) {
        console.error(error)
    }

}