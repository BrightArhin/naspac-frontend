import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Tooltip, message, Modal, Spin } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  PrinterOutlined,
  LogoutOutlined,
  MenuOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { useAuth } from '../AuthContext';

const { Sider } = Layout;

interface PersonnelStatus {
  submissionStatus: string | null;
  verificationRejected?: boolean;
  verificationRejectionReason?: string | null;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
   const { role, logout, userId } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false); // State for modal visibility
  const navigate = useNavigate();
  const [statusData, setStatusData] = useState<PersonnelStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false); 
   const [hasUploaded, setHasUploaded] = useState(false);
   const [appointmentLoading, setAppointmentLoading] = useState(false); 
  const [endorsedLoading, setEndorsedLoading] = useState(false);

  // Handle logout confirmation
  const handleLogout = () => {
    console.log('handleLogout triggered');
    setIsLogoutModalVisible(true); // Show the modal
  };

  const handleModalOk = () => {
    console.log('Modal confirmed, calling logout');
    logout();
    setIsLogoutModalVisible(false); // Close the modal
  };

  const handleModalCancel = () => {
    console.log('Modal cancelled');
    setIsLogoutModalVisible(false); // Close the modal
  };


  useEffect(() => {
    const fetchPersonnelStatus = async () => {

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/users/personnel-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch personnel status');
        }

        const data = await response.json();
        setStatusData({
          submissionStatus: data.submissionStatus || null,
          verificationRejected: data.verificationRejected,
          verificationRejectionReason: data.verificationRejectionReason,
        });
      } catch (err) {
        message.error('Unable to load personnel status');
        console.error(err);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchPersonnelStatus();
  }, [role, userId]);

  // Handle upload verification form
  const handleUploadVerification = () => {
    setUploadModalVisible(true);
  };

   const handleUploadConfirm = () => {
    // Trigger file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        message.error('No file selected');
        return;
      }
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        message.error('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.error('The PDF must be 10MB or smaller');
        return;
      }

      const formData = new FormData();
      formData.append('verificationForm', file);

      try {
        const response = await fetch('http://localhost:3000/users/submit-verification-form', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload verification form');
        }
        message.success('Verification form uploaded successfully');
        setUploadModalVisible(false);
        setHasUploaded(true); 
        // Refresh status
        const token = localStorage.getItem('token');
        const statusResponse = await fetch('http://localhost:3000/users/personnel-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
        if (statusResponse.ok) {
          const data = await statusResponse.json();
          setStatusData({
            submissionStatus: data.submissionStatus || null,
            verificationRejected: data.verificationRejected,
            verificationRejectionReason: data.verificationRejectionReason,
          });
        }
      } catch (err: any) {
        message.error(err.message || 'Failed to upload verification form');
        console.error(err);
      }
    };
    input.click();
  };

  // Define route mappings for menu items
  const mainRouteMap: { [key: string]: string } = {
    '1': '/',
    '2': role === 'PERSONNEL' ? '/my-details' : '/onboarding',
    '3': role === 'PERSONNEL' ? '/endorsed-posting-letter' : '/shortlist',
    '4': role === 'PERSONNEL' ? '/upload-nss-document' : role === 'ADMIN' ? '/endorsement' : '/manage-personnel',
    '5': role === 'PERSONNEL' ? '/appointment-letter' : role === 'ADMIN' ? '/manage-personnel' : '/dept-placements',
    '6': '/send-letters',
    '8': '/staff-management',
    '9': '/dept-placements',
  };

  const settingsRouteMap: { [key: string]: string } = {
  '7': '/profile',
  '8': '/notices',
};
  // Role-based menu items
  const getMenuItems = () => {
    if (role === 'ADMIN') {
      return [
        { key: '1', icon: <DashboardOutlined className="sidebar-icon" />, label: 'Dashboard' },
        { key: '2', icon: <UserOutlined className="sidebar-icon" />, label: 'Onboard Personnel', disabled: false },
        {
          key: '3',
          icon: <img src="/select-personnel.svg" alt="Personnel Selection" className="sidebar-icon" />,
          label: 'Shortlist Personnel',
        },
        {
          key: '4',
          icon: <img src="/endorse.svg" alt="Endorsement" className="sidebar-icon" />,
          label: 'Endorsement',
        },
             {
        key: '6',
        icon: <SendOutlined className="sidebar-icon" />,
        label: 'Send Appt. Letters',
      },
        {
          key: '5',
          icon: <img src="/manage.svg" alt="Manage Personnel" className="sidebar-icon" />,
          label: 'Manage Personnel',
        },
          {
          key: '8',
          icon: <img src="/admin.svg" alt="Staff Management" className="sidebar-icon" />,
          label: 'Staff Management',
        },
        {
          key: '9',
          icon: <img src="/bank.svg" alt="Dept. Placements" className="sidebar-icon" />,
          label: 'Dept. Placements',
        },
      ];
    } else if (role === 'STAFF') {
      return [
        { key: '1', icon: <DashboardOutlined className="sidebar-icon" />, label: 'Dashboard' },
        { key: '2', icon: <UserOutlined className="sidebar-icon" />, label: 'Onboard NSP' },
        {
          key: '3',
          icon: <img src="/select-personnel.svg" alt="Shortlist NSP" className="sidebar-icon" />,
          label: 'Shortlist NSP',
        },
      {
          key: '4',
          icon: <img src="/manage.svg" alt="Manage Personnel" className="sidebar-icon" />,
          label: 'Manage Personnel',
        },
        {
          key: '5',
          icon: <img src="/bank.svg" alt="Dept Placement" className="sidebar-icon" />,
          label: 'Dept Placement',
        },
        //   {
        //   key: '7', // Profile item
        //   icon: <UserOutlined className="sidebar-icon" />,
        //   label: 'Profile',
        // },
      ];
    }
    // Personnel menu
    return [
      {
        key: '1',
        icon: <DashboardOutlined className="sidebar-icon" />,
        label: 'Dashboard',
        disabled: statusLoading || !statusData?.submissionStatus,
      },
      {
        key: '3',
        icon: <PrinterOutlined className="sidebar-icon" />,
        label: (
            <span className="flex items-center">
              {endorsedLoading && <Spin size="small" className="mr-2" />}
              Endorsed Letter
            </span>
          ),
        disabled: statusLoading || statusData?.submissionStatus !== 'ENDORSED',
      },
      {
        key: '4',
        icon: <PrinterOutlined className="sidebar-icon" />,
         label: hasUploaded ? 'Verification Uploaded' : 'Upload Verification',
        disabled: statusLoading || statusData?.submissionStatus !== 'ENDORSED' || hasUploaded,
      },
      {
        key: '5',
        icon: <PrinterOutlined className="sidebar-icon" />,
       label: (
            <span className="flex items-center">
              {appointmentLoading && <Spin size="small" className="mr-2" />}
              Appointment Letter
            </span>
          ),
        disabled: statusLoading || !['VALIDATED', 'COMPLETED'].includes(statusData?.submissionStatus ?? ''),
      },
    ];
  };

  // Settings menu (same for all roles)
  const settingsItems = [
    { key: '7', icon: <UserOutlined className="sidebar-icon" />, label: 'Profile' },
    // { key: '7', icon: <BellOutlined className="sidebar-icon" />, label: 'Notices' },
  ];

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleCollapse = () => {
    if (isMobile) {
      onMobileClose?.();
      return;
    }
    setCollapsed(!collapsed);
  };

  const handleMenuClick = async ({ key }: { key: string }) => {
    onMobileClose?.();
    if (role === 'PERSONNEL' && key === '3') {
      // Handle download for Endorsed Posting Letter
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/documents/personnel/download-appointment-letter?type=endorsed', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/pdf',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to download endorsed posting letter');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'endorsed-appointment-letter.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        message.success('Endorsed posting letter downloaded successfully');
      } catch (err) {
        message.error('Failed to download endorsed posting letter');
        console.error(err);
      } finally {
        setEndorsedLoading(false);
      }
    } else if (role === 'PERSONNEL' && key === '4') {
      handleUploadVerification(); // Handle upload verification
    } else if (role === 'PERSONNEL' && key === '5') {
      // Handle download for Appointment Letter
      setAppointmentLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/documents/personnel/download-appointment-letter?type=job_confirmation', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/pdf',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to download appointment letter');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'job-confirmation-letter.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        message.success('Appointment letter downloaded successfully');
      } catch (err) {
        message.error('Failed to download appointment letter');
        console.error(err);
      } finally {
        setAppointmentLoading(false);
      }
    } else {
      // Handle navigation for other menu items
      const path = mainRouteMap[key] || settingsRouteMap[key];
      if (path) {
        navigate(path);
      }
    }
  };

  return (
    <Sider
      width={240}
      collapsedWidth={80}
      collapsible
      collapsed={isMobile ? false : collapsed}
      trigger={null}
      className={`sidebar-container bg-[#5b3418] rounded-tr-[25px] overflow-hidden z-40 ${mobileOpen ? 'mobile-open' : ''}`}
      breakpoint="lg"
      onBreakpoint={(broken) => setCollapsed(broken)}
    >
      <header className="flex justify-between items-center pt-4 px-4">
        {(!collapsed || isMobile) && (
          <h1 className="font-medium text-white text-xl sm:text-2xl">
            NASPAC
          </h1>
        )}
        <Button
          type="text"
          icon={<MenuOutlined className="text-lg" style={{ color: '#FFFFFF' }} />}
          onClick={toggleCollapse}
          className="text-white"
        />
      </header>

      <Menu
        mode="inline"
        defaultSelectedKeys={['1']}
        onClick={handleMenuClick}
        items={getMenuItems().map((item) => ({
          key: item.key,
          icon: item.icon,
          label: (
            <Tooltip title={!isMobile && collapsed ? item.label : ''} placement="right">
              <span className="font-medium text-white text-sm truncate">
                {item.label}
              </span>
            </Tooltip>
          ),
          disabled: item.disabled,
        }))}
        className="bg-transparent border-0 nav-menu"
      />

      <Menu
        mode="inline"
        onClick={handleMenuClick}
        items={settingsItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: (
            <Tooltip title={!isMobile && collapsed ? item.label : ''} placement="right">
              <span className="font-medium text-white text-sm truncate">
                {item.label}
              </span>
            </Tooltip>
          ),
        }))}
        className="bg-transparent border-0 settings-menu"
      />
