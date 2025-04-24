/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  powerMonitor,
} from 'electron';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import path  from 'path';
import nseventmonitorpackage from 'nseventmonitor';
import {TrayGenerator} from './TrayGenerator.js';

import {Notification} from './Notification.js';

const { NSEventMonitor, NSEventMask }  = nseventmonitorpackage

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === 'development'

const gotTheLock = app.requestSingleInstanceLock();

const macEventMonitor = new NSEventMonitor();

const store = new Store();
// store.clear();

const initStore = () => {
  if (!store.get('notifications')) {
    store.set('notifications', []);
  }
  if (store.get('launchAtStart') === undefined) {
    store.set('launchAtStart', true);
  }
  if (store.get('darkModeOn') === undefined) {
    store.set('darkModeOn', false);
  }
  if (store.get('welcomeMessage') === undefined) {
    store.set('welcomeMessage', true);
  }
};

let mainWindow;
let Tray;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    transparent: true,
    width: 340,
    height: 162,
    frame: false,
    show: false,
    icon: path.join(__dirname, './assets/notification_icon.png'),
    fullscreenable: false,
    resizable: false,
    webPreferences: {
      devTools: isDev,
      backgroundThrottling: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../../build/index.html')}`);
  }


  mainWindow.on('focus', () => {
    globalShortcut.register('Command+R', () => null);
    mainWindow.webContents.send('WINDOW_VISIBLE');
    macEventMonitor.start((NSEventMask.leftMouseDown || NSEventMask.rightMouseDown), () => {
      mainWindow.hide();
    });
  });

  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
      globalShortcut.unregister('Command+R');
      mainWindow.webContents.send('WINDOW_VISIBLE');
    }
    macEventMonitor.stop();
  });
};

const shouldWatch = () => {
  const notifications = store.get('notifications');

  if (!notifications.length || notifications.every(item => item.isExpired === true)) {
    return false;
  }
  return true;
};

if (!gotTheLock) {
  app.quit();
} else {
  app.on('ready', () => {


    initStore();
    createMainWindow();
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('DARK_MODE', store.get('darkModeOn'));
    });

    Tray = new TrayGenerator(mainWindow, store);
    Tray.createTray();

    const notification = new Notification(mainWindow, store);

    if (store.get('welcomeMessage')) {
      notification.welcomeMessage();
      store.set('welcomeMessage', false);
    }

    if (shouldWatch()) {
      notification.startWatching();
    }

    powerMonitor.on('resume', () => {
      // To make sure the timer functions properly.
      if (shouldWatch()) {
        notification.startWatching();
      }
    });

    ipcMain.on('ADD_REMINDER', (event, data) => {
      notification.add(data);
      if (shouldWatch()) {
        notification.startWatching();
      }
    });

    ipcMain.on('REPEAT_REMINDER', (evet, data) => {
      notification.repeat(data);
      if (shouldWatch()) {
        notification.startWatching();
      }
    });

    ipcMain.on('DELETE_ITEM', (event, id) => {
      notification.delete(id);
      if (!shouldWatch()) {
        notification.stopWatching();
      }
    });
  });

  app.on('second-instance', () => {
    if (mainWindow) {
      Tray.showWindow();
    }
  });

  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: store.get('launchAtStart'),
    });
  }

  app.dock.hide();
}
