import React, { useState } from 'react';
import { BellFilled, UserOutlined, LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { Badge, Dropdown, Menu, Avatar, Typography } from 'antd';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import Notifications from './Notifications';

const { Text } = Typography;

const Header: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const { name, email, role, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [badgeCount, setBadgeCount] = useState(0);

  // Handle logout action
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
    }
  };

  // Profile Dropdown Content
  const profileMenu = (
    <div className="w-64 max-w-[90vw] bg-white shadow-lg rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <Avatar size={40} icon={<UserOutlined />} />
        <div>
          <Text strong className="text-sm">
            {isLoading ? 'Loading...' : name || 'User'}
          </Text>
          <Text type="secondary" className="text-xs block">
            {isLoading ? 'Loading...' : email || ''}
          </Text>
          <Text type="secondary" className="text-xs capitalize">
            {isLoading ? 'Loading...' : role || 'Guest'}
          </Text>
        </div>
      </div>
      <Menu selectable={false}>
        <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Menu.Item>
      </Menu>
    </div>
  );

  return (
    <header className="sticky top-0 z-20 shrink-0 bg-white shadow-md text-stone-600 font-semibold">
      <div className="flex justify-between items-center px-3 sm:px-6 lg:px-8 py-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="md:hidden inline-flex items-center justify-center rounded p-2 text-[#5b3418] hover:bg-gray-100"
        >
          <MenuOutlined className="text-lg" />
        </button>

        {/* Right Side: Profile, Name, Notifications */}
        <div className="ml-auto flex items-center gap-3 sm:gap-5 lg:gap-7">
          {/* Profile Icon and User Name */}
          <Dropdown overlay={profileMenu} trigger={['click']} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
              <UserOutlined className="text-base sm:text-lg" />
              <span className="hidden sm:inline text-sm">
                {isLoading ? 'Loading...' : name || 'User'}
              </span>
            </div>
          </Dropdown>

          {/* Notification Bell with Badge */}
         <Dropdown
            overlay={<Notifications displayMode="dropdown" maxDisplay={5} onNotificationsViewed={() => setBadgeCount(0)} onNotificationsFetched={(count) => setBadgeCount(Math.min(count, 5))} />}
            trigger={['click']}
            placement="bottomRight"
            onOpenChange={(open) => open && setBadgeCount(0)} // Clear badge count when dropdown opens
          >
            <div className="cursor-pointer hover:bg-gray-100 p-1 rounded">
              <Badge
                count={badgeCount}
                offset={[0, 0]}
                className="flex items-center"
                style={{
                  fontSize: '10px',
                  height: '16px',
                  minWidth: '16px',
                  lineHeight: '16px',
                  padding: '0 4px',
                  backgroundColor: '#ff4d4f',
                  color: '#fff',
                }}
              >
                <BellFilled className="text-base sm:text-lg" />
              </Badge>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default Header;