import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';

const API_BASE_URL = 'http://192.168.9.45:7000';

const Header = ({
  onMenuPress,
  onNotificationPress,
  unreadCount,
  avatarText = 'AM',
  onLogout,
  userData,
}) => {
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [logoutLoading, setLogoutLoading] = React.useState(false);

  const getUserId = () => {
    return userData?.userId || userData?.id || userData?.UserId || 0;
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);

      const userId = getUserId();

      const response = await fetch(
        `${API_BASE_URL}/api/Auth/logout?userId=${userId}`,
        {
          method: 'POST',
          headers: {
            accept: '*/*',
          },
        },
      );

      const result = await response.text();

      console.log('Logout API Status:', response.status);
      console.log('Logout API Response:', result);

      setShowLogoutModal(false);

      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.log('Logout Error:', error);

      setShowLogoutModal(false);

      if (onLogout) {
        onLogout();
      }
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notifIcon}
            onPress={onNotificationPress}>
            <Text style={styles.notifIconText}>🔔</Text>

            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setShowLogoutModal(true)}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!logoutLoading) {
              setShowLogoutModal(false);
            }
          }}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>

            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                disabled={logoutLoading}
                onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                disabled={logoutLoading}
                onPress={handleLogout}>
                {logoutLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.logoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#12141c',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuButton: {padding: 8},
  menuIcon: {fontSize: 22, color: '#f1f5f9'},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 12},
  notifIcon: {padding: 8, position: 'relative'},
  notifIconText: {fontSize: 20},
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ec4899',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {color: 'white', fontSize: 9, fontWeight: 'bold'},
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {color: 'white', fontWeight: '600', fontSize: 14},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#12141c',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1e293b',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ec4899',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default Header;