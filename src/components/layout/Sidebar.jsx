// src/components/layout/Sidebar.js
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import axios from 'axios';

const Sidebar = ({visible, onClose, activeTab, onTabSelect, userData}) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const menuItems = [
    {id: 'dashboard', icon: '📊', label: 'Dashboard'},
    {id: 'exportDoc', icon: '📄', label: 'Export Documents'},
    {id: 'blDates', icon: '🚢', label: 'B/L Date Check'},
    {id: 'shipping', icon: '🚚', label: 'Shipping'},
    {id: 'bankSubmit', icon: '🏦', label: 'Bank Submit'},
    {id: 'realization', icon: '💰', label: 'Realization'},
  ];

  // API Base URL - Update this to match your server
  const API_BASE_URL = 'http://192.168.9.45:7000';

  // Fetch user profile when sidebar opens
  useEffect(() => {
    if (visible && userData?.userId && userData?.accessToken) {
      console.log(
        'Sidebar opened - Fetching profile for userId:',
        userData.userId,
      );
      fetchUserProfile();
    }
  }, [visible, userData]);

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the actual userId from login (which is 4, not 2)
      const url = `${API_BASE_URL}/api/User/${userData.userId}/profile`;
      console.log('Fetching profile from:', url);
      console.log(
        'Using token:',
        userData.accessToken?.substring(0, 50) + '...',
      );

      const response = await axios({
        method: 'get',
        url: url,
        headers: {
          Authorization: `Bearer ${userData.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      console.log('Profile API Response Success:', response.status);
      console.log('Profile data:', response.data);
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);

        if (error.response.status === 401) {
          setError('Session expired. Please login again.');
        } else if (error.response.status === 404) {
          setError(`Profile not found for user ID: ${userData.userId}`);
        } else {
          setError(`Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        console.error('No response from server:', error.request);
        setError(
          `Cannot connect to server at ${API_BASE_URL}\n\nPlease check:\n• Server is running\n• Device is on same network\n• No firewall blocking`,
        );
      } else {
        setError(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [userData.userId, userData.accessToken]);

  // Get user initial for avatar
  const getUserInitial = () => {
    if (profile?.userName) {
      return profile.userName.charAt(0).toUpperCase();
    }
    if (userData?.userId) {
      return userData.userId.charAt(0);
    }
    return '👤';
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.userName) {
      return profile.userName;
    }
    if (userData?.userId) {
      return `User ${userData.userId}`;
    }
    return 'User';
  };

  // Get email
  const getEmail = () => {
    if (profile?.email) {
      return profile.email;
    }
    return 'user@example.com';
  };

  // Check if user is SuperAdmin or Admin
  const shouldHideDepartmentsAndBuyers = () => {
    if (!profile?.roles || profile.roles.length === 0) {
      return false;
    }
    const restrictedRoles = ['SuperAdmin', 'Admin'];
    return profile.roles.some(role => restrictedRoles.includes(role));
  };

  const hideDepartmentsAndBuyers = shouldHideDepartmentsAndBuyers();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarLogo}>
              <View style={styles.sidebarLogoIcon}>
                <Text style={styles.sidebarLogoIconText}>📈</Text>
              </View>
              <Text style={styles.sidebarLogoText}>ExportFlow</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* User Profile Section */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{getUserInitial()}</Text>
            </View>
            <View style={styles.userDetails}>
              {loading ? (
                <View style={styles.profileLoadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.profileLoadingText}>
                    Loading profile...
                  </Text>
                </View>
              ) : error ? (
                <>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchUserProfile}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : profile ? (
                <>
                  <Text style={styles.userName}>
                    Welcome {getDisplayName()}!
                  </Text>
                  <Text style={styles.userEmail}>{getEmail()}</Text>

                  {/* Roles */}
                  {profile.roles && profile.roles.length > 0 && (
                    <View style={styles.rolesContainer}>
                      {profile.roles.map((role, index) => (
                        <View key={index} style={styles.roleBadge}>
                          <Text style={styles.roleText}>{role}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Departments - Hidden for SuperAdmin and Admin */}
                  {!hideDepartmentsAndBuyers &&
                    profile.departments &&
                    profile.departments.length > 0 && (
                      <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Departments:</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>
                          {profile.departments.join(', ')}
                        </Text>
                      </View>
                    )}

                  {/* Buyers - Hidden for SuperAdmin and Admin */}
                  {!hideDepartmentsAndBuyers &&
                    profile.buyers &&
                    profile.buyers.length > 0 && (
                      <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Buyers:</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>
                          {profile.buyers.join(', ')}
                        </Text>
                      </View>
                    )}
                </>
              ) : (
                <Text style={styles.noDataText}>No profile data available</Text>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.navContainer}
            showsVerticalScrollIndicator={false}>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.navItem,
                  activeTab === item.id && styles.navItemActive,
                ]}
                onPress={() => {
                  onTabSelect(item.id);
                  onClose();
                }}>
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.navText,
                    activeTab === item.id && styles.navTextActive,
                  ]}>
                  {item.label}
                </Text>
                {activeTab === item.id && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.footerItem}>
              <Text style={styles.footerIcon}>⚙️</Text>
              <Text style={styles.footerText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerItem}>
              <Text style={styles.footerIcon}>❓</Text>
              <Text style={styles.footerText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sidebar: {
    width: '75%',
    maxWidth: 280,
    height: '100%',
    backgroundColor: '#12141c',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarLogoIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarLogoIconText: {
    fontSize: 18,
  },
  sidebarLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 20,
    color: '#f1f5f9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  profileLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileLoadingText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#3b82f6',
  },
  roleText: {
    fontSize: 9,
    color: '#3b82f6',
    fontWeight: '500',
  },
  infoSection: {
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  navContainer: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    gap: 12,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#1e293b',
  },
  navIcon: {
    fontSize: 20,
    width: 28,
  },
  navText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    flex: 1,
  },
  navTextActive: {
    color: '#3b82f6',
  },
  activeIndicator: {
    width: 3,
    height: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    position: 'absolute',
    right: 0,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  footerIcon: {
    fontSize: 18,
    width: 28,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});

export default Sidebar;
