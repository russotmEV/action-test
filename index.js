const core = require('@actions/core');
const github = require('@actions/github');
const { spawn, execSync } = require('child_process');

const JIRA_REGEX = "\[[a-zA-Z0-9,\.\_\-]+-[0-9]+\]";

try {
    console.log(execSync('git config --get remote.origin.url').toString().trim());
    execSync('git fetch --all');
    const rev_list = spawn('git', ['rev-list', 'HEAD', `^origin/${github.context.payload.pull_request.base.ref.trim()}`]);
    
    rev_list.stdout.on('data', data => {
        const revs = new String(data).split('\n');
        let hasFailed = false;

        while(revs.length > 0) {
            const rev = revs.pop();
            if (!rev) { continue; }
            
            const msg = execSync(`git log --format=%B -n 1 ${rev}`).toString().trim();
            const found = msg.match(JIRA_REGEX);
            

            if (found) {
                console.log(`[PASS] ${msg}`);
            } else {
                console.log(`[FAIL] ${msg}`);
                hasFailed = true;
            }
        }

        if (hasFailed) { core.setFailed(`Commits missing JIRA ticket number.`); }
    });
    rev_list.stderr.on('data', data => {
        throw { message: data.toString() };
    });
    rev_list.on('error', error => {
        throw error;
    });
} catch (error) {
    core.setFailed(error.message);
}