<Button
        type="default"
        onClick={handleLogout}
        className="flex items-center gap-2 sm:gap-3 logout-button px-4 py-2 rounded-[5px] border-[#a9a7a7] text-white bg-transparent hover:bg-[#6b3e1d] hover:text-white hover:border-[#a9a7a7]"
      >
        <LogoutOutlined className="sidebar-icon" />
        {(!collapsed || isMobile) && (
          <span className="font-medium text-sm truncate">Logout</span>
        )}
      </Button>
      <Modal
        title="Confirm Logout"
        open={isLogoutModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Logout"
        cancelText="Cancel"
        okButtonProps={{ danger: true,
    style: { 
        backgroundColor: '#dc2626',
        border: 'none'
    } 
}}
        cancelButtonProps={{ className: 'text-white !border-0 !bg-gray-600' }}
        zIndex={10000}
      >
        <p>Are you sure you want to log out?</p>
      </Modal>
        <Modal
        title="Upload Verification Form"
        open={uploadModalVisible}
        onOk={handleUploadConfirm}
        onCancel={() => setUploadModalVisible(false)}
        okText="Continue"
        cancelText="Cancel"
        okButtonProps={{ className: '!bg-[#5B3418] !border-0' }}
        cancelButtonProps={{ className: '!bg-[#c95757] !border-0' }}
        centered
        className="modern-modal"
      >
        {statusData?.verificationRejected && (
          <p className="mb-2">Your last verification form was not accepted: {statusData.verificationRejectionReason}</p>
        )}
        <p>Please upload your verification form. The file must be a <strong>PDF</strong> no larger than 10MB.</p>
        <p>Are you sure you want to proceed?</p>
      </Modal>
    </Sider>
  );
};

export default Sidebar;