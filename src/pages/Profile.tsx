import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Upload, Button, message, Row, Col, Descriptions, Avatar, Input } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';
import type { UploadFile, UploadProps } from 'antd';
import './Profile.css'

const { Title, Text } = Typography;

interface UserProfile {
  name: string;
  email: string;
  role: string;
  nssNumber?: string | null;
  staffId?: string | null;
}

const Profile: React.FC = () => {
  const { role, userId } = useAuth();
  const [signatureLoading, setSignatureLoading] = useState(false);
const [templateLoading, setTemplateLoading] = useState(false);
const [profileLoading, setProfileLoading] = useState(true);
const [profile, setProfile] = useState<UserProfile | null>(null);
const [form] = Form.useForm();
const [templateForm] = Form.useForm(); // Separate form for template
const [appointmentForm] = Form.useForm();
const [signatureFile, setSignatureFile] = useState<UploadFile | null>(null);
const [appointmentSignatureFile, setAppointmentSignatureFile] = useState<UploadFile | null>(null);
const [stampFile, setStampFile] = useState<UploadFile | null>(null);
const [templateFile, setTemplateFile] = useState<UploadFile | null>(null);
const [templateName, setTemplateName] = useState<string>('');

  //reload on page mount
   useEffect(() => {
      const hasReloaded = sessionStorage.getItem("reloaded");
  
      if (!hasReloaded) {
        sessionStorage.setItem("reloaded", "true");
        window.location.reload();
      }
    }, []);

useEffect(() => {
  const fetchProfile = async () => {
    if (!userId) {
      console.error('No userId provided');
      message.error('User ID is missing. Please log in again.');
      setProfileLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Authentication token missing. Please log in.');
      setProfileLoading(false);
      return;
    }

    try {
      setProfileLoading(true);
      const response = await axios.get('http://localhost:3000/users/profile', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Response status:', response.status);
      console.log('Profile data:', response.data);
      if (response.status >= 200 && response.status < 300) {
        const { name, email, role, nssNumber, staffId } = response.data;
        setProfile({ name, email, role, nssNumber, staffId });
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      message.error(error.response?.data?.message || 'Oops! We couldn’t load your profile. Please refresh the page.');
    } finally {
      setProfileLoading(false);
    }
  };

  fetchProfile();
}, [userId]);

  // Handle file changes for signature
  const handleSignatureChange: UploadProps['onChange'] = ({ file, fileList }) => {
    if (file.status === 'removed' || fileList.length === 0) {
      setSignatureFile(null);
      return;
    }
    setSignatureFile(fileList[fileList.length - 1]);
  };

  // Handle file changes for stamp
  const handleStampChange: UploadProps['onChange'] = ({ file, fileList }) => {
    if (file.status === 'removed' || fileList.length === 0) {
      setStampFile(null);
      return;
    }
    setStampFile(fileList[fileList.length - 1]);
  };

  // Handle file changes for template
  const handleTemplateChange: UploadProps['onChange'] = ({ file }) => {
    if (file.status === 'done' || file.status === 'uploading') {
      setTemplateFile(file);
    } else if (file.status === 'error') {
      console.error('Template upload error:', file.error);
      message.error('Failed to process template file.');
    }
  };


  // Handle form submission
  const handleUpload = async () => {
    if (!signatureFile || !stampFile) {
      message.error('Please upload both a signature and a stamp.');
      return;
    }

    if (!signatureFile.originFileObj || !stampFile.originFileObj) {
      message.error('Invalid file selection. Please re-upload signature and stamp.');
      return;
    }

    if (!(signatureFile.originFileObj instanceof File) || !(stampFile.originFileObj instanceof File)) {
      message.error('Invalid file format. Please upload valid PNG or JPEG files.');
      return;
    }

    const formData = new FormData();
    try {
      formData.append('files', signatureFile.originFileObj, `signature-${signatureFile.name}`);
      formData.append('files', stampFile.originFileObj, `stamp-${stampFile.name}`);
    } catch (error) {
      console.error('Error creating FormData:', error);
      message.error('Failed to prepare files for upload.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Please log in to upload files.');
      return;
    }

    setSignatureLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/users/upload-signage',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      message.success(response.data.message || 'Signature and stamp uploaded successfully.');
      form.resetFields();
      setSignatureFile(null);
      setStampFile(null);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to upload files. Please try again.';
      message.error(errorMessage);
    } finally {
      setSignatureLoading(false);
    }
  };

  const handleStaffSignatureUpload = async () => {
    if (!signatureFile?.originFileObj || !(signatureFile.originFileObj instanceof File)) {
      message.error('Please upload a signature.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Please log in to upload files.');
      return;
    }

    const formData = new FormData();
    formData.append('signature', signatureFile.originFileObj, signatureFile.name);

    setSignatureLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/users/upload-appointment-signature',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      message.success(response.data.message || 'Appointment letter signature saved');
      toast.success(response.data.message || 'Appointment letter signature saved');
      form.resetFields();
      setSignatureFile(null);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to upload signature. Please try again.';
      message.error(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSignatureLoading(false);
    }
  };

  const handleAppointmentSignatureUpload = async () => {
    if (!appointmentSignatureFile?.originFileObj || !(appointmentSignatureFile.originFileObj instanceof File)) {
      message.error('Please upload the appointment letter signature.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Please log in to upload files.');
      return;
    }

    const formData = new FormData();
    formData.append('signature', appointmentSignatureFile.originFileObj, appointmentSignatureFile.name);

    setSignatureLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/users/upload-appointment-signature',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      message.success(response.data.message || 'Appointment letter signature saved');
      toast.success(response.data.message || 'Appointment letter signature saved');
      appointmentForm.resetFields();
      setAppointmentSignatureFile(null);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to upload signature. Please try again.';
      message.error(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSignatureLoading(false);
    }
  };

const handleTemplateUpload = async () => {
  if (!templateFile) {
    message.error('Please upload a template file.');
    return;
  }

  if (!templateFile.originFileObj) {
    message.error('Invalid file selection. Please re-upload the template.');
    return;
  }

  if (!(templateFile.originFileObj instanceof File)) {
    message.error('Invalid file format. Please upload a valid PDF or Word file.');
    return;
  }

  const formData = new FormData();
  try {
    formData.append('template', templateFile.originFileObj);
    formData.append('name', templateName || 'Job Confirmation Letter Template');
  } catch (error) {
    console.error('Error creating FormData for template:', error);
    message.error('Failed to prepare template for upload.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    message.error('Please log in to upload the template.');
    return;
  }

  setTemplateLoading(true);
  try {
    const response = await axios.post(
      'http://localhost:3000/documents/upload-template',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    message.success(response.data.message || 'Template uploaded successfully.');
    templateForm.resetFields(['template', 'templateName']);
    setTemplateFile(null);
    setTemplateName('');
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to upload template. Please try again.';
    message.error(errorMessage);
  } finally {
    setTemplateLoading(false);
  }
};

  const uploadProps: UploadProps = {
    accept: 'image/png,image/jpeg',
    beforeUpload: (file: File): boolean => {
      const isValidType = ['image/png', 'image/jpeg'].includes(file.type);
      const isValidSize = file.size <= 2 * 1024 * 1024;
      if (!isValidType) {
        message.error('Only PNG or JPEG files are allowed!');
        return Upload.LIST_IGNORE;
      }
      if (!isValidSize) {
        message.error('File must be smaller than 2MB!');
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    maxCount: 1,
    customRequest: ({ onSuccess }) => {
      onSuccess?.('ok');
    },
  };

  const templateUploadProps: UploadProps = {
  accept: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  beforeUpload: (file: File): boolean => {
    const isValidType = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type);
    const isValidSize = file.size <= 10 * 1024 * 1024;
    if (!isValidType) {
      message.error('Only PDF or Word files are allowed!');
      return false;
    }
    if (!isValidSize) {
      message.error('File must be smaller than 10MB!');
      return false;
    }
    return true;
  },
  maxCount: 1,
  customRequest: ({ onSuccess }) => {
    onSuccess?.('ok');
  },
};

  return (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8">
    <Row justify="center" gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card
          className="rounded-lg shadow-md bg-white bg-cover bg-center bg-no-repeat bg-opacity-10 border-none"
          bodyStyle={{ padding: '32px', minHeight: '220px' }}
          title={
            <div className="flex items-center gap-3 py-2">
              <Avatar size={48} icon={<UserOutlined />} className="bg-[#1890FF]" />
              <Title level={3} className="text-[#1F1F1F] m-0">
                User Profile
              </Title>
            </div>
          }
        >
          {profileLoading ? (
            <Text>Loading profile...</Text>
          ) : profile && Object.keys(profile).length > 0 ? (
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              layout="vertical"
              labelStyle={{ fontWeight: 500, color: '#595959' }}
              contentStyle={{ color: '#1F1F1F' }}
              className="mb-6"
            >
              <Descriptions.Item label="Name">{profile.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
              <Descriptions.Item label="Role">{profile.role}</Descriptions.Item>
              {profile.role === 'PERSONNEL' ? (
                <Descriptions.Item label="NSS Number">{profile.nssNumber || ''}</Descriptions.Item>
              ) : (
                <Descriptions.Item label="Staff ID">{profile.staffId || ''}</Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Text>Oops! We couldn’t load your profile. Please refresh the page.</Text>
          )}
        </Card>
      </Col>
      {role === 'ADMIN' && (
        <>
          <Col xs={24} lg={16}>
            <Card
              className="rounded-lg shadow-md bg-white bg-cover bg-center bg-no-repeat bg-opacity-10 border-none"
              bodyStyle={{ padding: '32px', minHeight: '250px' }}
              title={
                <Title level={4} className="text-[#3C3939]">
                  Upload Signature & Stamp
                </Title>
              }
            >
              <Text type="secondary" className="block mb-4">
                This signature and stamp are placed on the posting letter when you endorse it. They are not printed on the appointment letter.
              </Text>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleUpload}
                className="space-y-4"
              >
                <Form.Item
                  name="signature"
                  label={
                    <>
                      <Text strong>Signature (PNG/JPEG, Max 2MB)</Text>
                      <Text type="secondary" className="block">
                        File name should include "signature" (e.g., signature.png)
                      </Text>
                    </>
                  }
                  rules={[{ required: true, message: 'Please upload a signature!' }]}
                  valuePropName="fileList"
                  getValueFromEvent={(event) => event?.fileList}
                >
                  <Upload
                    {...uploadProps}
                    listType="picture"
                    name="signature"
                    onChange={handleSignatureChange}
                  >
                    <Button
                      className="!bg-[#696867] hover:!bg-[#4e4e4d] text-white border-none"
                      icon={<UploadOutlined />}
                    >
                      Upload Signature
                    </Button>
                  </Upload>
                </Form.Item>
                <Form.Item
                  name="stamp"
                  label={
                    <>
                      <Text strong>Stamp (PNG/JPEG, Max 2MB)</Text>
                      <Text type="secondary" className="block">
                        File name should include "stamp" (e.g., stamp.png)
                      </Text>
                    </>
                  }
                  rules={[{ required: true, message: 'Please upload a stamp!' }]}
                  valuePropName="fileList"
                  getValueFromEvent={(event) => event?.fileList}
                >
                  <Upload
                    {...uploadProps}
                    listType="picture"
                    name="stamp"
                    onChange={handleStampChange}
                  >
                    <Button
                      className="!bg-[#696867] hover:!bg-[#4e4e4d] text-white border-none"
                      icon={<UploadOutlined />}
                    >
                      Upload Stamp
                    </Button>
                  </Upload>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={signatureLoading}
                    className="!bg-[#775237] hover:!bg-[#754726] border-none"
                  >
                    Submit
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card
              className="rounded-lg shadow-md bg-white border-none"
              bodyStyle={{ padding: '32px', minHeight: '250px' }}
              title={
                <Title level={4} className="text-[#3C3939]">
                  Appointment Letter Signature
                </Title>
              }
            >
              <Text type="secondary" className="block mb-4">
                Upload the signature that is printed under “Yours sincerely” on the appointment letter. This is a different image from the signature used to endorse posting letters.
              </Text>
              <Form form={appointmentForm} layout="vertical" onFinish={handleAppointmentSignatureUpload} className="space-y-4">
                <Form.Item
                  name="appointmentSignature"
                  label={<Text strong>Signature (PNG/JPEG, Max 2MB)</Text>}
                  rules={[{ required: true, message: 'Please upload the appointment letter signature!' }]}
                  valuePropName="fileList"
                  getValueFromEvent={(event) => event?.fileList}
                >
                  <Upload
                    {...uploadProps}
                    listType="picture"
                    maxCount={1}
                    onChange={({ file, fileList }) => {
                      if (file.status === 'removed' || fileList.length === 0) {
                        setAppointmentSignatureFile(null);
                        return;
                      }
                      setAppointmentSignatureFile(fileList[fileList.length - 1]);
                    }}
                  >
                    <Button
                      className="!bg-[#696867] hover:!bg-[#4e4e4d] text-white border-none"
                      icon={<UploadOutlined />}
                    >
                      Upload Signature
                    </Button>
                  </Upload>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={signatureLoading}
                    className="!bg-[#775237] hover:!bg-[#754726] border-none"
                  >
                    Submit
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card
              className="rounded-lg shadow-md bg-white bg-cover bg-center bg-no-repeat bg-opacity-10 border-none"
              bodyStyle={{ padding: '32px', minHeight: '250px' }}
              title={
                <Title level={4} className="text-[#3C3939]">
                  Upload Letter Template
                </Title>
              }
            >
              <Form
                form={templateForm}
                layout="vertical"
                onFinish={handleTemplateUpload}
                className="space-y-4"
              >
                <Form.Item
                  name="templateName"
                  label={<Text strong>Template Name (Optional)</Text>}
                >
                  <Input
                    placeholder="Enter template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </Form.Item>
                <Form.Item
                  name="template"
                  label={
                    <>
                      <Text strong>Template File (PDF/Word, Max 10MB)</Text>
                      <Text type="secondary" className="block">
                        File should be a PDF or Word document
                      </Text>
                    </>
                  }
                  rules={[{ required: true, message: 'Please upload a template file!' }]}
                >
                  <Upload
                    {...templateUploadProps}
                    listType="text"
                    name="template"
                    onChange={handleTemplateChange}
                    fileList={templateFile ? [templateFile] : []}
                  >
                    <Button
                      className="!bg-[#696867] hover:!bg-[#4e4e4d] text-white border-none"
                      icon={<UploadOutlined />}
                    >
                      Upload Template
                    </Button>
                  </Upload>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={templateLoading}
                    className="!bg-[#775237] hover:!bg-[#754726] border-none"
                  >
                    Submit Template
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </>
      )}
      {role === 'STAFF' && (
        <Col xs={24} lg={16}>
          <Card
            className="rounded-lg shadow-md bg-white border-none"
            bodyStyle={{ padding: '32px', minHeight: '250px' }}
            title={
              <Title level={4} className="text-[#3C3939]">
                Upload Signature
              </Title>
            }
          >
            <Text type="secondary" className="block mb-4">
              This signature is printed on the appointment letter when you validate a personnel. It is separate from the signature an admin uses to endorse a posting letter. If you leave it empty, validation uses the appointment signature uploaded on the admin profile.
            </Text>
            <Form form={form} layout="vertical" onFinish={handleStaffSignatureUpload} className="space-y-4">
              <Form.Item
                name="signature"
                label={<Text strong>Signature (PNG/JPEG, Max 2MB)</Text>}
                rules={[{ required: true, message: 'Please upload a signature!' }]}
                valuePropName="fileList"
                getValueFromEvent={(event) => event?.fileList}
              >
                <Upload
                  {...uploadProps}
                  listType="picture"
                  maxCount={1}
                  onChange={handleSignatureChange}
                >
                  <Button
                    className="!bg-[#696867] hover:!bg-[#4e4e4d] text-white border-none"
                    icon={<UploadOutlined />}
                  >
                    Upload Signature
                  </Button>
                </Upload>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={signatureLoading}
                  className="!bg-[#775237] hover:!bg-[#754726] border-none"
                >
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      )}
    </Row>
  </div>
);
};

export default Profile;