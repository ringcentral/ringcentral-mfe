import { logCoreManager } from '@ringcentral/mfe-shared';
import { ENABLE_LOG_KEY } from './constants';

class LogToggle {
  setEnable(enable: boolean) {
    localStorage.setItem(ENABLE_LOG_KEY, String(enable));
    this.update();
  }

  update() {
    logCoreManager.enable(localStorage.getItem(ENABLE_LOG_KEY) === 'true');
  }

  isEnable() {
    return localStorage.getItem(ENABLE_LOG_KEY) === 'true';
  }
}

const logToggle = new LogToggle();

export { logToggle };
