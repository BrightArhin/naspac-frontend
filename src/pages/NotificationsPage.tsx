import React from 'react';
import Notifications from '../components/Notifications';

const NotificationsPage: React.FC = () => {
  return (
    <div className="h-full">
      <Notifications displayMode="full" />
    </div>
  );
};

export default NotificationsPage;