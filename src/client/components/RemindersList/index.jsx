/* eslint-disable react/no-array-index-key */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Tippy from '@tippyjs/react';
import { followCursor } from 'tippy.js';
import classnames from 'classnames';
import { getRenderer, isElectron } from '../../utils/get-renderer';

import Cross from '../../assets/icons/cross.svg';
import Refresh from '../../assets/icons/refresh.svg';
import styles from './styles.module.css';

const ipcRenderer = getRenderer();

/**
 * RemindersList component for displaying and managing reminders
 * @param {Object} props - Component props
 * @param {Array} props.reminders - Array of reminder objects
 * @param {Function} props.deleteItem - Function to delete a reminder
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 */
function RemindersList({ reminders, deleteItem, darkMode }) {
  // State hooks
  const [selectedId, setSelectedId] = useState(-1);
  const [isShaking, setIsShaking] = useState(false);

  // Ref hooks
  const repeatWhenRef = useRef(null);
  const shakeTimeoutRef = useRef(null);

  // Helper functions
  const setShake = useCallback(() => {
    if (!shakeTimeoutRef.current) {
      setIsShaking(true);
      clearShake();
    }
  }, []);

  const clearShake = useCallback(() => {
    shakeTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
      shakeTimeoutRef.current = null;
    }, 500);
  }, []);

  const handleRepeatFailed = useCallback(() => {
    setShake();
  }, [setShake]);

  const handleNotificationAdded = useCallback(() => {
    setSelectedId(-1);
  }, []);

  const onRepeatChange = useCallback(() => {
    if (isShaking) {
      setIsShaking(false);
    }
  }, [isShaking]);

  const onRepeatSubmit = useCallback((e) => {
    const value = repeatWhenRef.current?.value;
    const isEnterPressed = e.keyCode === 13;
    const isValueNotEmpty = value && value.length > 0;

    if (isEnterPressed && isValueNotEmpty) {
      if (!isElectron()) {
        // Browser environment - just close the input
        setSelectedId(-1);
        return;
      }

      ipcRenderer.send('REPEAT_REMINDER', {
        id: selectedId,
        time: value,
      });
    }
  }, [selectedId]);

  const toggleSelectedId = useCallback((e, id) => {
    e.preventDefault();

    const isLeftClick = e.button === 0;
    if (isLeftClick) {
      const isCurrentlySelected = selectedId === -1;
      if (isCurrentlySelected) {
        setSelectedId(id);
      } else {
        setSelectedId(-1);
      }
    }
  }, [selectedId]);

  const getTime = useCallback((timeStamp) => {
    const date = new Date(timeStamp);
    let hours = date.getHours();
    let minutes = date.getMinutes();

    minutes = /^\d$/.test(minutes) ? `0${minutes}` : minutes;
    hours = /^\d$/.test(hours) ? `0${hours}` : hours;

    return `${hours}:${minutes}`;
  }, []);

  const getTippyTheme = useCallback((isDarkTheme) => {
    if (isDarkTheme) {
      return {
        backgroundColor: 'black',
        boxShadow: '0px 3px 22px 0px rgba(20,20,20,1)',
        color: 'white'
      };
    }
    return {
      backgroundColor: 'white',
      boxShadow: '0px 3px 22px 0px rgba(184,184,184,1)',
      color: 'black'
    };
  }, []);

  const handleInputBlur = useCallback(() => {
    setSelectedId(-1);
  }, []);

  // Effect for component mount/unmount (IPC listeners)
  useEffect(() => {
    if (!isElectron()) return;

    ipcRenderer.on('REPEAT_FAILED', handleRepeatFailed);
    ipcRenderer.on('NOTIFICATION_ADDED', handleNotificationAdded);

    return () => {
      ipcRenderer.removeListener('REPEAT_FAILED', handleRepeatFailed);
      ipcRenderer.removeListener('NOTIFICATION_ADDED', handleNotificationAdded);
    };
  }, [handleRepeatFailed, handleNotificationAdded]);

  // Effect for focus management when selectedId changes
  useEffect(() => {
    const isItemSelected = selectedId !== -1;
    if (isItemSelected && repeatWhenRef.current) {
      repeatWhenRef.current.focus();
    }
  }, [selectedId]);

  // Effect for cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  const renderReminders = () => {
    const isRemindersExist = reminders.length > 0;

    if (isRemindersExist) {
      return reminders.slice(0).reverse().map((reminder, id) => {
        const isReminderExpired = reminder.isExpired;
        const isCurrentSelected = selectedId === id;
        const isReminderSelected = selectedId !== id;

        const reminderClass = classnames(
          styles.reminder,
          isReminderExpired && styles.expired
        );

        const repeatInputClass = classnames(
          styles.repeatWhen,
          isShaking ? styles.shake : ''
        );

        const tippyTheme = getTippyTheme(darkMode);

        return (
          <div key={`reminder-${id}`} className={reminderClass}>
            <button
              type="button"
              className={styles.delete}
              onClick={() => deleteItem(id)}
            >
              <Cross />
            </button>
            {isReminderExpired && (
              <button
                type="button"
                className={styles.refresh}
                onMouseDown={(e) => toggleSelectedId(e, id)}
              >
                <Refresh />
              </button>
            )}
            <Tippy
              content={(
                <div style={{
                  padding: '1px 10px',
                  borderRadius: '5px',
                  maxWidth: '320px',
                  userSelect: 'text',
                  ...tippyTheme
                }}
                >
                  {`[${getTime(reminder.timeStamp)}] - ${reminder.message}`}
                </div>
              )}
              interactive={true}
              appendTo={document.body}
              duration={0}
              popperOptions={{
                strategy: 'fixed',
                modifiers: [
                  {
                    name: 'flip',
                    options: {
                      fallbackPlacements: ['bottom', 'right'],
                    },
                  },
                  {
                    name: 'preventOverflow',
                    options: {
                      altAxis: true,
                    },
                  },
                ]
              }}
            >
              <div className={styles.message}>
                {isReminderSelected ? (
                  <span>{reminder.message}</span>
                ) : (
                  <input
                    ref={repeatWhenRef}
                    placeholder="Когда повторить?"
                    className={repeatInputClass}
                    onBlur={handleInputBlur}
                    onKeyUp={onRepeatSubmit}
                    onChange={onRepeatChange}
                  />
                )}
              </div>
            </Tippy>
          </div>
        );
      });
    }

    return (
      <div>
        Нет активных или прошедших напоминаний
      </div>
    );
  };

  const isRemindersExist = reminders.length > 0;
  const containerClass = classnames(
    styles.remindersList,
    !isRemindersExist ? styles.noReminder : '',
    darkMode ? styles.darkMode : ''
  );

  return (
    <div className={containerClass}>
      {renderReminders()}
    </div>
  );
}

RemindersList.propTypes = {
  reminders: PropTypes.arrayOf(PropTypes.any).isRequired,
  deleteItem: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
};

export { RemindersList };
