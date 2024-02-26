import { exec } from 'child_process';

export default () => {
  exec('cd test/base && forever start start.js');
};
