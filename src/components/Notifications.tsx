import React, { useEffect, useState } from 'react';
import { Avatar, Typography, message, Spin, Card } from 'antd';
import { BellFilled, UserOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface Notification {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  iconType: 'BELL' | 'USER' | 'SETTING';
  role: 'ADMIN' | 'STAFF' | 'PERSONNEL';
  userId?: number;
}

interface NotificationsProps {
  maxDisplay?: number;
  onNotificationsViewed?: (newBadgeCount: number) => void;
  onNotificationsFetched?: (badgeCount: number) => void;
  displayMode?: 'dropdown' | 'homepage' | 'full'; // prop to control display
}

const Notifications: React.FC<NotificationsProps> = ({
  maxDisplay = 3,
  onNotificationsViewed,
  onNotificationsFetched,
  displayMode = 'dropdown', // Default to dropdown
}) => {
  const { role, userId } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('http://localhost:3000/documents/notifications', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const oneMonthAgo = moment().subtract(1, 'month');
       const filteredNotifications = response.data.filter((notification: Notification) =>
        (notification.role === role || (notification.userId === userId && notification.role === role)) &&
        moment(notification.timestamp).isAfter(oneMonthAgo)
      );
        setNotifications(filteredNotifications);

        const viewedIds = JSON.parse(localStorage.getItem(`viewedNotifications_${userId}`) || '[]');
      const validViewedIds = viewedIds.filter((id: number) =>
        filteredNotifications.some((n: Notification) => n.id === id)
      );
      localStorage.setItem(`viewedNotifications_${userId}`, JSON.stringify(validViewedIds));

      const badgeCount = filteredNotifications.filter((n: Notification) => !validViewedIds.includes(n.id)).length;
      if (onNotificationsFetched) {
        onNotificationsFetched(badgeCount);
      }
      setLoading(false);
      } catch (error) {
        message.error('Failed to fetch notifications');
        setLoading(false);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [role, userId, onNotificationsFetched]);

  const getIconForType = (iconType: string) => {
    switch (iconType) {
      case 'BELL':
        return <BellFilled style={{ color: '#1890ff' }} />;
      case 'USER':
        return <UserOutlined style={{ color: '#f5222d' }} />;
      case 'SETTING':
        return <SettingOutlined style={{ color: '#52c41a' }} />;
      default:
        return <BellFilled style={{ color: '#1890ff' }} />;
    }
  };

  const getAvatarStyle = (iconType: string) => {
    switch (iconType) {
      case 'BELL':
        return { backgroundColor: '#e6f7ff' };
      case 'USER':
        return { backgroundColor: '#fff1f0' };
      case 'SETTING':
        return { backgroundColor: '#f6ffed' };
      default:
        return { backgroundColor: '#e6f7ff' };
    }
  };

  const handleNotificationsViewed = () => {
    const viewedIds = notifications.map((n) => n.id);
    localStorage.setItem(`viewedNotifications_${userId}`, JSON.stringify(viewedIds));
    if (onNotificationsViewed) {
      onNotificationsViewed(0);
    }
  };

  // Common notification list rendering
  const renderNotifications = (sliceCount?: number) => (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center">
          <Spin size="large" />
        </div>
      ) : notifications.length === 0 ? (
        <Text type="secondary" className="text-sm block">
          No notifications available.
        </Text>
      ) : (
        notifications.slice(0, sliceCount || notifications.length).map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-3 p-3 hover:bg-gray-50 rounded-md transition ${
              displayMode === 'dropdown' ? 'p-2' : 'p-3'
            }`}
          >
            <Avatar
              size={displayMode === 'dropdown' ? 32 : 40}
              style={getAvatarStyle(notification.iconType)}
              icon={getIconForType(notification.iconType)}
            />
            <div className={displayMode === 'dropdown' ? '' : 'flex-1'}>
              <Text className={displayMode === 'dropdown' ? 'text-sm' : 'text-base'} strong>
                {notification.title}
              </Text>
              <Text type="secondary" className={displayMode === 'dropdown' ? 'text-xs block' : 'text-sm block'}>
                {notification.description}
              </Text>
              <Text type="secondary" className="text-xs">
                {moment(notification.timestamp).fromNow()}
              </Text>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Render based on displayMode
  if (displayMode === 'dropdown') {
    return (
      <div className={`w-[min(22rem,calc(100vw-1.5rem))] bg-white shadow-lg rounded-lg p-4 ${maxDisplay ? 'max-h-96 overflow-y-auto' : ''}`}>
        <div className="mb-3">
          <Text strong>Notifications</Text>
        </div>
        {renderNotifications(maxDisplay)}
        <div className="mt-3 text-center">
          <Text
            type="secondary"
            className="text-xs cursor-pointer hover:text-blue-500"
            onClick={() => {
              handleNotificationsViewed();
              navigate('/notifications');
            }}
          >
            View all notifications
          </Text>
        </div>
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#3C3939] mb-4">
        {role === 'PERSONNEL' ? 'Notifications' : 'Recent Activity'}
      </h3>
      <Card
        className="rounded-lg shadow-lg bg-white bg-[url('/background-pattern.svg')] bg-cover bg-center bg-no-repeat bg-opacity-10"
        bodyStyle={{ padding: '24px' }}
      >
        {renderNotifications(displayMode === 'homepage' ? maxDisplay : undefined)}
        {displayMode === 'homepage' && (
          <div className="mt-4 text-center">
            <Text
              type="secondary"
              className="text-sm cursor-pointer hover:text-blue-500"
              onClick={() => {
                handleNotificationsViewed();
                navigate('/notifications');
              }}
            >
              View all notifications
            </Text>
          </div>
        )}
      </Card>
    </section>
  );
};

export default Notifications;