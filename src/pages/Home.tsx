import React, { useEffect, useState } from 'react';
import { Card, Typography, message, Select, Spin, Progress, Alert } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notifications from '../components/Notifications';

const { Title, Text } = Typography;
const { Option } = Select;

interface PersonnelStatus {
  submissionStatus: string | null;
  completionPercentage: number;
  serviceDays: number;
  uploadRejected?: boolean;
  uploadRejectionReason?: string | null;
  verificationRejected?: boolean;
  verificationRejectionReason?: string | null;
}

interface Department {
  departmentId: number;
  departmentName: string;
  personnelCount: number;
}

interface ReportCounts {
  totalPersonnel: number;
  totalNonPersonnel: number;
  totalDepartments: number;
  statusCounts: {
    // pending: number;
    pendingEndorsement: number;
    endorsed: number;
    validated: number;
    completed: number;
    rejected: number;
  };
  acceptedCount: number;
  personnelByDepartment: Department[];
  onboardedStudentCount: number;
  pendingCount: number;
}

const Home: React.FC = () => {
  const { role, name, isLoading: authLoading, userId } = useAuth();
   const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<PersonnelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

   useEffect(() => {
    const hasReloaded = sessionStorage.getItem("reloaded");

    if (!hasReloaded) {
      sessionStorage.setItem("reloaded", "true");
      window.location.reload();
    }
  }, []);

  // Fetch report counts from the endpoint
  useEffect(() => {
    const fetchReportCounts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/users/reports-counts', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setReportData(response.data);
         if (response.data.personnelByDepartment?.length > 0) {
          setSelectedDepartment(response.data.personnelByDepartment[0].departmentName);
        }
        setLoading(false);
      } catch (error) {
        message.error('Failed to fetch report counts');
        setLoading(false);
      }
    };
    fetchReportCounts();
  }, []);

  // Fetch personnel status
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
          submissionStatus: data.submissionStatus || 'N/A',
          completionPercentage: data.completionPercentage || 0,
          serviceDays: data.serviceDays || 0,
          uploadRejected: data.uploadRejected,
          uploadRejectionReason: data.uploadRejectionReason,
          verificationRejected: data.verificationRejected,
          verificationRejectionReason: data.verificationRejectionReason,
        });
      } catch (err) {
        setError('Unable to load personnel status');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonnelStatus();
  }, [userId]);

  const handleReplaceLetter = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
    formData.append('postingAppointmentLetter', file, 'postingAppointmentLetter.pdf');
    try {
      const response = await fetch('http://localhost:3000/users/replace-posting-appointment-letter', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload the letter');
      }
      message.success('Posting and appointment letter submitted again');
      setStatusData((prev) => prev ? { ...prev, uploadRejected: false, uploadRejectionReason: null, submissionStatus: 'PENDING' } : prev);
    } catch (err: any) {
      message.error(err.message || 'Failed to upload the letter');
    }
  };

  // Role-based dashboard content
  const renderDashboardContent = () => {
    if (role === 'ADMIN' || role === 'STAFF') {
      const dashboardTitle = role === 'ADMIN' ? 'Admin Dashboard' : 'Assistant Admin Dashboard';
      
       // Define card data based on role
    const cardData = role === 'ADMIN'
      ? [
          {
            title: 'Personnel',
            value: reportData?.totalPersonnel || 0,
            icon: '/admin-hero-1.svg',
            gradient: 'bg-gradient-to-r from-[#8B5523] to-[#5B3418]',
            route: '/manage-personnel',
          },
          {
            title: 'Staff',
            value: reportData?.totalNonPersonnel || 0,
            icon: '/admin-hero-2.svg',
            gradient: 'bg-gradient-to-r from-[#C3C3C3] to-[#5E5E5E]',
            route: '/staff-management',
          },
          {
            title: 'Endorse',
            value: reportData?.statusCounts.pendingEndorsement || 0,
            icon: '/admin-hero-3.svg',
            gradient: 'bg-gradient-to-r from-[#CC6F22] to-[#940000]',
            route: '/endorsement',
          },
          {
            title: 'Departments',
            value: reportData?.totalDepartments || 0,
            icon: '/admin-hero-4.svg',
            gradient: 'bg-gradient-to-r from-[#684A31] to-[#261700]',
            route: '/dept-placements',
          },
        ]
      : [
          {
            title: 'Onboarded',
            value: reportData?.onboardedStudentCount || 0,
            icon: '/admin-hero-1.svg',
            gradient: 'bg-gradient-to-r from-[#8B5523] to-[#5B3418]',
            route: '/onboarded',
          },
          {
            title: 'Personnel',
            value: reportData?.totalPersonnel || 0,
            icon: '/admin-hero-2.svg',
            gradient: 'bg-gradient-to-r from-[#C3C3C3] to-[#5E5E5E]',
            route: '/shortlist',
          },
          {
            title: 'Manage',
            value: reportData?.acceptedCount || 0,
            icon: '/admin-hero-3.svg',
            gradient: 'bg-gradient-to-r from-[#CC6F22] to-[#940000]',
            route: '/manage-personnel',
          },
          {
            title: 'Departments',
            value: reportData?.totalDepartments || 0,
            icon: '/admin-hero-4.svg',
            gradient: 'bg-gradient-to-r from-[#684A31] to-[#261700]',
            route: '/dept-placements',
          },
        ];

      return (
        <>
         {/* Section 1: Admin/Assistant Admin Dashboard Cards */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-md sm:text-xl lg:text-2xl font-bold text-[#3C3939] mb-4">
            {dashboardTitle}
          </h2>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-4">
            {cardData.map((card, index) => (
              <div
                key={index}
                className={`w-full min-h-[120px] sm:min-h-[140px] p-4 sm:p-6 rounded-md shadow ${card.gradient} cursor-pointer active:scale-95`}
                onClick={() => navigate(card.route)}
              >
                <div className="flex justify-between items-start h-full">
                  <div className="flex flex-col justify-between">
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-9 h-9 sm:w-11 sm:h-11 object-contain mb-6"
                    />
                    <h4 className="text-base sm:text-md font-semibold text-white">
                      {card.title}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-sm sm:text-base text-white">Total</p>
                    <p className="text-2xl sm:text-4xl font-bold text-white">
                      {loading ? '...' : card.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

         {/* Section 2: System Overview with Large Card and 2x2 Grid */}
        <section className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#3C3939] mb-4">
            System Overview
          </h3>
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Large Card for Personnel by Department */}
            <div className="w-full lg:w-[460px] min-h-[220px] sm:min-h-[300px] bg-gradient-to-br from-[#6B4F3A] to-[#3F2D1F] p-4 sm:p-6 rounded-lg shadow-lg flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">
                  Personnel by Department
                </h4>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <Select
                    value={selectedDepartment}
                    onChange={setSelectedDepartment}
                    className="w-full sm:max-w-[220px]"
                    placeholder="Select Department"
                    loading={loading}
                    style={{ borderRadius: '8px' }}
                  >
                    {reportData?.personnelByDepartment?.map((dept) => (
                      <Option key={dept.departmentId} value={dept.departmentName}>
                        {dept.departmentName}
                      </Option>
                    ))}
                  </Select>
                  <p className="text-6xl sm:text-8xl font-bold text-white leading-none">
                    {loading
                      ? '...'
                      : reportData?.personnelByDepartment.find(
                          (dept) => dept.departmentName === selectedDepartment
                        )?.personnelCount || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* 2x2 Grid of Smaller Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full lg:w-[460px]">
              {[
                {
                  title: 'Pending Selection',
                  value: reportData?.pendingCount || 0,
                },
                {
                  title: 'Total Selections',
                  value: reportData?.statusCounts.pendingEndorsement || 0,
                },
                {
                  title: 'Total Endorsed',
                  value: reportData?.acceptedCount || 0,
                },
                {
                  title: 'Unapproved Submissions',
                  value: reportData?.statusCounts.rejected || 0,
                },
              ].map((card, index) => (
                <div
                  key={index}
                  className="w-full min-h-[120px] bg-white p-4 sm:p-5 rounded-lg shadow"
                >
                  <h4 className="text-base sm:text-lg font-semibold text-[#625E5C] mb-2">
                    {card.title}
                  </h4>
                  <p className="text-xl sm:text-2xl font-bold text-[#5B3418]">
                    {loading ? '...' : card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* Section 3: Recent Activity with Notifications */}
      <Notifications displayMode="homepage" maxDisplay={3} />
        </>
      );
    }

    // Personnel dashboard
    return (
      <>
        {/* Section 1: Horizontal Card */}
        <section className="mb-6 sm:mb-8">
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between p-6 sm:p-8 rounded-lg shadow-lg bg-gradient-to-r from-[#5b3418] to-[#754726] text-white overflow-hidden">
            <div className="flex-1 mb-4 sm:mb-0 sm:pr-6 z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2">
                Welcome, {authLoading ? 'Loading...' : name || ''}
              </h2>
              <p className="text-sm sm:text-base">
              {isLoading ? (
                'Loading status...'
              ) : statusData?.submissionStatus === 'VALIDATED' || statusData?.submissionStatus === 'COMPLETED' ? (
                'Your verification is complete! Enjoy your National Service and make the most of this exciting journey.'
              ) : (
                'Your service period has not yet started. Here is your dashboard overview.'
              )}
            </p>
            </div>
            <div className="absolute top-0 right-0 bottom-0">
              <img
                src="/ghana-flag.svg"
                alt="Ghana Flag"
                className="h-full w-auto object-cover object-right"
              />
            </div>
          </div>
        </section>

        {statusData?.uploadRejected && (
          <Alert
            className="mb-6"
            type="warning"
            showIcon
            message="Your posting and appointment letter was not accepted"
            description={
              <div>
                <p className="mb-2">{statusData.uploadRejectionReason}</p>
                <p className="mb-2">Upload the correct PDF. It must be 10MB or smaller.</p>
                <input type="file" accept="application/pdf,.pdf" onChange={handleReplaceLetter} />
              </div>
            }
          />
        )}
        {statusData?.verificationRejected && (
          <Alert
            className="mb-6"
            type="warning"
            showIcon
            message="Your verification form was not accepted"
            description={statusData.verificationRejectionReason || 'Upload the correct PDF from Upload Verification in the menu.'}
          />
        )}

        {/* Section 2: Analytics */}
      <section className="mb-6 sm:mb-8">
        <Title level={4} style={{ color: '#3C3939', marginBottom: 16 }}>
          Analytics of the Overall Progress
        </Title>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Status Card */}
          <Card
            className="flex-1"
            bodyStyle={{ padding: '16px 24px' }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <div className="flex justify-between items-center">
              <div>
                <Title level={5} style={{ color: '#625E5C', marginBottom: 8 }}>
                  Status
                </Title>
                <Text
                  style={{
                    color: '#a59f9f',
                    fontSize: '14px',
                    textTransform: 'capitalize',
                  }}
                >
                  {isLoading ? <Spin size="small" /> : statusData?.submissionStatus || 'N/A'}
                </Text>
              </div>
              <ClockCircleOutlined
                style={{ fontSize: '24px', color: '#5B3418' }}
              />
            </div>
          </Card>

          {/* Process Completion Card */}
          <Card
            className="flex-1"
            bodyStyle={{ padding: '16px 24px' }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <Title level={5} style={{ color: '#625E5C', marginBottom: 8 }}>
              Process Completion
            </Title>
            <Progress
              percent={isLoading ? 0 : statusData?.completionPercentage || 0}
              status="active"
              strokeColor="#5B3418"
              showInfo={true}
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Service Days Card */}
          <Card
            className="flex-1"
            bodyStyle={{ padding: '16px 24px' }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <Title level={5} style={{ color: '#625E5C', marginBottom: 8 }}>
              Service Days
            </Title>
            <Text
              strong
              style={{ fontSize: '24px', color: '#5B3418', display: 'block' }}
            >
              {isLoading ? <Spin size="small" /> : statusData?.serviceDays || 0}
            </Text>
            <Text style={{ fontSize: '14px', color: '#5B3418' }}>
              completed
            </Text>
          </Card>
        </div>
      </section>

        {/* Section 3: Notifications */}
        <Notifications displayMode="full" maxDisplay={3} />
      </>
    );
  };

  return (
    <div className="bg-[#FCEEE9] min-w-0">
      {renderDashboardContent()}
    </div>
  );
};

export default Home;