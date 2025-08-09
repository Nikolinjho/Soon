import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getRenderer, isElectron } from '../../utils/get-renderer';

import styles from './styles.module.css';

const ipcRenderer = getRenderer();

/**
 * AddReminder component for creating new reminders
 * @param {Object} props - Component props
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 */
function AddReminder({ darkMode }) {
  // State hooks
  const [message, setMessage] = useState('');
  const [time, setTime] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [shake, setShake] = useState(false);

  // Ref hooks
  const messageInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const statusMessageTimeoutRef = useRef(null);
  const shakeTimeoutRef = useRef(null);

  // Helper functions
  const clearMessage = useCallback(() => {
    statusMessageTimeoutRef.current = setTimeout(() => {
      setStatusMessage('');
      statusMessageTimeoutRef.current = null;
    }, 2500);
  }, []);

  const clearShake = useCallback(() => {
    shakeTimeoutRef.current = setTimeout(() => {
      setShake(false);
      shakeTimeoutRef.current = null;
    }, 500);
  }, []);

  const onWindowVisible = useCallback(() => {
    messageInputRef.current?.focus();
  }, []);

  const notificationAdded = useCallback(() => {
    if (messageInputRef.current) {
      messageInputRef.current.value = '';
    }
    if (timeInputRef.current) {
      timeInputRef.current.value = '';
    }

    setStatusMessage('Reminder added');
    setMessage('');
    setTime('');

    clearMessage();
    messageInputRef.current?.focus();
  }, [clearMessage]);

  const notificationFailed = useCallback(() => {
    if (!shakeTimeoutRef.current) {
      setShake(true);
      clearShake();
    }
  }, [clearShake]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === 'message') {
      setMessage(value);
    } else if (name === 'time') {
      setTime(value);
    }
  }, []);

  const focusNextField = useCallback((e) => {
    if (e.keyCode === 13 && messageInputRef.current?.value.length) {
      timeInputRef.current?.focus();
    }
  }, []);

  const addNotification = useCallback((e) => {
    if (e.keyCode === 13 && timeInputRef.current?.value.length) {
      if (!isElectron()) {
        // Browser environment - just show a success message
        notificationAdded();
        return;
      }

      ipcRenderer.send('ADD_REMINDER', {
        message,
        time,
      });
    }
  }, [message, time, notificationAdded]);

  // Effect for component mount/unmount
  useEffect(() => {
    if (!isElectron()) {
      // Browser environment - just focus the input
      messageInputRef.current?.focus();
      return;
    }

    // Add event listeners
    ipcRenderer.on('NOTIFICATION_ADDED', notificationAdded);
    ipcRenderer.on('NOTIFICATION_FAILED', notificationFailed);
    ipcRenderer.on('WINDOW_VISIBLE', onWindowVisible);
    messageInputRef.current?.focus();

    // Cleanup function
    return () => {
      clearTimeout(statusMessageTimeoutRef.current);
      clearTimeout(shakeTimeoutRef.current);

      if (!isElectron()) return;

      ipcRenderer.removeListener('NOTIFICATION_ADDED', notificationAdded);
      ipcRenderer.removeListener('NOTIFICATION_FAILED', notificationFailed);
      ipcRenderer.removeListener('WINDOW_VISIBLE', onWindowVisible);
    };
  }, [notificationAdded, notificationFailed, onWindowVisible]);

  return (
    <div className={classnames(
      styles.addReminder,
      darkMode ? styles.darkMode : ''
    )}
    >
      <input
        ref={messageInputRef}
        name="message"
        onChange={handleInputChange}
        onKeyUp={focusNextField}
        placeholder="Что напомнить?"
        maxLength={150}
      />
      <div className={styles.separator} />
      <input
        ref={timeInputRef}
        className={classnames(
          styles.timeInput,
          shake ? styles.shake : ''
        )}
        name="time"
        onChange={handleInputChange}
        onKeyUp={addNotification}
        placeholder="Когда?"
      />
      <span
        className={classnames(
          styles.statusMessage,
          statusMessage.length ? styles.enter : '',
        )}
      >
        {statusMessage}
      </span>
    </div>
  );
}

AddReminder.propTypes = {
  darkMode: PropTypes.bool.isRequired
};

export { AddReminder };
