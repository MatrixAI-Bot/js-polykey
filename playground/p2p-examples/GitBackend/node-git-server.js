const path = require('path');
import Server from '../../../src/version-control/node-git-server/git'

const repos = new Server(path.resolve(__dirname, 'tmp'), {
  autoCreate: true
});
const port = process.env.PORT || 7005;

repos.on('push', (push) => {
  console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
  push.accept();
});

repos.on('fetch', (fetch) => {
  console.log(`fetch ${fetch.commit}`);
  fetch.accept();
});

repos.listen(port, () => {
  console.log(`node-git-server running at http://localhost:${port}`)
});
