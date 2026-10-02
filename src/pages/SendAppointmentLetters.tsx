import React, { useState, useEffect } from 'react';
import { Table, Select, Input, Button, Typography, Space, Modal, Tooltip, Checkbox } from 'antd';
import { SearchOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '../AuthContext';
import '../components/PersonnelSelection.css';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const getAbsoluteUrl = (url: string) => (url && url.startsWith('http') ? url : `${apiBase}${url || ''}`);

const { Option } = Select;
const { Text } = Typography;

interface Submission {
  id: number;
  fullName: string;
  nssNumber: string;
  gender: string;
  email: string;
  placeOfResidence: string;
  phoneNumber: string;
  universityAttended: string;
  regionOfSchool: string;
  yearOfNSS: string;
  divisionPostedTo: string;
  postingLetterUrl: string;
  appointmentLetterUrl: string;
  verificationFormUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  programStudied: string;
}

const Endorsement: React.FC = () => {
  const { role } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ENDORSED');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{ url: string; type: string; id?: number } | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [shortlistModalVisible, setShortlistModalVisible] = useState(false);
  const [validatedCount, setValidatedCount] = useState<number>(0);
  const [rejectUploadVisible, setRejectUploadVisible] = useState(false);
  const [rejectUploadReason, setRejectUploadReason] = useState('');
  const [rejectUploadId, setRejectUploadId] = useState<number | null>(null);

  useEffect(() => {
    const fetchValidatedCount = async () => {
      try {
        const response = await fetch('http://localhost:3000/users/submission-status-counts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            statuses: ['VALIDATED', 'COMPLETED'],
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setValidatedCount((data.VALIDATED || 0) + (data.COMPLETED || 0));
        } else {
          toast.error(data.message || 'Failed to load validated count');
        }
      } catch (error) {
        toast.error('Failed to load validated count');
      }
    };
   if (role && ['ADMIN', 'STAFF'].includes(role)) {
    fetchValidatedCount();
    }
  }, [role]);

  // Fetch submissions
  useEffect(() => {
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/users/submissions', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data: Submission[] = await response.json();
      if (response.ok) {
        // Filter for ENDORSED, VALIDATED, and COMPLETED status
        const filteredSubmissions = data.filter((s) => ['ENDORSED', 'VALIDATED', 'COMPLETED'].includes(s.status));
        setSubmissions(filteredSubmissions);
        setFilteredSubmissions(statusFilter === 'All' 
          ? filteredSubmissions 
          : filteredSubmissions.filter((s) => 
              statusFilter === 'VALIDATED' 
                ? ['VALIDATED', 'COMPLETED'].includes(s.status)
                : s.status === statusFilter
            ));
      } else {
        toast.error((data as any).message || 'Failed to load submissions');
      }
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };
  fetchSubmissions();
}, []);

  useEffect(() => {
  let filtered = submissions;
  if (statusFilter !== 'All') {
    filtered = filtered.filter((s) => 
      statusFilter === 'VALIDATED' 
        ? ['VALIDATED', 'COMPLETED'].includes(s.status)
        : s.status === statusFilter
    );
  }
  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.fullName.toLowerCase().includes(lowerSearch) ||
        s.nssNumber.toLowerCase().includes(lowerSearch) ||
        s.email.toLowerCase().includes(lowerSearch) ||
        s.universityAttended.toLowerCase().includes(lowerSearch),
    );
  }
  setFilteredSubmissions(filtered);
  setSelectedRows([]);
}, [statusFilter, searchTerm, submissions]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedRows.length === filteredSubmissions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredSubmissions.map((s) => s.id));
    }
  };

  const handleRowSelect = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = (selectedRows.length > 0
      ? filteredSubmissions.filter((s) => selectedRows.includes(s.id))
      : filteredSubmissions
    ).map((s) => ({
      ID: s.id,
      'Full Name': s.fullName,
      'NSS Number': s.nssNumber,
      Email: s.email,
      Gender: s.gender,
      'Place of Residence': s.placeOfResidence,
      'Phone Number': s.phoneNumber,
      'University Attended': s.universityAttended,
      'Region of School': s.regionOfSchool,
      'Year of NSS': s.yearOfNSS,
      'Program Studied': s.programStudied,
      'Division Posted To': s.divisionPostedTo,
      'Posting & Appointment Letter URL': s.appointmentLetterUrl || s.postingLetterUrl,
      Status: s.status,
      'Created At': s.createdAt,
      'Updated At': s.updatedAt,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'personnel_submissions.xlsx');
  };

  // Handle letter view
  const showLetter = (url: string, type: string, id?: number) => {
     console.log('Showing letter:', { url, type, id });
    setModalContent({ url, type, id });
    setModalVisible(true);
  };

  // Handle download
  const handleDownload = () => {
    if (modalContent?.url) {
      const fileUrl = getAbsoluteUrl(modalContent.url);
      window.open(fileUrl, '_blank');
    }
  };

  const handleRejectVerification = async () => {
    if (!rejectUploadId) return;
    if (rejectUploadReason.trim().length < 5) {
      toast.error('Enter a reason of at least 5 characters');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/users/reject-upload/${rejectUploadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ target: 'verification', reason: rejectUploadReason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject upload');
      }
      toast.success('Verification form rejected. The personnel has been emailed.');
      setRejectUploadVisible(false);
      setRejectUploadReason('');
      setModalVisible(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject upload');
    } finally {
      setLoading(false);
    }
  };

  // Handle validate action
 const handleValidate = async () => {
  if (!modalContent?.id) return;
   console.log('Validating submission:', modalContent.id);
  setLoading(true);
  try {
    const response = await fetch(`http://localhost:3000/users/update-submission-status/${modalContent.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
       status: 'VALIDATED',
      }),
    });
    if (response.ok) {
      // Update local state
      setSubmissions((prev) => prev.filter((s) => s.id !== modalContent.id));
        setFilteredSubmissions((prev) => prev.filter((s) => s.id !== modalContent.id));
        setModalVisible(false);
        setValidatedCount((prev) => prev + 1);
        toast.success('Appointment letter validated successfully');
        window.location.reload();
    } else {
      const errorData = await response.json();
      toast.error(errorData.message || 'Failed to validate appointment letter');
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to validate appointment letter');
  } finally {
    setLoading(false);
  }
};

  const handleShortlistConfirm = async () => {
  setLoading(true);
  try {
    const updatePromises = selectedRows.map(async (id) => {
      const response = await fetch(`http://localhost:3000/users/update-submission-status/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
         status: 'VALIDATED',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to validate appointment letter');
      }
    });

    await Promise.all(updatePromises);

    // Update local state
    setSubmissions((prev) => prev.filter((s) => !selectedRows.includes(s.id)));
      setFilteredSubmissions((prev) => prev.filter((s) => !selectedRows.includes(s.id)));
      setValidatedCount((prev) => prev + selectedRows.length);
      setSelectedRows([]);
      setShortlistModalVisible(false);
      toast.success(`${selectedRows.length} verification forms validated`);
      window.location.reload();
  } catch (error: any) {
    toast.error(error.message || 'Failed to validate verification forms');
  } finally {
    setLoading(false);
  }
};

  if (!role || (role !== 'ADMIN' && role !== 'STAFF')) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-lg text-[#3C3939]">Access restricted.</Text>
      </div>
    );
  }

  const truncateText = (text: string, maxLength: number = 15) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  // Table columns
  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedRows.length === filteredSubmissions.length && filteredSubmissions.length > 0}
          indeterminate={selectedRows.length > 0 && selectedRows.length < filteredSubmissions.length}
          onChange={handleSelectAll}
          disabled={statusFilter === 'VALIDATED'}
        />
      ),
      key: 'selection',
      width: 10,
      render: (_: any, record: Submission) => (
         <Checkbox
          checked={selectedRows.includes(record.id)}
          onChange={() => handleRowSelect(record.id)}
          disabled={statusFilter === 'VALIDATED'}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'NSS No.',
      dataIndex: 'nssNumber',
      key: 'nssNumber',
      width: 100,
      ellipsis: true,
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 110,
      ellipsis: true,
    },
    {
      title: 'Division',
      dataIndex: 'divisionPostedTo',
      key: 'divisionPostedTo',
      width: 130,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{truncateText(text)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      ellipsis: true,
      render: (status: string) => (
        <span className={`status-${status.toLowerCase()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      title: 'Verif. Forms',
      key: 'verificationFormUrl',
      width: 110,
      ellipsis: true,
      render: (_: any, record: Submission) =>
        record.verificationFormUrl ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                showLetter(record.verificationFormUrl, 'Verification Form', record.id);
              }}
              icon={<EyeOutlined style={{ fontSize: '16px', color: '#5B3418' }} />}
            />
          </div>
        ) : (
          ''
        ),
    },
    {
      title: 'Posting & Appt. Letter',
      key: 'appointmentLetterUrl',
      width: 110,
      ellipsis: true,
      render: (_: any, record: Submission) =>
        record.appointmentLetterUrl ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                showLetter(record.appointmentLetterUrl || record.postingLetterUrl, 'Posting & Appointment Letter', record.id);
              }}
              icon={<EyeOutlined style={{ fontSize: '16px', color: '#5B3418' }} />}
            />
          </div>
        ) : (
          ''
        ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen px-2 py-4">
      <div className="w-full max-w-full mx-auto">
        <h2 className="text-xl font-bold text-[#3C3939] mb-4 text-center">Validate & Send Appt. Letters</h2>
        <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
          <Space>
            <Text className="text-base font-semibold text-[#5B3418] bg-amber-100 px-3 py-1 rounded-md">
              Total Validated: {validatedCount}
            </Text>
            {selectedRows.length > 0 && statusFilter !== 'VALIDATED' && (
              <Space>
                <Text>{`${selectedRows.length} selected`}</Text>
                <Button
                  type="primary"
                  onClick={() => setShortlistModalVisible(true)}
                  className="!bg-[#5B3418] hover:!bg-[#4a2c1c] !border-0"
                >
                  Validate
                </Button>
              </Space>
            )}
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="rounded-md w-fit sm:w-48"
              placeholder="Filter by status"
            >
              <Option value="ENDORSED">Endorsed</Option>
              <Option value="VALIDATED">Validated</Option>
              {/* <Option value="All">All</Option> */}
            </Select>
          </Space>
          <Space className="w-full sm:w-auto">
            <Input
              placeholder="Search by name, NSS, email, or university"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              className="rounded-md border-[#a9a7a7] w-full sm:w-auto"
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportToExcel}
              className="export-button !border-amber-50 w-full sm:w-auto"
            >
              Export
            </Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredSubmissions}
          rowKey="id"
          loading={loading}
          className="rounded-md"
          scroll={{ x: 'max-content' }}
          size="large"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (event) => {
              if (!(event.target as HTMLElement).closest('.ant-btn, .ant-checkbox') && statusFilter !== 'VALIDATED') {
                handleRowSelect(record.id);
              }
            },
          })}
        />
        <Modal
          title={modalContent?.type}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button
              key="download"
              className="!bg-[#5B3418] !border-0"
              type="default"
              onClick={handleDownload}
            >
              Download
            </Button>,
            modalContent?.type === 'Verification Form' && statusFilter !== 'VALIDATED' && (
              <Button
                key="validate"
                className="!bg-[#34515c] hover:!bg-[#2c3e50] !border-0"
                type="primary"
                onClick={handleValidate}
                loading={loading}
              >
                Validate
              </Button>
            ),
            modalContent?.type === 'Verification Form' && statusFilter !== 'VALIDATED' && modalContent.id && (
              <Button
                key="reject-upload"
                className="!bg-[#8a5a2b] !border-0"
                type="primary"
                onClick={() => {
                  setRejectUploadId(modalContent.id as number);
                  setRejectUploadReason('');
                  setRejectUploadVisible(true);
                }}
              >
                Reject upload
              </Button>
            ),
            <Button
              key="close"
              className="!bg-[#696767] hover:!bg-[#5f5d5d] !border-0"
              onClick={() => setModalVisible(false)}
            >
              Close
            </Button>,
          ].filter(Boolean)}
          width={800}
          className="centered-modal"
        >
          {modalContent?.url && (
            <iframe
              src={getAbsoluteUrl(modalContent.url)}
              style={{ width: '100%', height: '80vh', border: 'none' }}
              title={modalContent.type}
            />
          )}
        </Modal>
        <Modal
        title="Confirm Validation"
        open={shortlistModalVisible}
        onOk={handleShortlistConfirm}
        onCancel={() => setShortlistModalVisible(false)}
        okText="Confirm"
        cancelText="Cancel"
        okButtonProps={{ className: '!bg-[#5B3418] !border-0' }}
        cancelButtonProps={{ className: '!bg-[#c95757] !border-0' }}
      >
        <p>
          You are about to validate <strong>{selectedRows.length}</strong> personnel and send them
          appointment letters.
        </p>
        <p>
          Please confirm that the <strong>department placements</strong> for each personnel are correct.
        </p>
        <p className="text-red-600 font-semibold">
          This action is irreversible. Are you sure you want to proceed?
        </p>
      </Modal>
      <Modal
        title="Reject this upload"
        open={rejectUploadVisible}
        onOk={handleRejectVerification}
        onCancel={() => setRejectUploadVisible(false)}
        okText="Reject and email"
        cancelText="Cancel"
        confirmLoading={loading}
        okButtonProps={{ className: '!bg-[#8a5a2b] !border-0' }}
        cancelButtonProps={{ className: '!bg-[#c95757] !border-0' }}
      >
        <p className="mb-2">The personnel will receive an email and can upload the correct verification PDF.</p>
        <Input.TextArea
          rows={4}
          value={rejectUploadReason}
          onChange={(e) => setRejectUploadReason(e.target.value)}
          placeholder="Say what is wrong with the document"
        />
      </Modal>
      </div>
    </div>
  );
};

export default Endorsement;