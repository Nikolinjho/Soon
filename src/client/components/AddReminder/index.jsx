import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getRenderer, isElectron } from '../../utils/get-renderer';

import styles from './styles.module.css';

const ipcRenderer = getRenderer();

class AddReminder extends React.Component {
  constructor() {
    super();
    this.state = {
      message: '',
      time: '',
      statusMessage: '',
      shake: false
    };

    this.messageInputRef = React.createRef();
    this.timeInputRef = React.createRef();
    this.statusMessageTimeout = null;
    this.shakeTimeout = null;
  }

  componentDidMount() {
    if (!isElectron()) {
      // Browser environment - just focus the input
      this.messageInputRef.current.focus();
      return;
    }

    ipcRenderer.on('NOTIFICATION_ADDED', this.notificationAdded);
    ipcRenderer.on('NOTIFICATION_FAILED', this.notificationFailed);
    ipcRenderer.on('WINDOW_VISIBLE', this.onWindowVisible);
    this.messageInputRef.current.focus();
  }

    componentWillUnmount() {
    clearTimeout(this.statusMessageTimeout);
    clearTimeout(this.shakeTimeout);

    if (!isElectron()) return;

    ipcRenderer.removeListener('NOTIFICATION_ADDED', this.notificationAdded);
    ipcRenderer.removeListener('NOTIFICATION_FAILED', this.notificationFailed);
    ipcRenderer.removeListener('WINDOW_VISIBLE', this.onWindowVisible);
  }

  onWindowVisible = () => {
    this.messageInputRef.current.focus();
  }

  notificationAdded = () => {
    this.messageInputRef.current.value = '';
    this.timeInputRef.current.value = '';

    this.setState({
      statusMessage: 'Reminder added',
      message: '',
      time: ''
    });

    this.clearMessage();
    this.messageInputRef.current.focus();
  }

  notificationFailed = () => {
    if (!this.shakeTimeout) {
      this.setState({
        shake: true,
      }, this.clearShake());
    }
  }

  clearMessage = () => {
    this.statusMessageTimeout = setTimeout(() => {
      this.setState({
        statusMessage: ''
      });
      this.statusMessageTimeout = null;
    }, 2500);
  }

  clearShake = () => {
    this.shakeTimeout = setTimeout(() => {
      this.setState({
        shake: false,
      });
      this.shakeTimeout = null;
    }, 500);
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;

    this.setState({
      [name]: value
    });
  }

  focusNextField = (e) => {
    if (e.keyCode === 13 && this.messageInputRef.current.value.length) {
      this.timeInputRef.current.focus();
    }
  }

  addNotification = (e) => {
    if (e.keyCode === 13 && this.timeInputRef.current.value.length) {
      const { message, time } = this.state;

      if (!isElectron()) {
        // Browser environment - just show a success message
        this.notificationAdded();
        return;
      }

      ipcRenderer.send('ADD_REMINDER', {
        message,
        time,
      });
    }
  }

  render() {
    const { statusMessage, shake } = this.state;
    const { darkMode } = this.props;

    return (
      <div className={classnames(
        styles.addReminder,
        darkMode ? styles.darkMode : ''
      )}
      >
        <input
          ref={this.messageInputRef}
          name="message"
          onChange={this.handleInputChange}
          onKeyUp={this.focusNextField}
          placeholder="Что напомнить?"
          maxLength={150}
        />
        <div className={styles.separator} />
        <input
          ref={this.timeInputRef}
          className={classnames(
            styles.timeInput,
            shake ? styles.shake : ''
          )}
          name="time"
          onChange={this.handleInputChange}
          onKeyUp={this.addNotification}
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
}

AddReminder.propTypes = {
  darkMode: PropTypes.bool.isRequired
};

export default AddReminder;
