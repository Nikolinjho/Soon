import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import classnames from 'classnames';
import { AddReminder } from '../AddReminder';
import { RemindersList } from '../RemindersList';
import { getRenderer, isElectron } from '../../utils/get-renderer';

import Back from '../../assets/icons/back.svg';
import MoreIcon from '../../assets/icons/more.svg';

import styles from './styles.module.css';

const ipcRenderer = getRenderer();

// Context for reminders state management
const RemindersContext = createContext();
const DarkModeContext = createContext();
const ViewContext = createContext();

/**
 * Reminders Provider - manages all reminder-related state and operations
 */
function RemindersProvider({ children }) {
  const [reminders, setReminders] = useState([]);

  const updateList = useCallback((newReminders) => {
    setReminders(newReminders);
  }, []);

  const deleteItem = useCallback((id) => {
    if (!isElectron()) {
      // Browser environment - just remove from local state
      if (id === 'all') {
        setReminders([]);
      } else if (id === 'expired') {
        setReminders(prev => prev.filter(item => !item.isExpired));
      } else {
        setReminders(prev => prev.filter((_, index) => index !== prev.length - 1 - id));
      }
      return;
    }

    if (id === 'all' || id === 'expired') {
      ipcRenderer.send('DELETE_ITEM', id);
    } else {
      ipcRenderer.send('DELETE_ITEM', reminders.length - 1 - id);
    }
  }, [reminders]);

  const getNumberOfReminders = useCallback((type) => {
    if (type === 'all') {
      return reminders.length;
    }
    return reminders.filter(item => item.isExpired === true).length;
  }, [reminders]);

  // IPC event handlers
  useEffect(() => {
    if (!isElectron()) {
      // Browser environment - add some mock data for development
      updateList([
        { id: 1, message: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. ', isExpired: false },
        { id: 2, message: 'Sample reminder 2', isExpired: true },
      ]);
      return;
    }

    const handleNotificationAdded = (event, args) => updateList(args);
    const handleExistingNotifications = (event, args) => updateList(args);
    const handleNotificationExpired = (event, args) => updateList(args);

    ipcRenderer.on('NOTIFICATION_ADDED', handleNotificationAdded);
    ipcRenderer.on('EXISTING_NOTIFICATIONS', handleExistingNotifications);
    ipcRenderer.on('NOTIFICATION_EXPIRED', handleNotificationExpired);

    return () => {
      ipcRenderer.removeListener('NOTIFICATION_ADDED', handleNotificationAdded);
      ipcRenderer.removeListener('EXISTING_NOTIFICATIONS', handleExistingNotifications);
      ipcRenderer.removeListener('NOTIFICATION_EXPIRED', handleNotificationExpired);
    };
  }, [updateList]);

  const value = {
    reminders,
    updateList,
    deleteItem,
    getNumberOfReminders
  };

  return (
    <RemindersContext.Provider value={value}>
      {children}
    </RemindersContext.Provider>
  );
}

/**
 * Dark Mode Provider - manages theme state
 */
function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;

    const handleDarkMode = (event, args) => {
      setDarkMode(args);
    };

    ipcRenderer.on('DARK_MODE', handleDarkMode);

    return () => {
      ipcRenderer.removeListener('DARK_MODE', handleDarkMode);
    };
  }, []);

  // Update arrow element class based on dark mode
  useEffect(() => {
    const arrowElement = document.getElementById('arrow');
    if (arrowElement) {
      if (darkMode) {
        arrowElement.classList.add('darkMode');
      } else {
        arrowElement.classList.remove('darkMode');
      }
    }
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

/**
 * View Provider - manages view state (showList)
 */
function ViewProvider({ children }) {
  const [showList, setShowList] = useState(false);

  const toggleList = useCallback(() => {
    setShowList(prev => !prev);
  }, []);

  const hideList = useCallback(() => {
    setShowList(false);
  }, []);

  useEffect(() => {
    if (!isElectron()) return;

    ipcRenderer.on('WINDOW_VISIBLE', hideList);

    return () => {
      ipcRenderer.removeListener('WINDOW_VISIBLE', hideList);
    };
  }, [hideList]);

  const value = {
    showList,
    toggleList,
    hideList
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}

/**
 * Custom hooks for accessing context
 */
function useReminders() {
  const context = useContext(RemindersContext);
  if (!context) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
}

function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}

/**
 * App Layout component - handles the main layout structure
 */
function AppLayout({ children }) {
  const { darkMode } = useDarkMode();

  const appClass = classnames(
    styles.app,
    darkMode ? styles.darkMode : ''
  );

  return (
    <div className={appClass}>
      {children}
    </div>
  );
}

/**
 * Main Content component - renders current view
 */
function MainContent() {
  const { showList } = useView();
  const { darkMode } = useDarkMode();

  if (showList) {
    return <RemindersListView />;
  }

  return <AddReminder darkMode={darkMode} />;
}

/**
 * Reminders List View component
 */
function RemindersListView() {
  const { reminders, deleteItem } = useReminders();
  const { darkMode } = useDarkMode();

  return (
    <RemindersList
      reminders={reminders}
      deleteItem={deleteItem}
      darkMode={darkMode}
    />
  );
}

/**
 * Navigation component - handles toggle buttons and action buttons
 */
function Navigation() {
  const { showList, toggleList } = useView();
  const { reminders, deleteItem, getNumberOfReminders } = useReminders();
  const { darkMode } = useDarkMode();

  if (showList) {
    return (
      <ListNavigation
        darkMode={darkMode}
        toggleList={toggleList}
        reminders={reminders}
        deleteItem={deleteItem}
        getNumberOfReminders={getNumberOfReminders}
      />
    );
  }

  return (
    <AddReminderNavigation
      darkMode={darkMode}
      toggleList={toggleList}
    />
  );
}

/**
 * List Navigation component
 */
function ListNavigation({ darkMode, toggleList, reminders, deleteItem, getNumberOfReminders }) {
  const toggleButtonClass = classnames(
    styles.toggleButton,
    darkMode ? styles.darkMode : ''
  );

  const isRemindersExist = reminders.length > 0;

  return (
    <>
      <Back
        className={toggleButtonClass}
        onClick={toggleList}
      />
      {isRemindersExist && (
        <ActionButtons
          deleteItem={deleteItem}
          getNumberOfReminders={getNumberOfReminders}
        />
      )}
    </>
  );
}

/**
 * Add Reminder Navigation component
 */
function AddReminderNavigation({ darkMode, toggleList }) {
  const toggleButtonClass = classnames(
    styles.toggleButton,
    darkMode ? styles.darkMode : ''
  );

  return (
    <MoreIcon
      className={toggleButtonClass}
      onClick={toggleList}
    />
  );
}

/**
 * Action Buttons component
 */
function ActionButtons({ deleteItem, getNumberOfReminders }) {
  const allRemindersCount = getNumberOfReminders('all');
  const expiredRemindersCount = getNumberOfReminders('expired');
  const isExpiredRemindersExist = expiredRemindersCount > 0;

  const expiredButtonClass = classnames(
    styles.removeButton,
    !isExpiredRemindersExist && styles.inActive
  );

  const handleDeleteAll = () => deleteItem('all');
  const handleDeleteExpired = () => deleteItem('expired');

  return (
    <div className={styles.removeButtonsWrapper}>
      <button
        type="button"
        className={styles.removeButton}
        onClick={handleDeleteAll}
      >
        {`Удалить все ( ${allRemindersCount} )`}
      </button>
      <button
        type="button"
        className={expiredButtonClass}
        onClick={handleDeleteExpired}
      >
        {`Удал. истекшие ( ${expiredRemindersCount} )`}
      </button>
    </div>
  );
}

/**
 * Main App component using composition pattern
 */
function App() {
  return (
    <DarkModeProvider>
      <RemindersProvider>
        <ViewProvider>
          <AppLayout>
            <MainContent />
            <Navigation />
          </AppLayout>
        </ViewProvider>
      </RemindersProvider>
    </DarkModeProvider>
  );
}

export { App, useReminders, useDarkMode, useView };
