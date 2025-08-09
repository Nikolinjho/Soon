import React from 'react';
import classnames from 'classnames';
import { AddReminder } from '../AddReminder';
import RemindersList from '../RemindersList';
import { getRenderer, isElectron } from '../../utils/get-renderer';

import Back from '../../assets/icons/back.svg';
import MoreIcon from '../../assets/icons/more.svg';

import styles from './styles.module.css';

const ipcRenderer = getRenderer();

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      showList: false,
      darkMode: false,
      /**
       * @type {{ id: number, message: string, isExpired: boolean, timeStamp: string }[]}
       */
      reminders: [],
    };
  }

  componentDidMount() {
    if (!isElectron()) {
      // Browser environment - add some mock data for development
      this.updateList([
        { id: 1, message: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. ', isExpired: false },
        { id: 2, message: 'Sample reminder 2', isExpired: true },
      ]);
      return;
    }

    ipcRenderer.on('NOTIFICATION_ADDED', (event, args) => {
      this.updateList(args);
    });

    ipcRenderer.on('EXISTING_NOTIFICATIONS', (event, args) => {
      this.updateList(args);
    });

    ipcRenderer.on('NOTIFICATION_EXPIRED', (event, args) => {
      this.updateList(args);
    });

    ipcRenderer.on('DARK_MODE', (event, args) => {
      this.setState({ darkMode: args });
    });

    ipcRenderer.on('WINDOW_VISIBLE', this.onWindowVisible);
  }

  componentWillUnmount() {
    if (!isElectron()) return;

    ipcRenderer.removeListener('NOTIFICATION_ADDED', (event, args) => {
      this.updateList(args);
    });

    ipcRenderer.removeListener('EXISTING_NOTIFICATIONS', (event, args) => {
      this.updateList(args);
    });

    ipcRenderer.removeListener('NOTIFICATION_EXPIRED', (event, args) => {
      this.updateList(args);
    });

    ipcRenderer.removeListener('DARK_MODE', (event, args) => {
      this.setState({ darkMode: args });
    });

    ipcRenderer.removeListener('WINDOW_VISIBLE', this.onWindowVisible);
  }

  onWindowVisible = () => {
    this.setState({ showList: false });
  }

  updateList = (reminders) => {
    this.setState({
      reminders
    });
  }

  toggleList = () => {
    this.setState(prevState => ({
      showList: !prevState.showList
    }));
  }

    deleteItem = (id) => {
    const { reminders } = this.state;

    if (!isElectron()) {
      // Browser environment - just remove from local state
      if (id === 'all') {
        this.setState({ reminders: [] });
      } else if (id === 'expired') {
        this.setState({ reminders: reminders.filter(item => !item.isExpired) });
      } else {
        const newReminders = reminders.filter((_, index) => index !== reminders.length - 1 - id);
        this.setState({ reminders: newReminders });
      }
      return;
    }

    if (id === 'all' || id === 'expired') {
      ipcRenderer.send('DELETE_ITEM', id);
    } else {
      ipcRenderer.send('DELETE_ITEM', reminders.length - 1 - id);
    }
  }

  getNumberOfReminders = (type) => {
    const { reminders } = this.state;
    if (type === 'all') {
      return reminders.length;
    }
    return reminders.filter(item => item.isExpired === true).length;
  }

  render() {
    const { showList, reminders, darkMode } = this.state;

    if (darkMode) {
      document.getElementById('arrow').classList.add('darkMode');
    } else {
      document.getElementById('arrow').classList.remove('darkMode');
    }

    return (
      <div className={classnames(
        styles.app,
        darkMode ? styles.darkMode : ''
      )}
      >
        {
          showList
            ? (
              <RemindersList
                reminders={reminders}
                deleteItem={this.deleteItem}
                darkMode={darkMode}
              />
            )
            : <AddReminder darkMode={darkMode} />
        }
        {
          showList
            ? (
              <>
                <Back
                  className={classnames(
                    styles.toggleButton,
                    darkMode ? styles.darkMode : ''
                  )}
                  onClick={this.toggleList}
                />
                {!!reminders.length && (
                <div className={styles.removeButtonsWrapper}>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => this.deleteItem('all')}
                  >
                    {`Удалить все ( ${this.getNumberOfReminders('all')} )`}
                  </button>
                  <button
                    type="button"
                    className={classnames(
                      styles.removeButton,
                      !this.getNumberOfReminders('expired') && styles.inActive
                    )}
                    onClick={() => this.deleteItem('expired')}
                  >
                    {`Удал. истекшие ( ${this.getNumberOfReminders('expired')} )`}
                  </button>
                </div>
                )}
              </>
            )
            : (
              <MoreIcon
                className={classnames(
                  styles.toggleButton,
                  darkMode ? styles.darkMode : ''
                )}
                onClick={this.toggleList}
              />
            )
        }
      </div>
    );
  }
}

export default App;
