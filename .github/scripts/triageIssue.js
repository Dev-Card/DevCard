module.exports = async({github, context}) => {
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const issue = context.payload.issue; 
    const issueNumber = issue.number;
    const issueDescription = issue.body; 
    const username = issue.user.login

    if(context.eventName === 'issues'){
        try {
            if(!issueDescription || !issueDescription.trim()){
                return await github.rest.issues.createComment({
                    owner,
                    repo, 
                    issue_number: issueNumber, 
                    body: `Hi @${username},
    
    Thanks for opening this issue.
    
    It looks like the issue description is currently missing.
    
    Please provide:
    - A brief summary of the problem
    - Expected behavior
    - Actual behavior (if applicable)
    - Any relevant screenshots, logs, or context
    
    This helps the team understand, prioritize, and route the issue correctly.
    
    Thank you!
        
                    `
                })
            }
    
            return await github.rest.issues.createComment({
                owner,
                repo, 
                issue_number: issueNumber,
                body: `Hi @${username},
    
    Thanks for opening this issue.
    
    Please reply with one of the following areas so the issue can be routed to the appropriate team member:
    
    - /backend
    - /web
    - /mobile
    - /devops
    
    Once an area is selected, the corresponding label will be added automatically.`
            })
            
        } catch (error) {
            console.error(error)
        }
    }else if(context.eventName === 'issue_comment'){
        if (context.payload.comment.user.type === 'Bot' || context.payload.comment.user.login === 'github-actions[bot]') {
            return;
        }

        const comment = (context.payload.comment.body || '').trim().toLowerCase();
        const existingLabels = (issue.labels || []).map(label => label.name);

        if (
            existingLabels.includes('backend') ||
            existingLabels.includes('web') ||
            existingLabels.includes('mobile') ||
            existingLabels.includes('devops')
        ) {
            return;
        }

        if (!['/backend', '/web', '/mobile', '/devops'].includes(comment)) {
            return;
        }
        if(comment === '/backend'){
            await github.rest.issues.addLabels({
                owner,
                repo, 
                issue_number: issueNumber,
                labels: ['backend']  

            })
            return await github.rest.issues.createComment({
                owner,
                repo, 
                issue_number: issueNumber, 
                body: `The issue has been classified as **backend**.

@Harxhit, please review and triage this issue when available.

The **backend** label has been applied and the issue has been routed accordingly.`
            }) 
        }else if(comment === '/web'){
            await github.rest.issues.addLabels({
                owner,
                repo, 
                issue_number: issueNumber,
                labels: ['web']  

            })
            return await github.rest.issues.createComment({
                owner,
                repo, 
                issue_number: issueNumber, 
                body: `The issue has been classified as **web**.

@ShantKhatri, please review and triage this issue when available.

The **web** label has been applied and the issue has been routed accordingly.`
            }) 
        }else if(comment === '/mobile'){
            await github.rest.issues.addLabels({
                owner,
                repo, 
                issue_number: issueNumber,
                labels: ['mobile']  

            })
            return await github.rest.issues.createComment({
                owner,
                repo, 
                issue_number: issueNumber, 
                body: `The issue has been classified as **mobile**.

@blankirigaya, please review and triage this issue when available.

The **mobile** label has been applied and the issue has been routed accordingly.`
            }) 
        }else if(comment === '/devops'){
            await github.rest.issues.addLabels({
                owner,
                repo, 
                issue_number: issueNumber,
                labels: ['devops']  

            })
            return await github.rest.issues.createComment({
                owner,
                repo, 
                issue_number: issueNumber, 
                body: `The issue has been classified as **devops**.

@ShantKhatri, please review and triage this issue when available.

The **devops** label has been applied and the issue has been routed accordingly.`
            }) 
        }
    }
}