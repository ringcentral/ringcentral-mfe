// eslint-disable-next-line @typescript-eslint/no-var-requires
const { spawn } = require('child_process');

spawn('yarn', ['serve'], {
  shell: true,
  stdio: 'inherit',
});
