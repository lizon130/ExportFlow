// src/components/layout/Sidebar.js
// Fixed Sidebar.js
// Fixes: Objects are not valid as a React child
// Supports roles as strings or objects: {recId, roleName}

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.9.45:7000';

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

  const getUserId = useCallback(() => {
    return (
      userData?.userId ||
      userData?.id ||
      userData?.UserId ||
      userData?.ID ||
      profile?.userId ||
      profile?.recId ||
      0
    );
  }, [userData, profile]);

  const normalizeRole = role => {
    if (!role) {
      return '';
    }

    if (typeof role === 'string') {
      return role;
    }

    return role.roleName || role.name || role.title || '';
  };

  const normalizeDepartment = department => {
    if (!department) {
      return '';
    }

    if (typeof department === 'string') {
      return department;
    }

    return (
      department.departmentName ||
      department.departmentCode ||
      department.name ||
      department.code ||
      ''
    );
  };

  const normalizeBuyer = buyer => {
    if (!buyer) {
      return '';
    }

    if (typeof buyer === 'string') {
      return buyer;
    }

    return buyer.buyerName || buyer.buyerCode || buyer.name || buyer.code || '';
  };

  const getRoleNames = currentProfile => {
    if (!Array.isArray(currentProfile?.roles)) {
      return [];
    }

    return currentProfile.roles.map(normalizeRole).filter(Boolean);
  };

  const getDepartmentNames = currentProfile => {
    if (!Array.isArray(currentProfile?.departments)) {
      return [];
    }

    return currentProfile.departments.map(normalizeDepartment).filter(Boolean);
  };

  const getBuyerNames = currentProfile => {
    if (!Array.isArray(currentProfile?.buyers)) {
      return [];
    }

    return currentProfile.buyers.map(normalizeBuyer).filter(Boolean);
  };

  const fetchUserProfile = useCallback(async () => {
    const userId =
      userData?.userId ||
      userData?.id ||
      userData?.UserId ||
      userData?.ID ||
      0;

    if (!userId) {
      setError('User ID not found. Please login again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/User/${userId}/profile`;

      console.log('Fetching profile from:', url);

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      const response = await axios({
        method: 'get',
        url,
        headers,
        timeout: 10000,
      });

      console.log('Profile API Response Success:', response.status);
      console.log('Profile data:', response.data);

      setProfile(response.data);
    } catch (fetchError) {
      console.error('Error fetching profile:', fetchError);

      if (fetchError.response) {
        if (fetchError.response.status === 401) {
          setError('Session expired. Please login again.');
        } else if (fetchError.response.status === 404) {
          setError(`Profile not found for user ID: ${userId}`);
        } else {
          setError(`Server error: ${fetchError.response.status}`);
        }
      } else if (fetchError.request) {
        setError(
          `Cannot connect to server at ${API_BASE_URL}\n\nPlease check:\n• Server is running\n• Device is on same network\n• No firewall blocking`,
        );
      } else {
        setError(`Error: ${fetchError.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (visible) {
      fetchUserProfile();
    }
  }, [visible, fetchUserProfile]);

  const getUserInitial = () => {
    const name =
      profile?.userName ||
      profile?.name ||
      userData?.userName ||
      userData?.username ||
      '';

    if (name) {
      return String(name).charAt(0).toUpperCase();
    }

    const userId = getUserId();

    if (userId) {
      return String(userId).charAt(0);
    }

    return '👤';
  };

  const getDisplayName = () => {
    return (
      profile?.userName ||
      profile?.name ||
      userData?.userName ||
      userData?.username ||
      `User ${getUserId() || ''}`
    );
  };

  const getEmail = () => {
    return profile?.email || userData?.email || 'user@example.com';
  };

  const shouldHideDepartmentsAndBuyers = () => {
    const roleNames = getRoleNames(profile).map(role =>
      String(role).toLowerCase().replace(/[-_\s]/g, ''),
    );

    const restrictedRoles = ['superadmin', 'admin'];

    return roleNames.some(role => restrictedRoles.includes(role));
  };

  const roleNames = getRoleNames(profile);
  const departmentNames = getDepartmentNames(profile);
  const buyerNames = getBuyerNames(profile);
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

                  {roleNames.length > 0 && (
                    <View style={styles.rolesContainer}>
                      {roleNames.map((roleName, index) => (
                        <View
                          key={`${roleName}-${index}`}
                          style={styles.roleBadge}>
                          <Text style={styles.roleText}>{roleName}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {!hideDepartmentsAndBuyers && departmentNames.length > 0 && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Departments:</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>
                        {departmentNames.join(', ')}
                      </Text>
                    </View>
                  )}

                  {!hideDepartmentsAndBuyers && buyerNames.length > 0 && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Buyers:</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>
                        {buyerNames.join(', ')}
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
